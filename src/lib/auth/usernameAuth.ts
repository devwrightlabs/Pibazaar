export const USERNAME_EMAIL_DOMAIN = 'pibazaar.local'

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}

export function usernameToHiddenEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (password.length > 128) return 'Password is too long.'
  return null
}
