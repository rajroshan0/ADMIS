'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal, { FieldLabel, TextInput, TextArea, SubmitBtn, ErrorMsg, SuccessMsg } from '@/components/ui/modal'
import { T, fmtBudget, DEAL_LABELS } from '@/lib/utils'
import { notify } from '@/lib/notifications'

interface Campaign {
  id: string
  title: string | null
  payout_amount: number | null
  budget_total: number | null
  payout_model: string | null
  deal_type: string | null
  brands?: { name: string | null } | null
}

interface Props {
  open: boolean
  onClose: () => void
  campaign: Campaign | null
}

export default function BidModal({ open, onClose, campaign }: Props) {
  const supabase = createClient()
  const [amount,  setAmount]  = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleClose() {
    setAmount(''); setMessage(''); setError(null); setSuccess(null)
    onClose()
  }

  async function submit() {
    if (!campaign) return
    setError(null)

    if (!message.trim() || message.trim().length < 20) {
      setError('Write a short pitch (at least 20 characters).')
      return
    }

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be logged in.'); setLoading(false); return }

      // Look up creator record linked to this auth user
      const { data: creator, error: cErr } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (cErr || !creator) {
        setError('No creator profile found for your account. Please complete your profile first.')
        setLoading(false)
        return
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('creator_id', creator.id)
        .single()

      if (existing) {
        setError('You have already applied to this campaign.')
        setLoading(false)
        return
      }

      // Insert application
      const { error: insertErr } = await supabase
        .from('campaign_applications')
        .insert({
          campaign_id: campaign.id,
          creator_id:  creator.id,
          bid_amount:  amount ? parseFloat(amount) : null,
          message:     message.trim(),
          status:      'applied',
        })

      if (insertErr) throw insertErr

      // Notify the brand owner
      const { data: campFull } = await supabase
        .from('campaigns')
        .select('brand_id, brands(owner_id)')
        .eq('id', campaign.id)
        .single()
      const brandOwnerId = (campFull?.brands as any)?.owner_id
      if (brandOwnerId) {
        await notify(supabase, brandOwnerId, {
          type:  'bid',
          title: `New bid on "${campaign.title}"`,
          body:  message.trim().slice(0, 120),
          link:  `/dashboard/brand/campaigns/${campaign.id}`,
        })
      }

      setSuccess('Application submitted! The brand will review your pitch.')
      setAmount(''); setMessage('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setLoading(false)
  }

  if (!campaign) return null

  const suggestedPayout = fmtBudget(campaign.payout_amount, campaign.budget_total, campaign.payout_model)
  const isCommission    = campaign.payout_model === 'commission'

  return (
    <Modal open={open} onClose={handleClose} title="Apply to Campaign">
      {/* Campaign preview */}
      <div style={{ background: T.elev, borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{campaign.title}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.dim }}>{campaign.brands?.name ?? 'Brand'}</span>
          {campaign.deal_type && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#1d1145', color: '#a78bfa' }}>
              {DEAL_LABELS[campaign.deal_type] ?? campaign.deal_type}
            </span>
          )}
          <span style={{ fontSize: 13, color: T.green, fontWeight: 700, marginLeft: 'auto' }}>
            {suggestedPayout}
          </span>
        </div>
      </div>

      {/* Bid amount (skip for commission model) */}
      {!isCommission && (
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Your Bid / Rate (USD){campaign.payout_amount ? ` — suggested ${suggestedPayout}` : ''}</FieldLabel>
          <TextInput
            value={amount}
            onChange={setAmount}
            placeholder={campaign.payout_amount ? String(campaign.payout_amount) : 'e.g. 500'}
            type="number"
            prefix="$"
          />
          <p style={{ fontSize: 11, color: T.faint, marginTop: 5 }}>
            Leave blank to accept the brand's listed rate.
          </p>
        </div>
      )}

      {isCommission && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: `${T.amber}11`, borderRadius: 10, border: `1px solid ${T.amber}33` }}>
          <p style={{ margin: 0, fontSize: 13, color: T.amber }}>
            This is a commission-based campaign. Earnings are based on sales you generate.
          </p>
        </div>
      )}

      {/* Pitch message */}
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Your Pitch</FieldLabel>
        <TextArea
          value={message}
          onChange={setMessage}
          placeholder="Tell the brand why you're a great fit — your audience, content style, past brand work…"
          rows={5}
        />
        <p style={{ fontSize: 11, color: message.length < 20 ? T.faint : T.green, marginTop: 5, textAlign: 'right' }}>
          {message.length} chars {message.length < 20 ? `(min 20)` : '✓'}
        </p>
      </div>

      <SubmitBtn loading={loading} onClick={submit} disabled={!!success}>
        Submit Application
      </SubmitBtn>
      <ErrorMsg msg={error} />
      <SuccessMsg msg={success} />
    </Modal>
  )
}
