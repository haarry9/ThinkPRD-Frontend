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

export async function uploadProjectFiles(projectId: string, files: File[]): Promise<{ uploaded_files: any[] }> {
  const url = apiUrl(`projects/${encodeURIComponent(projectId)}/uploads`)
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const res = await request<any>(url, { method: 'POST', body: fd })
  return extractData<{ uploaded_files: any[] }>(res)
}

export async function listProjectFiles(projectId: string): Promise<{ files: any[] }> {
  const url = apiUrl(`projects/${encodeURIComponent(projectId)}/uploads`)
  const res = await request<any>(url, { method: 'GET' })
  return extractData<{ files: any[] }>(res)
}

