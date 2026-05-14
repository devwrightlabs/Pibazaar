/**
 * POST /api/auth/login
 *
 * Web2 username/password login.
 *
 * Flow:
 *   1. Accept { username, password } from the client
 *   2. Derive the synthetic email: <username>@p2pbazaar.local
 *   3. Sign in via Supabase auth.signInWithPassword
 *   4. Look up the user row in public.users
 *   5. Mint a custom JWT compatible with verifyAuthToken() / RLS policies
 *   6. Return { token, user }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { rateLimit } from '@/lib/rateLimit'

const loginRateLimit = rateLimit({ windowMs: 60_000, max: 10 })

const DUMMY_DOMAIN = 'p2pbazaar.local'

export async function POST(req: NextRequest) {
  // Rate limiting: 10 login attempts per IP per minute
  const rl = loginRateLimit(req)
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

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

    if (!jwtSecret || !supabaseUrl || !supabaseAnonKey) {
      console.error('[auth/login] Missing required server environment variables')
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const sanitised = username.trim().toLowerCase()
    const syntheticEmail = `${sanitised}@${DUMMY_DOMAIN}`

    // Use a plain server-side Supabase client (anon key) to sign in
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    })

    if (signInError || !signInData.user) {
      // Return a generic error to avoid leaking whether the username exists
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    const authUser = signInData.user

    // Fetch the public user profile using the admin client so RLS doesn't block
    const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin')
    const admin = getSupabaseAdmin()

    const { data: userRow, error: fetchError } = await admin
      .from('users')
      .select('pi_uid, username, avatar_url')
      .eq('pi_uid', authUser.id)
      .single()

    if (fetchError || !userRow) {
      console.error('[auth/login] User row not found for auth ID:', authUser.id, fetchError)
      return NextResponse.json({ error: 'User profile not found. Please contact support.' }, { status: 404 })
    }

    // Mint a custom JWT compatible with verifyAuthToken() and RLS policies
    const now = Math.floor(Date.now() / 1000)
    const token = jwt.sign(
      {
        sub: authUser.id,
        pi_uid: authUser.id,
        username: userRow.username,
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
        id: authUser.id,
        pi_uid: authUser.id,
        username: userRow.username,
        avatar_url: userRow.avatar_url ?? null,
      },
    })
  } catch (err) {
    console.error('[auth/login] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
