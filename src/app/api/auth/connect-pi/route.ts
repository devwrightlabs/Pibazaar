import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/authHelper'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface PiMeResponse {
  uid: string
  username: string
}

interface ConnectPiBody {
  accessToken?: string
  wallet_address?: string
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = verifyAuthToken(req)

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRow, error } = await supabaseAdmin
    .from('users')
    .select('pi_username, pi_wallet_address')
    .eq('id', auth.sub)
    .maybeSingle()

  if (error) {
    console.error('[auth/connect-pi] Failed to read connection status:', error)
    return NextResponse.json({ error: 'Failed to load Pi wallet status.' }, { status: 500 })
  }

  const connected = Boolean(userRow?.pi_username)

  return NextResponse.json({
    connected,
    pi_username: userRow?.pi_username ?? null,
    pi_wallet_address: userRow?.pi_wallet_address ?? null,
  })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = verifyAuthToken(req)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as ConnectPiBody
    if (!body.accessToken || typeof body.accessToken !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid access token.' }, { status: 400 })
    }

    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        Authorization: `Bearer ${body.accessToken}`,
      },
    })

    if (!piResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify Pi wallet.' }, { status: 401 })
    }

    const piUser = (await piResponse.json()) as PiMeResponse

    if (!piUser.uid || !piUser.username) {
      return NextResponse.json({ error: 'Invalid Pi verification response.' }, { status: 502 })
    }

    const walletAddress = body.wallet_address ?? null

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        pi_username: piUser.username,
        pi_wallet_address: walletAddress,
        wallet_address: walletAddress,
      })
      .eq('id', auth.sub)

    if (updateError) {
      console.error('[auth/connect-pi] Failed to update user wallet details:', updateError)
      return NextResponse.json({ error: 'Could not persist Pi wallet details.' }, { status: 500 })
    }

    return NextResponse.json({
      connected: true,
      pi_username: piUser.username,
      pi_wallet_address: walletAddress,
    })
  } catch (error) {
    console.error('[auth/connect-pi] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
