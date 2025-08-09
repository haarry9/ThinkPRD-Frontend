import { request } from '@/api/http'
import { apiUrl, extractData } from '@/api/config'
import type { ListVersionsResponse, RollbackResponse } from '@/api/agent.types'

export async function listVersions(projectId: string): Promise<ListVersionsResponse> {
  const url = apiUrl(`projects/${encodeURIComponent(projectId)}/versions`)
  const res = await request<any>(url, { method: 'GET' })
  return extractData<ListVersionsResponse>(res)
}

export async function rollback(projectId: string, version: string): Promise<RollbackResponse> {
  const url = apiUrl(`projects/${encodeURIComponent(projectId)}/rollback`)
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  })
  return extractData<RollbackResponse>(res)
}

