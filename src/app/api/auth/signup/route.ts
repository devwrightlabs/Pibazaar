import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  isValidUsername,
  normalizeUsername,
  usernameToHiddenEmail,
  validatePassword,
} from '@/lib/auth/usernameAuth'
import { createAppToken } from '@/lib/auth/appToken'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface SignupRequestBody {
  username?: string
  password?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SignupRequestBody
    const normalizedUsername = normalizeUsername(body.username ?? '')
    const password = body.password ?? ''

    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username must be 3-24 characters and use only lowercase letters, numbers, or underscores.' },
        { status: 400 }
      )
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const hiddenEmail = usernameToHiddenEmail(normalizedUsername)

    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (existingUsername) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 })
    }

    const { data: createdAuthUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: hiddenEmail,
      password,
      email_confirm: true,
      user_metadata: {
        platform_username: normalizedUsername,
      },
    })

    if (createUserError || !createdAuthUser.user) {
      if (createUserError?.code === 'email_exists' || createUserError?.status === 422) {
        return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 })
      }

      console.error('[auth/signup] Failed to create auth user:', createUserError)
      return NextResponse.json({ error: 'Could not create account.' }, { status: 500 })
    }

    const authUserId = createdAuthUser.user.id

    const { error: upsertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: authUserId,
          pi_uid: authUserId,
          username: normalizedUsername,
          email: hiddenEmail,
          pi_username: null,
          pi_wallet_address: null,
          wallet_address: null,
        },
        { onConflict: 'id' }
      )

    if (upsertError) {
      console.error('[auth/signup] Failed to upsert users row:', upsertError)
      return NextResponse.json({ error: 'Could not persist account profile.' }, { status: 500 })
    }

    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: hiddenEmail,
      password,
    })

    if (signInError || !signInData.session) {
      console.error('[auth/signup] Failed to sign in new user:', signInError)
      return NextResponse.json({ error: 'Account created, but sign in failed. Please log in.' }, { status: 500 })
    }

    const appToken = createAppToken({ userId: authUserId })

    return NextResponse.json({
      session: signInData.session,
      appToken,
      user: {
        id: authUserId,
        username: normalizedUsername,
      },
    })
  } catch (error) {
    console.error('[auth/signup] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
