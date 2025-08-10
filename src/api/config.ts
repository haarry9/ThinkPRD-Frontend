export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000/api/v1'
export const WS_BASE: string = (import.meta as any).env?.VITE_WS_BASE || 'ws://localhost:8000'
// Feature flags
export const ENABLE_FLOWCHART_BUTTON: boolean = ((import.meta as any).env?.VITE_ENABLE_FLOWCHART_BUTTON ?? 'true') !== 'false'

export function apiUrl(path: string | URL): URL {
  if (path instanceof URL) return path
  // Ensure we don't accidentally double-prefix. new URL handles absolute paths.
  return new URL(path.replace(/^\/?/, ''), ensureTrailingSlash(API_BASE))
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/'
}

export function extractData<T>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return raw.data as T
  }
  return raw as T
}

