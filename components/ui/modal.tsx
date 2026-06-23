'use client'

import { useEffect } from 'react'
import { T } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
          width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: T.dim }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Shared form field components used inside modals ──────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </label>
  )
}

export function TextInput({
  value, onChange, placeholder, type = 'text', prefix,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 14, fontWeight: 600 }}>{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10,
          padding: prefix ? '10px 12px 10px 28px' : '10px 12px',
          color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export function TextArea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none',
        resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    />
  )
}

export function SubmitBtn({
  loading, onClick, children, disabled,
}: {
  loading?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        width: '100%', padding: '12px', borderRadius: 10, border: 'none',
        background: loading || disabled ? T.elev : `linear-gradient(135deg,${T.purple},${T.purpleL})`,
        color: loading || disabled ? T.dim : '#fff',
        fontWeight: 700, fontSize: 15, cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity .15s',
      }}
    >
      {loading ? 'Submitting…' : children}
    </button>
  )
}

export function ErrorMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <p style={{ margin: '8px 0 0', fontSize: 13, color: T.red, background: `${T.red}11`, padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.red}33` }}>
      {msg}
    </p>
  )
}

export function SuccessMsg({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <p style={{ margin: '8px 0 0', fontSize: 13, color: T.green, background: `${T.green}11`, padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.green}33` }}>
      {msg}
    </p>
  )
}
