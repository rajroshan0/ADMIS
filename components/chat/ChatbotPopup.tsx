'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  sql?: string
  ts: number
}

// ─── Theme tokens (matches creator-discovery.tsx palette) ──────────────────────
const T = {
  bg:      '#090c12',
  card:    '#10141e',
  elev:    '#161b28',
  border:  '#1d2433',
  text:    '#f3f5f8',
  dim:     '#98a2b3',
  faint:   '#5e6a7d',
  purple:  '#5710fc',
  purpleL: '#7c3aed',
  green:   '#4ade80',
  amber:   '#f5a623',
}

// ─── Inline SVG icons ──────────────────────────────────────────────────────────
const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconCode = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
)

// ─── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'How many active campaigns do I have?',
  'Show me my pending deals',
  'Which campaigns have the most applications?',
  'How many creators applied this week?',
  'What is my total deal value?',
  'Show overdue tasks',
]

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: T.purple,
            animation: `admis-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Individual message bubble ─────────────────────────────────────────────────
function ChatMessage({ msg, showSQL, onToggleSQL }: {
  msg: Message
  showSQL: boolean
  onToggleSQL: () => void
}) {
  const isUser = msg.role === 'user'
  const isErr  = msg.role === 'error'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 12,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`,
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff',
        }}>A</div>
      )}

      <div style={{ maxWidth: '80%' }}>
        {/* Bubble */}
        <div style={{
          padding: '9px 13px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser
            ? `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`
            : isErr
              ? '#3a1515'
              : T.elev,
          border: isErr ? '1px solid #f4574d44' : isUser ? 'none' : `1px solid ${T.border}`,
          color: isErr ? '#f4574d' : T.text,
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>

        {/* SQL toggle */}
        {msg.sql && (
          <div style={{ marginTop: 5 }}>
            <button
              onClick={onToggleSQL}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                color: T.faint, fontSize: 11, fontWeight: 600,
              }}
            >
              <IconCode /> {showSQL ? 'Hide SQL' : 'Show SQL'}
            </button>
            {showSQL && (
              <pre style={{
                marginTop: 5, padding: '8px 10px',
                background: '#0b0e16', border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 11, color: T.amber,
                overflowX: 'auto', lineHeight: 1.5,
                maxHeight: 180, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {msg.sql}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ChatbotPopup component ───────────────────────────────────────────────
export default function ChatbotPopup() {
  const [open,       setOpen]       = useState(false)
  const [minimized,  setMinimized]  = useState(false)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [sqlVisible, setSqlVisible] = useState<Set<string>>(new Set())
  const [sessionId]  = useState(() => `session-${Date.now()}`)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, minimized])

  const toggleSQL = useCallback((id: string) => {
    setSqlVisible(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, {
          id: `e-${Date.now()}`,
          role: 'error',
          content: data.error ?? 'Something went wrong. Please try again.',
          ts: Date.now(),
        }])
        return
      }

      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sql: data.sql || undefined,
        ts: Date.now(),
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'error',
        content: 'Network error. Check your connection.',
        ts: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    setMessages([])
    setSqlVisible(new Set())
    await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ─── Inject keyframe CSS once ────────────────────────────────────────────────
  useEffect(() => {
    const id = 'admis-chat-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes admis-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
      @keyframes admis-fadein {
        from { opacity: 0; transform: translateY(12px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `
    document.head.appendChild(style)
  }, [])

  // ─── FAB button (when closed) ─────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask ADMIS Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`,
          color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
          boxShadow: `0 4px 24px ${T.purple}66`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 32px ${T.purple}88`
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px ${T.purple}66`
        }}
      >
        <IconChat />
      </button>
    )
  }

  // ─── Chat window ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        width: 380, borderRadius: 18,
        background: T.card, border: `1px solid ${T.border}`,
        boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        maxHeight: minimized ? 'auto' : 560,
        animation: 'admis-fadein 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${T.purple}22, ${T.purpleL}11)`,
        borderBottom: minimized ? 'none' : `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`,
            display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, color: '#fff',
          }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>ADMIS Assistant</div>
            <div style={{ fontSize: 11, color: T.green, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
              ADMIS AI assistant
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {messages.length > 0 && !minimized && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: T.faint, display: 'grid', placeItems: 'center' }}
            >
              <IconTrash />
            </button>
          )}
          <button
            onClick={() => setMinimized(m => !m)}
            title={minimized ? 'Expand' : 'Minimise'}
            style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: T.faint, display: 'grid', placeItems: 'center' }}
          >
            <IconMinus />
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close"
            style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: T.faint, display: 'grid', placeItems: 'center' }}
          >
            <IconX />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Messages ──────────────────────────────────────────────────────── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 6px',
            scrollbarWidth: 'thin', scrollbarColor: `${T.border} transparent`,
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>✨</div>
                <p style={{ color: T.text, fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>
                  Ask about your brand data
                </p>
                <p style={{ color: T.dim, fontSize: 12, margin: '0 0 18px', lineHeight: 1.5 }}>
                  Campaigns, deals, applications,<br />tasks, creators & more
                </p>
                {/* Suggestion chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        padding: '5px 10px', borderRadius: 20,
                        border: `1px solid ${T.border}`,
                        background: T.elev, color: T.dim,
                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = T.text
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.purple
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = T.dim
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.border
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  showSQL={sqlVisible.has(msg.id)}
                  onToggleSQL={() => toggleSQL(msg.id)}
                />
              ))
            )}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`,
                  display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>A</div>
                <div style={{
                  background: T.elev, border: `1px solid ${T.border}`,
                  borderRadius: '14px 14px 14px 4px',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ─────────────────────────────────────────────────────────── */}
          <div style={{
            padding: '10px 12px 14px',
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: T.elev, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: '8px 10px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your campaigns, deals…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: T.text, fontSize: 13, resize: 'none', lineHeight: 1.5,
                  maxHeight: 100, overflowY: 'auto',
                  scrollbarWidth: 'thin', scrollbarColor: `${T.border} transparent`,
                  fontFamily: 'inherit',
                  opacity: loading ? 0.5 : 1,
                }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 32, height: 32, borderRadius: 9, border: 'none',
                  background: !input.trim() || loading
                    ? T.border
                    : `linear-gradient(135deg, ${T.purple}, ${T.purpleL})`,
                  color: '#fff', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <IconSend />
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 10, color: T.faint, textAlign: 'center' }}>
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </>
      )}
    </div>
  )
}
