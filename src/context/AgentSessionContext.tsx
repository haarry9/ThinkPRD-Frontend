import { createContext, useContext, useMemo } from 'react'
import { useAgentSession, type UseAgentSessionApi } from '@/hooks/useAgentSession'

type AgentSessionContextValue = UseAgentSessionApi

const AgentSessionContext = createContext<AgentSessionContextValue | null>(null)

export function AgentSessionProvider({ children }: { children: React.ReactNode }) {
  const api = useAgentSession()
  // Avoid re-creating reference needlessly; internal state updates still propagate
  const value = useMemo(() => api, [api])
  return (
    <AgentSessionContext.Provider value={value}>{children}</AgentSessionContext.Provider>
  )
}

export function useAgentSessionContext(): AgentSessionContextValue {
  const ctx = useContext(AgentSessionContext)
  if (!ctx) throw new Error('useAgentSessionContext must be used within an AgentSessionProvider')
  return ctx
}

