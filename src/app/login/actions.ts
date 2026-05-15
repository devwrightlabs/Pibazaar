'use server'

import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DUMMY_DOMAIN = 'p2pbazaar.com'

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
  const username = input.username.trim()
  const { password } = input

  if (username.length < 3 || username.length > 30) {
    return {
      success: false,
      error: 'Username must be between 3 and 30 characters.',
    }
  }

  const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (safeUsername.length < 3) {
    return {
      success: false,
      error: 'Username must include at least 3 letters or numbers.',
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

  const dummyEmail = `${safeUsername}@${DUMMY_DOMAIN}`
  const supabase = await createServerSupabaseClient()

  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email: dummyEmail,
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
      email: dummyEmail,
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
