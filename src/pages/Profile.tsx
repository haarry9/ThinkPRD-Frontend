import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { updateMe, type UpdateMePayload } from '@/api/users'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function Profile() {
  const { user, setUser, accessToken } = useAuth()
  const [form, setForm] = useState<UpdateMePayload>({
    first_name: '',
    last_name: '',
    bio: '',
    phone_number: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      bio: user.bio ?? '',
      phone_number: user.phone_number ?? '',
    })
  }, [user])

  const initials = useMemo(() => {
    const name = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`
    return name.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U'
  }, [user])

  const onChange = (key: keyof UpdateMePayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSubmitting(true)
    try {
      const updated = await updateMe(accessToken, form)
      setUser({ ...updated })
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' })
    } catch (err: any) {
      const status = err?.status
      const detail = err?.body?.error || err?.body?.message
      toast({ title: 'Update failed', description: detail || (status === 422 ? 'Validation error' : 'Please try again'), variant: 'destructive' as any })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
          {initials}
        </div>
        <div>
          <div className="text-xl font-semibold">{user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Your Profile'}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First name</label>
            <Input value={form.first_name ?? ''} onChange={onChange('first_name')} placeholder="Jane" />
          </div>
          <div>
            <label className="block text-sm mb-1">Last name</label>
            <Input value={form.last_name ?? ''} onChange={onChange('last_name')} placeholder="Doe" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Bio</label>
          <Textarea value={form.bio ?? ''} onChange={onChange('bio')} placeholder="Tell us a bit about yourself" />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone number</label>
          <Input value={form.phone_number ?? ''} onChange={onChange('phone_number')} placeholder="+1 555 555 5555" />
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="pressable" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}


