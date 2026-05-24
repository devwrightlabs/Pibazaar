/**
 * pi-auth — Supabase Edge Function
 *
 * Exclusive Pi Network authentication. Verifies the Pi access token
 * server-side, upserts the user record, and mints a custom Supabase JWT.
 * No email, no password — Pi SDK only.
 *
 * Request body:
 *   { action: 'authenticate', accessToken, pi_uid, pi_username? }
 *
 * Response (200):
 *   { token, isNewUser, user: { pi_uid, username, avatar_url } }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PiMeResponse {
  uid: string
  username: string
}

interface AuthRequestBody {
  action?: string
  accessToken?: string
  pi_uid?: string
  pi_username?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as AuthRequestBody

    if (body.action !== 'authenticate') {
      return json({ error: 'Unsupported action. Use authenticate.' }, 400)
    }

    const { accessToken, pi_uid: clientPiUid, pi_username: clientUsername } = body

    if (!accessToken || typeof accessToken !== 'string') {
      return json({ error: 'Missing or invalid accessToken' }, 400)
    }

    if (!clientPiUid || typeof clientPiUid !== 'string') {
      return json({ error: 'Missing or invalid pi_uid' }, 400)
    }

    const piApiKey = Deno.env.get('PI_API_KEY')
    if (!piApiKey) {
      console.error('[pi-auth] PI_API_KEY is not configured')
      return json({ error: 'Server configuration error' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') ?? ''

    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
      console.error('[pi-auth] Missing Supabase environment variables')
      return json({ error: 'Server configuration error' }, 500)
    }

    // Verify token with Pi Network API (server-to-server).
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Api-Key': piApiKey,
      },
    })

    if (!piResponse.ok) {
      console.error('[pi-auth] Pi API error:', piResponse.status)
      return json({ error: 'Failed to verify Pi access token' }, 401)
    }

    const piUser = (await piResponse.json()) as PiMeResponse

    if (!piUser.uid) {
      return json({ error: 'Invalid Pi API response' }, 502)
    }

    // Ensure the client-provided UID matches Pi's authoritative response.
    if (piUser.uid !== clientPiUid) {
      return json({ error: 'Pi UID mismatch' }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, is_verified, username, pi_id')
      .eq('pi_uid', piUser.uid)
      .maybeSingle()

    const isNewUser = !existingUser
    const username = piUser.username ?? clientUsername ?? 'Pioneer'

    const upsertPayload: Record<string, unknown> = {
      pi_uid: piUser.uid,
      username,
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      pi_verified_at: new Date().toISOString(),
      is_verified: existingUser?.is_verified ?? false,
    }

    // Set pi_id only for new accounts — preserve legacy pi_id values on re-login.
    if (!existingUser) {
      upsertPayload.pi_id = piUser.username ?? piUser.uid
    }

    const { data: dbUser, error: upsertError } = await supabase
      .from('users')
      .upsert(upsertPayload, { onConflict: 'pi_uid' })
      .select('id, pi_uid, username, avatar_url')
      .single()

    if (upsertError || !dbUser) {
      console.error('[pi-auth] DB upsert error:', upsertError?.message)
      return json({ error: 'Failed to persist user' }, 500)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: dbUser.id,
        pi_uid: dbUser.pi_uid,
        role: 'authenticated',
        aud: 'authenticated',
        iss: supabaseUrl,
        iat: getNumericDate(0),
        exp: getNumericDate(60 * 60),
      },
      key
    )

    return json({
      token,
      isNewUser,
      user: {
        pi_uid: dbUser.pi_uid,
        username: dbUser.username ?? username,
        avatar_url: dbUser.avatar_url ?? null,
      },
    })
  } catch (err) {
    console.error('[pi-auth] Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
