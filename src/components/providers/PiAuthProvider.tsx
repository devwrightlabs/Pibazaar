'use client'

import { createContext, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PiAuthContextValue {
  handleLogin: () => Promise<void>
  loading: boolean
  error: string | null
}

const PiAuthContext = createContext<PiAuthContextValue>({
  handleLogin: async () => {},
  loading: false,
  error: null,
})

export function usePiAuth() {
  return useContext(PiAuthContext)
}

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    router.push('/login')
    setLoading(false)
  }

  return (
    <PiAuthContext.Provider value={{ handleLogin, loading, error: null }}>
      {children}
    </PiAuthContext.Provider>
  )
}
