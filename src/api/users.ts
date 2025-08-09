export type UserProfile = {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  bio?: string
  phone_number?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type UpdateMePayload = Partial<Pick<UserProfile, 'first_name' | 'last_name' | 'bio' | 'phone_number'>>

import { request } from '@/api/http'
import { apiUrl } from '@/api/config'

export async function getMe(_accessToken: string): Promise<UserProfile> {
  // Token is read from storage and injected by http wrapper
  return request<UserProfile>(apiUrl('users/me'), { method: 'GET' })
}

export async function updateMe(_accessToken: string, payload: UpdateMePayload): Promise<UserProfile> {
  const data = await request<any>(apiUrl('users/me'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  // Some backends return { user, message }, others return the user directly
  return data?.user ?? data
}


