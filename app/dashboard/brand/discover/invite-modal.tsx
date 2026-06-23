'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal, { FieldLabel, TextArea, SubmitBtn, ErrorMsg, SuccessMsg } from '@/components/ui/modal'
import { T, PLAT_COLORS } from '@/lib/utils'

interface Creator {
  id: string
  full_name: string | null
  username: string | null
  platform: string
  picture_url: string | null
}

interface Campaign {
  id: string
  title: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  creator: Creator | null
}

export default function InviteModal({ open, onClose, creator }: Props) {
  const supabase = createClient()
  const [campaigns,   setCampaigns]   = useState<Campaign[]>([])
  const [selectedCam, setSelectedCam] = useState<string>('')
  const [message,     setMessage]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [fetching,    setFetching]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)

  // Load brand's open campaigns when modal opens
  useEffect(() => {
    if (!open) return
    setFetching(true)
    supabase
      .from('campaigns')
      .select('id, title')
      .in('status', ['open', 'draft'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCampaigns(data ?? [])
        if (data?.[0]) setSelectedCam(data[0].id)
        setFetching(false)
      })
  }, [open])

  function handleClose() {
    setMessage(''); setError(null); setSuccess(null); setSelectedCam('')
    onClose()
  }

  async function submit() {
    if (!creator) return
    setError(null)

    if (!message.trim() || message.trim().length < 10) {
      setError('Write a short message (at least 10 characters).')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in.'); setLoading(false); return }

      // Get brand record for this user
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!brand) {
        setError('No brand profile found. Please set up your brand profile first.')
        setLoading(false)
        return
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('brand_id', brand.id)
        .eq('creator_id', creator.id)
        .single()

      let convId = existing?.id

      // Create conversation if it doesn't exist
      if (!convId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ brand_id: brand.id, creator_id: creator.id })
          .select('id')
          .single()

        if (convErr || !newConv) throw convErr ?? new Error('Failed to create conversation')
        convId = newConv.id
      }

      // Craft full message (append campaign context if selected)
      const selectedTitle = campaigns.find(c => c.id === selectedCam)?.title
      const fullMsg = selectedCam && selectedTitle
        ? `[Re: ${selectedTitle}]\n\n${message.trim()}`
        : message.trim()

      // Insert message
      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id:       user.id,
          sender_role:     'brand',
          body:            fullMsg,
        })

      if (msgErr) throw msgErr

      setSuccess(`Message sent to ${creator.full_name ?? creator.username}!`)
      setMessage('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setLoading(false)
  }

  if (!creator) return null

  const platColor = PLAT_COLORS[creator.platform?.toLowerCase()] ?? T.dim
  const displayName = creator.full_name ?? creator.username ?? 'Creator'
  const handle = creator.username ? `@${creator.username.replace('@', '')}` : ''

  return (
    <Modal open={open} onClose={handleClose} title="Contact Creator">
      {/* Creator preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.elev, borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${platColor}22`, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: platColor, overflow: 'hidden', border: `2px solid ${platColor}44` }}>
          {creator.picture_url
            ? <img src={creator.picture_url} width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="" />
            : displayName.slice(0, 2).toUpperCase()
          }
        </div>
        <div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{displayName}</div>
          <div style={{ fontSize: 12, color: T.faint }}>{handle}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${platColor}22`, color: platColor }}>
          {creator.platform?.charAt(0).toUpperCase() + creator.platform?.slice(1)}
        </span>
      </div>

      {/* Attach to campaign */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Attach to Campaign (optional)</FieldLabel>
        {fetching ? (
          <div style={{ color: T.faint, fontSize: 13 }}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ color: T.faint, fontSize: 13, padding: '10px 12px', background: T.elev, borderRadius: 10 }}>
            No open campaigns yet — <a href="/dashboard/brand/campaigns/new" style={{ color: '#a78bfa' }}>create one</a> first.
          </div>
        ) : (
          <select
            value={selectedCam}
            onChange={e => setSelectedCam(e.target.value)}
            style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">No specific campaign</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Message */}
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Message</FieldLabel>
        <TextArea
          value={message}
          onChange={setMessage}
          placeholder={`Hi ${displayName.split(' ')[0]}, we'd love to collaborate with you…`}
          rows={5}
        />
      </div>

      <SubmitBtn loading={loading} onClick={submit} disabled={!!success}>
        Send Message
      </SubmitBtn>
      <ErrorMsg msg={error} />
      <SuccessMsg msg={success} />
    </Modal>
  )
}
