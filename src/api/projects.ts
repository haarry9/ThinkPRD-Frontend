import { request } from '@/api/http'
import { apiUrl, extractData } from '@/api/config'
import type { ListVersionsResponse, RollbackResponse } from '@/api/agent.types'

export interface Project {
  id: string
  user_id: string
  project_name?: string
  initial_idea?: string
  status?: 'active' | 'archived' | 'deleted'
  source_chat_id?: string
  created_from_chat?: boolean
  current_version?: string
  storage_path?: string
  metadata?: {
    thinking_lens_status?: {
      discovery?: boolean
      user_journey?: boolean
      metrics?: boolean
      gtm?: boolean
      risks?: boolean
    }
    last_agent_run?: string
    total_iterations?: number
    file_count?: number
    storage_size_bytes?: number
  }
  created_at?: string
  updated_at?: string
}

export interface ListProjectsResponse {
  projects: Project[]
  total: number
  limit: number
  offset: number
}

interface PaginatedProjectsResponse {
  success: boolean
  data: {
    items: Project[]
    total: number
    limit: number
    offset: number
  }
  message: string
}

export async function listProjects(
  status: string = 'active',
  limit: number = 20,
  offset: number = 0,
  sortBy: string = 'updated_at',
  sortOrder: string = 'desc'
): Promise<ListProjectsResponse> {
  const params = new URLSearchParams({
    status,
    limit: limit.toString(),
    offset: offset.toString(),
    sort_by: sortBy,
    sort_order: sortOrder
  })
  const url = apiUrl(`projects/?${params.toString()}`)
  const res = await request<PaginatedProjectsResponse>(url, { method: 'GET' })
  
  // Handle the BaseResponse.paginated structure
  if (res.success && res.data) {
    return {
      projects: res.data.items || [],
      total: res.data.total || 0,
      limit: res.data.limit || limit,
      offset: res.data.offset || offset
    }
  }
  
  // Fallback for unexpected response format
  console.warn('Unexpected API response format:', res)
  return {
    projects: [],
    total: 0,
    limit,
    offset
  }
}

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

export async function createChatForProject(projectId: string): Promise<{ id: string }> {
  const url = apiUrl('chats')
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_name: `Chat for Project`,
      // You might want to add project_id to the chat metadata
    }),
  })
  
  // Handle BaseResponse format
  if (res.success && res.data) {
    return { id: res.data.id }
  }
  
  // Fallback - extract data directly if not wrapped
  return extractData<{ id: string }>(res)
}

// Data restoration functions for loading previous PRDs and chat history
export async function getChatMessages(chatId: string, limit: number = 50): Promise<{ messages: any[], has_more: boolean }> {
  const url = apiUrl(`chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`)
  const res = await request<any>(url, { method: 'GET' })
  return extractData<{ messages: any[], has_more: boolean }>(res)
}

export async function getCurrentArtifacts(projectId: string): Promise<{
  prd_markdown: string | null
  mermaid: string | null
  project_name: string
  initial_idea: string
  current_version: string
}> {
  const url = apiUrl(`projects/${encodeURIComponent(projectId)}/current-artifacts`)
  const res = await request<any>(url, { method: 'GET' })
  return extractData<{
    prd_markdown: string | null
    mermaid: string | null
    project_name: string
    initial_idea: string
    current_version: string
  }>(res)
}

