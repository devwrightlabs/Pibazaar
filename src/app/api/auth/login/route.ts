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

interface LoginRequestBody {
  username?: string
  password?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as LoginRequestBody
    const normalizedUsername = normalizeUsername(body.username ?? '')
    const password = body.password ?? ''

    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
    }

    const hiddenEmail = usernameToHiddenEmail(normalizedUsername)

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: hiddenEmail,
      password,
    })

    if (signInError || !signInData.session || !signInData.user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const authUserId = signInData.user.id

    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, username')
      .eq('id', authUserId)
      .maybeSingle()

    if (!existingUser) {
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
        console.error('[auth/login] Failed to create missing users row:', upsertError)
      }
    }

    const appToken = createAppToken({ userId: authUserId })

    return NextResponse.json({
      session: signInData.session,
      appToken,
      user: {
        id: authUserId,
        username: existingUser?.username ?? normalizedUsername,
      },
    })
  } catch (error) {
    console.error('[auth/login] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
