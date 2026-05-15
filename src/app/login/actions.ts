'use server'

import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DUMMY_DOMAIN = 'p2pbazaar.local'

export interface SignupActionResult {
  success: boolean
  token?: string
  user?: {
    id: string
    pi_uid: string
    username: string
    avatar_url: null
  }
  error?: string
  postgresCode?: string
}

function validatePassword(password: string): boolean {
  return (
    password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  )
}

export async function signupWithUsernamePassword(input: {
  username: string
  password: string
}): Promise<SignupActionResult> {
  const username = input.username.trim().toLowerCase()
  const { password } = input

  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return {
      success: false,
      error: 'Username may only contain letters, numbers, underscores, and hyphens (3–30 characters).',
    }
  }

  if (!validatePassword(password)) {
    return {
      success: false,
      error: 'Password does not meet security requirements.',
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret || !supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Server configuration error.' }
  }

  const syntheticEmail = `${username}@${DUMMY_DOMAIN}`
  const supabase = await createServerSupabaseClient()

  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email: syntheticEmail,
    password,
  })

  if (signupError || !authData.user) {
    if (signupError?.message?.toLowerCase().includes('already')) {
      return { success: false, error: 'That username is already taken.' }
    }
    return { success: false, error: signupError?.message ?? 'Could not create account. Please try again.' }
  }

  if (authData.session) {
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    })
  } else {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    })

    if (signInError || !signInData.session) {
      return {
        success: false,
        error: 'Could not establish an authenticated session for profile creation.',
        postgresCode: signInError?.code,
      }
    }

    await supabase.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    })
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return {
      success: false,
      error: 'Could not establish an authenticated session for profile creation.',
    }
  }

  const rlsClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const { error: insertError } = await rlsClient
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        pi_wallet_address: null,
      })

    if (insertError) {
      console.error('[auth/signup-action] users insert error:', insertError)
      return {
        success: false,
        error: 'Could not save user profile.',
        postgresCode: insertError.code ?? undefined,
      }
    }
  } catch (error) {
    const maybeError = error as { code?: string; message?: string }
    console.error('[auth/signup-action] users insert threw:', maybeError)
    return {
      success: false,
      error: 'Could not save user profile.',
      postgresCode: maybeError.code,
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign(
    {
      sub: authData.user.id,
      pi_uid: authData.user.id,
      username,
      role: 'authenticated',
      aud: 'authenticated',
      iss: supabaseUrl,
      iat: now,
      exp: now + 3600,
    },
    jwtSecret
  )

  return {
    success: true,
    token,
    user: {
      id: authData.user.id,
      pi_uid: authData.user.id,
      username,
      avatar_url: null,
    },
  }
}
