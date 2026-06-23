'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal, { FieldLabel, TextArea, SubmitBtn, ErrorMsg, SuccessMsg } from '@/components/ui/modal'
import { T, PLAT_COLORS } from '@/lib/utils'
import { notify } from '@/lib/notifications'

interface Creator {
  id: string
  full_name: string | null
  username: string | null
  platform: string
  picture_url: string | null
  followers: number | null
  subscribers: number | null
}

interface Campaign { id: string; title: string | null }

const CONTENT_TYPES: Record<string, string[]> = {
  youtube:   ['Video', 'Short', 'Live'],
  instagram: ['Post', 'Reel', 'Story'],
  tiktok:    ['Video', 'Live'],
}

export default function BidOfferModal({
  open, onClose, creator, estimatedPrice,
}: {
  open: boolean
  onClose: () => void
  creator: Creator | null
  estimatedPrice: number | null
}) {
  const supabase = createClient()

  const [campaigns,    setCampaigns]    = useState<Campaign[]>([])
  const [selectedCam,  setSelectedCam]  = useState('')
  const [contentType,  setContentType]  = useState('Video')
  const [price,        setPrice]        = useState('')
  const [conditions,   setConditions]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [fetching,     setFetching]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)

  useEffect(() => {
    if (!open || !creator) return
    setPrice(estimatedPrice != null ? String(estimatedPrice) : '')
    const types = CONTENT_TYPES[creator.platform?.toLowerCase()] ?? ['Video', 'Post']
    setContentType(types[0])

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
  }, [open, creator, estimatedPrice])

  function handleClose() {
    setPrice(''); setConditions(''); setError(null); setSuccess(null)
    onClose()
  }

  async function submit() {
    if (!creator) return
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Enter a valid price offer.'); return
    }
    setError(null); setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in.'); setLoading(false); return }

      const { data: brand } = await supabase
        .from('brands').select('id').eq('owner_id', user.id).single()

      if (!brand) {
        setError('No brand profile found.'); setLoading(false); return
      }

      // Find or create conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('brand_id', brand.id)
        .eq('creator_id', creator.id)
        .single()

      let convId = existing?.id

      if (!convId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ brand_id: brand.id, creator_id: creator.id })
          .select('id').single()
        if (convErr || !newConv) throw convErr ?? new Error('Failed to create conversation')
        convId = newConv.id
      }

      const campaignTitle = campaigns.find(c => c.id === selectedCam)?.title
      const msgParts = [
        `💼 Price Offer: $${parseFloat(price).toLocaleString()} / ${contentType}`,
        campaignTitle ? `📋 Campaign: ${campaignTitle}` : null,
        conditions.trim() ? `📝 Conditions:\n${conditions.trim()}` : null,
      ].filter(Boolean).join('\n\n')

      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id:       user.id,
        sender_role:     'brand',
        body:            msgParts,
      })

      if (msgErr) throw msgErr

      // Record outbound bid in bids table
      await supabase.from('bids').insert({
        campaign_id:     selectedCam || null,
        creator_id:      creator.id,
        brand_id:        brand.id,
        amount:          parseFloat(price),
        note:            conditions.trim() || null,
        status:          'pending',
        conversation_id: convId,
      })

      // Notify the creator — look up their user_id
      const { data: creatorRow } = await supabase
        .from('creators')
        .select('user_id')
        .eq('id', creator.id)
        .single()
      if (creatorRow?.user_id) {
        await notify(supabase, creatorRow.user_id, {
          type:  'offer',
          title: `${brand ? 'A brand' : 'Brand'} sent you a price offer`,
          body:  `$${parseFloat(price).toLocaleString()} / ${contentType}${campaigns.find(c => c.id === selectedCam)?.title ? ` — ${campaigns.find(c => c.id === selectedCam)?.title}` : ''}`,
          link:  '/dashboard/creator/profile',
        })
      }

      setSuccess(`Offer of $${parseFloat(price).toLocaleString()} sent to ${creator.full_name ?? creator.username}!`)
      setPrice(''); setConditions('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setLoading(false)
  }

  if (!creator) return null

  const platColor    = PLAT_COLORS[creator.platform?.toLowerCase()] ?? T.dim
  const displayName  = creator.full_name ?? creator.username ?? 'Creator'
  const contentTypes = CONTENT_TYPES[creator.platform?.toLowerCase()] ?? ['Video', 'Post']

  return (
    <Modal open={open} onClose={handleClose} title="Make a Price Offer" width={500}>

      {/* Creator preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.elev, borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${platColor}22`, border: `2px solid ${platColor}44`, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden', fontWeight: 800, color: platColor, fontSize: 16 }}>
          {creator.picture_url
            ? <img src={creator.picture_url} width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="" />
            : displayName.slice(0, 2).toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{displayName}</div>
          {creator.username && <div style={{ fontSize: 12, color: T.faint }}>@{creator.username.replace('@', '')}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: T.faint, marginBottom: 2 }}>Listed rate</div>
          {estimatedPrice != null
            ? <div style={{ fontWeight: 800, fontSize: 16, color: T.amber }}>${estimatedPrice.toLocaleString()}</div>
            : <div style={{ fontSize: 12, color: T.faint, fontStyle: 'italic' }}>Not set</div>
          }
        </div>
      </div>

      {/* Content type */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Content Type</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {contentTypes.map(ct => (
            <button key={ct} onClick={() => setContentType(ct)} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${contentType === ct ? T.amber : T.border}`,
              background: contentType === ct ? `${T.amber}22` : 'transparent',
              color: contentType === ct ? T.amber : T.dim,
            }}>{ct}</button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Your Offer (USD) per {contentType}</FieldLabel>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.amber, fontWeight: 800, fontSize: 18 }}>$</span>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder={estimatedPrice != null ? String(estimatedPrice) : 'Enter your offer'}
            style={{ width: '100%', background: T.elev, border: `2px solid ${T.amber}66`, borderRadius: 10, padding: '12px 12px 12px 30px', color: T.text, fontSize: 22, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Campaign */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Link to Campaign (optional)</FieldLabel>
        {fetching ? (
          <div style={{ color: T.faint, fontSize: 13 }}>Loading…</div>
        ) : (
          <select value={selectedCam} onChange={e => setSelectedCam(e.target.value)}
            style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
            <option value="">No specific campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {/* Conditions */}
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Conditions / Deliverables</FieldLabel>
        <TextArea
          value={conditions}
          onChange={setConditions}
          placeholder={`e.g. 1 dedicated ${contentType.toLowerCase()}, 60 seconds minimum, no competitor mentions, usage rights for 6 months…`}
          rows={4}
        />
      </div>

      <button onClick={submit} disabled={loading || !!success} style={{
        width: '100%', padding: '13px', borderRadius: 10, border: 'none',
        background: loading || success ? T.elev : 'linear-gradient(135deg, #f5a623, #e8920f)',
        color: loading || success ? T.dim : '#000',
        fontWeight: 800, fontSize: 15, cursor: loading || success ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {loading ? 'Sending…' : <>Send Offer →</>}
      </button>
      <ErrorMsg msg={error} />
      <SuccessMsg msg={success} />
    </Modal>
  )
}
