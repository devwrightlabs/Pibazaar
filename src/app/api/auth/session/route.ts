import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import type { AuthPayload } from '@/lib/authHelper'

interface SessionRequestBody {
  accessToken?: string
  username?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SessionRequestBody
    const accessToken = body.accessToken?.trim()
    const requestedUsername = body.username?.trim()

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 })
    }

    const authUser = authData.user
    const metadataUsername =
      typeof authUser.user_metadata?.username === 'string'
        ? authUser.user_metadata.username
        : null

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('pi_uid', authUser.id)
      .maybeSingle()

    const fallbackUsername = existingUser?.username
      || requestedUsername
      || metadataUsername
      || authUser.email?.split('@')[0]
      || 'Pioneer'

    const { data: dbUser, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          pi_uid: authUser.id,
          username: fallbackUsername,
          email: authUser.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pi_uid' }
      )
      .select('id, pi_uid, username, avatar_url')
      .single()

    if (upsertError || !dbUser) {
      console.error('[auth/session] user upsert failed:', upsertError)
      return NextResponse.json({ error: 'Failed to persist user session' }, { status: 500 })
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    const issuer = process.env.SUPABASE_URL
    if (!jwtSecret || !issuer) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const now = Math.floor(Date.now() / 1000)
    const payload: Omit<AuthPayload, 'iat' | 'exp'> & { iat: number; exp: number } = {
      sub: dbUser.id,
      pi_uid: dbUser.pi_uid,
      role: 'authenticated',
      aud: 'authenticated',
      iss: issuer,
      iat: now,
      exp: now + 3600,
    }

    const token = jwt.sign(payload, jwtSecret)

    return NextResponse.json({
      token,
      user: {
        pi_uid: dbUser.pi_uid,
        username: dbUser.username ?? null,
        avatar_url: dbUser.avatar_url ?? null,
      },
    })
  } catch (error) {
    console.error('[auth/session] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
