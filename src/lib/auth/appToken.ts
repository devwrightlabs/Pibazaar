import jwt from 'jsonwebtoken'

interface CreateAppTokenInput {
  userId: string
}

export function createAppToken({ userId }: CreateAppTokenInput): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!jwtSecret || !supabaseUrl) {
    throw new Error('Missing SUPABASE_JWT_SECRET or SUPABASE_URL for app token signing.')
  }

  const now = Math.floor(Date.now() / 1000)

  return jwt.sign(
    {
      sub: userId,
      pi_uid: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iss: supabaseUrl,
      iat: now,
      exp: now + 3600,
    },
    jwtSecret
  )
}
