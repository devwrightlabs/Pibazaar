import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/authHelper'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface LinkWalletBody {
  accessToken?: string
  walletAddress?: string
}

interface PiMeResponse {
  uid: string
  username: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as LinkWalletBody
    const accessToken = body.accessToken?.trim()
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!piResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify Pi wallet' }, { status: 401 })
    }

    const piUser = await piResponse.json() as PiMeResponse
    const walletAddress = body.walletAddress?.trim() || null

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        pi_username: piUser.username ?? null,
        pi_wallet_address: walletAddress,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('pi_uid', auth.pi_uid)
      .select('pi_uid, pi_username, pi_wallet_address')
      .single()

    if (error || !data) {
      console.error('[auth/link-wallet] Update failed:', error)
      return NextResponse.json({ error: 'Failed to save wallet connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('[auth/link-wallet] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

