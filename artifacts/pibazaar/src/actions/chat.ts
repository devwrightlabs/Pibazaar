// Client-side chat actions — replaces Next.js server actions

interface InsertMessageArgs {
  thread_id: string
  sender_id: string
  content: string
  is_read?: boolean
}

export async function insertMessage(
  args: InsertMessageArgs
): Promise<{ error: string | null }> {
  try {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('pi_auth_token') ?? sessionStorage.getItem('pi_auth_token')
        : null
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        chat_id: args.thread_id,
        content: args.content,
        sender_id: args.sender_id,
        is_read: args.is_read ?? false,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error ?? `Error ${res.status}` }
    }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
