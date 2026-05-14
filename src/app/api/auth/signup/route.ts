/**
 * POST /api/auth/signup
 *
 * Web2 username/password sign-up.
 *
 * Flow:
 *   1. Accept { username, password } from the client
 *   2. Derive a synthetic email: <username>@p2pbazaar.local
 *   3. Create the Supabase auth user (email-confirmation bypassed via admin API)
 *   4. Insert a row into public.users with pi_uid = new auth user ID
 *   5. Mint a custom JWT compatible with the existing authHelper / RLS policies
 *   6. Return { token, user }
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { rateLimit } from '@/lib/rateLimit'

const signupRateLimit = rateLimit({ windowMs: 60_000, max: 5 })

const DUMMY_DOMAIN = 'p2pbazaar.local'

export async function POST(req: NextRequest) {
  // Rate limiting: 5 sign-ups per IP per minute
  const rl = signupRateLimit(req)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  try {
    const body = await req.json() as { username?: unknown; password?: unknown }
    const { username, password } = body

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    // Reject usernames that would produce an invalid email local-part
    const sanitised = username.trim().toLowerCase()
    if (!/^[a-z0-9_-]{3,30}$/.test(sanitised)) {
      return NextResponse.json(
        { error: 'Username may only contain letters, numbers, underscores, and hyphens (3–30 characters).' },
        { status: 400 }
      )
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) {
      console.error('[auth/signup] SUPABASE_JWT_SECRET is not configured')
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const admin = getSupabaseAdmin()
    const syntheticEmail = `${sanitised}@${DUMMY_DOMAIN}`

    // Create the Supabase auth user — admin.createUser bypasses email confirmation
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    })

    if (createError || !authData.user) {
      if (createError?.message?.includes('already been registered') || createError?.message?.includes('already exists')) {
        return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
      }
      console.error('[auth/signup] createUser error:', createError)
      return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 })
    }

    const authUserId = authData.user.id

    // Insert into public.users — pi_uid is set to the Supabase auth user ID
    const { error: insertError } = await admin
      .from('users')
      .insert({
        pi_uid: authUserId,
        username: sanitised,
        email: syntheticEmail,
        is_verified: false,
      })

    if (insertError) {
      // Roll back the auth user so we don't leave orphaned records
      await admin.auth.admin.deleteUser(authUserId).catch((e: unknown) => {
        console.error('[auth/signup] Failed to rollback auth user after insert failure:', e)
      })
      console.error('[auth/signup] users insert error:', insertError)
      return NextResponse.json({ error: 'Could not save user profile. Please try again.' }, { status: 500 })
    }

    // Mint a custom JWT — compatible with verifyAuthToken() / RLS policies
    const now = Math.floor(Date.now() / 1000)
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const token = jwt.sign(
      {
        sub: authUserId,
        pi_uid: authUserId,
        username: sanitised,
        role: 'authenticated',
        aud: 'authenticated',
        iss: supabaseUrl,
        iat: now,
        exp: now + 3600,
      },
      jwtSecret
    )

    return NextResponse.json({
      token,
      user: {
        id: authUserId,
        pi_uid: authUserId,
        username: sanitised,
        avatar_url: null,
      },
    })
  } catch (err) {
    console.error('[auth/signup] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
