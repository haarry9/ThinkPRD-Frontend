import { request } from '@/api/http'
import { apiUrl, extractData } from '@/api/config'
import type {
  IngestIdeaRequest,
  IngestIdeaResponse,
  ClarificationsRequest,
  ClarificationsResponse,
  SaveArtifactsRequest,
  SaveArtifactsResponse,
  GenerateSchemaRequest,
  GenerateSchemaResponse,
} from '@/api/agent.types'

export async function ingestIdea(payload: IngestIdeaRequest | FormData): Promise<IngestIdeaResponse> {
  const url = apiUrl('agent/ingest-idea')
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    const res = await request<any>(url, { method: 'POST', body: payload })
    return extractData<IngestIdeaResponse>(res)
  }
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload as IngestIdeaRequest),
  })
  return extractData<IngestIdeaResponse>(res)
}

export async function fetchClarifications(projectId: string, body: ClarificationsRequest): Promise<ClarificationsResponse> {
  const url = apiUrl(`agent/projects/${encodeURIComponent(projectId)}/clarifications`)
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return extractData<ClarificationsResponse>(res)
}

export async function saveArtifacts(projectId: string, body: SaveArtifactsRequest): Promise<SaveArtifactsResponse> {
  const url = apiUrl(`agent/projects/${encodeURIComponent(projectId)}/save-artifacts`)
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return extractData<SaveArtifactsResponse>(res)
}

export async function generateSchema(projectId: string, body: GenerateSchemaRequest): Promise<GenerateSchemaResponse> {
  const url = apiUrl(`agent/projects/${encodeURIComponent(projectId)}/generate-schema`)
  const res = await request<any>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return extractData<GenerateSchemaResponse>(res as any)
}

