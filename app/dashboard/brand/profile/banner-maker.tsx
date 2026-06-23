'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BannerSize {
  id: string; label: string; w: number; h: number; platform: string
}
interface BannerTemplate {
  id: string; label: string; emoji: string
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

// ── Sizes ─────────────────────────────────────────────────────────────────────

const SIZES: BannerSize[] = [
  { id: 'yt_thumb',  label: 'YT Thumbnail',    platform: 'YouTube',    w: 1280, h: 720  },
  { id: 'yt_banner', label: 'YT Channel Art',   platform: 'YouTube',    w: 2560, h: 1440 },
  { id: 'ig_post',   label: 'IG Post (Square)', platform: 'Instagram',  w: 1080, h: 1080 },
  { id: 'ig_story',  label: 'IG Story',         platform: 'Instagram',  w: 1080, h: 1920 },
  { id: 'fb_cover',  label: 'FB Cover',         platform: 'Facebook',   w: 820,  h: 312  },
  { id: 'tw_header', label: 'X / Twitter',      platform: 'Twitter/X',  w: 1500, h: 500  },
]

// ── Canvas helpers ────────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ── Event banner templates ────────────────────────────────────────────────────

const TEMPLATES: BannerTemplate[] = [
  {
    id: 'diwali', label: 'Diwali / Festival', emoji: '🪔',
    draw(ctx, w, h) {
      const bg = ctx.createRadialGradient(w * 0.4, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8)
      bg.addColorStop(0, '#f97316'); bg.addColorStop(0.5, '#dc2626'); bg.addColorStop(1, '#7c2d12')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      // Diamonds
      ctx.strokeStyle = 'rgba(253,224,71,0.28)'; ctx.lineWidth = w * 0.003
      for (let i = 0; i < 10; i++) {
        const x = w * (0.08 + i * 0.09), y = h * 0.18, s = h * 0.055
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y)
        ctx.closePath(); ctx.stroke()
      }
      // Dot grid
      ctx.fillStyle = 'rgba(253,224,71,0.2)'
      for (let xi = 0; xi < w; xi += w * 0.055)
        for (let yi = h * 0.38; yi < h; yi += h * 0.1) {
          ctx.beginPath(); ctx.arc(xi, yi, w * 0.006, 0, Math.PI * 2); ctx.fill()
        }
      // Horizontal gold bar
      const bar = ctx.createLinearGradient(0, 0, w, 0)
      bar.addColorStop(0, 'transparent'); bar.addColorStop(0.15, 'rgba(253,224,71,0.25)')
      bar.addColorStop(0.85, 'rgba(253,224,71,0.25)'); bar.addColorStop(1, 'transparent')
      ctx.fillStyle = bar; ctx.fillRect(0, h * 0.28, w, h * 0.005)
      // Event label
      ctx.fillStyle = '#fde047'; ctx.font = `800 ${h * 0.1}px sans-serif`
      ctx.textAlign = 'center'; ctx.fillText('✨ Festival Special', w / 2, h * 0.24)
    },
  },
  {
    id: 'blackfriday', label: 'Black Friday', emoji: '🖤',
    draw(ctx, w, h) {
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h)
      // Diagonal gold stripes
      ctx.strokeStyle = 'rgba(234,179,8,0.12)'; ctx.lineWidth = w * 0.045
      for (let i = -3; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(w * i * 0.22, 0); ctx.lineTo(w * i * 0.22 + h * 0.6, h); ctx.stroke()
      }
      // Glow behind text
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.35)
      glow.addColorStop(0, 'rgba(234,179,8,0.15)'); glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h)
      // Main text
      ctx.fillStyle = '#eab308'; ctx.font = `900 ${h * 0.2}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText('BLACK', w / 2, h * 0.38)
      ctx.fillStyle = '#fff'
      ctx.fillText('FRIDAY', w / 2, h * 0.6)
      // Underline
      const uw = w * 0.55
      const lg = ctx.createLinearGradient((w - uw) / 2, 0, (w + uw) / 2, 0)
      lg.addColorStop(0, 'transparent'); lg.addColorStop(0.5, '#eab308'); lg.addColorStop(1, 'transparent')
      ctx.strokeStyle = lg; ctx.lineWidth = h * 0.006
      ctx.beginPath(); ctx.moveTo((w - uw) / 2, h * 0.64); ctx.lineTo((w + uw) / 2, h * 0.64); ctx.stroke()
    },
  },
  {
    id: 'newyear', label: 'New Year', emoji: '🎆',
    draw(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#0f172a'); bg.addColorStop(0.6, '#1e1b4b'); bg.addColorStop(1, '#312e81')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      for (let i = 0; i < 90; i++) {
        const sx = ((Math.sin(i * 2.39) + 1) / 2) * w
        const sy = ((Math.cos(i * 1.73) + 1) / 2) * h * 0.78
        const sr = w * (0.0015 + (Math.abs(Math.sin(i * 3)) * 0.002))
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
      }
      // Ghost "2025"
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.font = `900 ${h * 0.52}px sans-serif`
      ctx.textAlign = 'center'; ctx.fillText('2025', w / 2, h * 0.7)
      // Firework lines
      const fwColors = ['#a5f3fc', '#fde68a', '#fbcfe8']
      for (let f = 0; f < 3; f++) {
        const fx = w * (0.18 + f * 0.32), fy = h * (0.25 + (f % 2) * 0.1)
        ctx.strokeStyle = fwColors[f]; ctx.lineWidth = w * 0.002
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2
          const len = h * (0.06 + Math.sin(a + f) * 0.02)
          ctx.beginPath(); ctx.moveTo(fx, fy)
          ctx.lineTo(fx + Math.cos(angle) * len, fy + Math.sin(angle) * len); ctx.stroke()
        }
      }
      // Label
      ctx.fillStyle = '#a5f3fc'; ctx.font = `700 ${h * 0.1}px sans-serif`
      ctx.fillText('✨ Happy New Year', w / 2, h * 0.28)
    },
  },
  {
    id: 'summer', label: 'Summer Sale', emoji: '☀️',
    draw(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0ea5e9'); bg.addColorStop(0.55, '#fbbf24'); bg.addColorStop(1, '#f97316')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      // Sun
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(w * 0.82, h * 0.22, h * 0.22, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(w * 0.82, h * 0.22, h * 0.3, 0, Math.PI * 2); ctx.fill()
      // Waves
      const drawWave = (yBase: number, alpha: number) => {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.beginPath(); ctx.moveTo(0, yBase)
        const segs = 12
        for (let i = 0; i <= segs; i++) {
          const px = (i / segs) * w
          const py = yBase + Math.sin((i / segs) * Math.PI * 4) * h * 0.025
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
      }
      drawWave(h * 0.72, 0.15); drawWave(h * 0.78, 0.12); drawWave(h * 0.85, 0.1)
      // Label
      ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.12}px sans-serif`
      ctx.textAlign = 'center'; ctx.fillText('☀️ Summer Sale', w / 2, h * 0.4)
      ctx.font = `600 ${h * 0.055}px sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText('Huge discounts — limited time only', w / 2, h * 0.5)
    },
  },
  {
    id: 'launch', label: 'Product Launch', emoji: '🚀',
    draw(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#0d9488'); bg.addColorStop(0.5, '#7c3aed'); bg.addColorStop(1, '#1e1b4b')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      // Concentric rings
      for (let i = 7; i > 0; i--) {
        ctx.strokeStyle = `rgba(255,255,255,${0.025 * i})`; ctx.lineWidth = w * 0.03
        ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.13 * i, 0, Math.PI * 2); ctx.stroke()
      }
      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
      for (let gx = 0; gx < w; gx += w / 12) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke() }
      for (let gy = 0; gy < h; gy += h / 8)  { ctx.beginPath(); ctx.moveTo(0, gy);  ctx.lineTo(w, gy);  ctx.stroke() }
      // Label
      ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.12}px sans-serif`
      ctx.textAlign = 'center'; ctx.fillText('🚀 Now Live', w / 2, h * 0.38)
      ctx.font = `500 ${h * 0.05}px sans-serif`; ctx.fillStyle = 'rgba(167,243,208,0.85)'
      ctx.fillText('Brand new — check it out', w / 2, h * 0.49)
    },
  },
  {
    id: 'christmas', label: 'Christmas', emoji: '🎄',
    draw(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#991b1b'); bg.addColorStop(0.5, '#b91c1c'); bg.addColorStop(1, '#14532d')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      // Snowflakes
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      for (let i = 0; i < 70; i++) {
        const sx = ((Math.sin(i * 3.71) + 1) / 2) * w
        const sy = ((Math.cos(i * 2.13) + 1) / 2) * h
        const sr = w * (0.003 + Math.abs(Math.sin(i * 5)) * 0.004)
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
      }
      // Gold bar top
      const topBar = ctx.createLinearGradient(0, 0, w, 0)
      topBar.addColorStop(0, 'transparent'); topBar.addColorStop(0.2, 'rgba(253,224,71,0.4)')
      topBar.addColorStop(0.8, 'rgba(253,224,71,0.4)'); topBar.addColorStop(1, 'transparent')
      ctx.fillStyle = topBar; ctx.fillRect(0, h * 0.13, w, h * 0.004)
      // Label
      ctx.fillStyle = '#fef08a'; ctx.font = `800 ${h * 0.12}px sans-serif`
      ctx.textAlign = 'center'; ctx.fillText('🎄 Holiday Sale', w / 2, h * 0.35)
      ctx.font = `500 ${h * 0.05}px sans-serif`; ctx.fillStyle = 'rgba(254,240,138,0.75)'
      ctx.fillText('Gifts for everyone ✨', w / 2, h * 0.46)
    },
  },
]

// ── Banner Maker Component ────────────────────────────────────────────────────

export default function BannerMaker({ brandName }: { brandName?: string }) {
  const canvasRef                  = useRef<HTMLCanvasElement>(null)
  const [sizeId,     setSizeId]    = useState('yt_thumb')
  const [tmplId,     setTmplId]    = useState('diwali')
  const [promoCode,  setPromoCode] = useState('PROMO15')
  const [codeSize,   setCodeSize]  = useState(4.5)

  const size  = SIZES.find(s => s.id === sizeId)  ?? SIZES[0]
  const tmpl  = TEMPLATES.find(t => t.id === tmplId) ?? TEMPLATES[0]

  // ── Draw ──────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = size
    canvas.width = w; canvas.height = h

    // 1. Template background
    tmpl.draw(ctx, w, h)

    // 2. Brand name — top-left watermark
    if (brandName?.trim()) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle   = '#fff'
      ctx.font        = `700 ${h * 0.04}px sans-serif`
      ctx.textAlign   = 'left'
      ctx.fillText(brandName.toUpperCase(), w * 0.04, h * 0.09)
      ctx.restore()
    }

    // 3. Promo code pill — bottom center
    if (promoCode.trim()) {
      const code    = promoCode.trim().toUpperCase()
      const fCode   = h * (codeSize / 100)
      const fLabel  = fCode * 0.38
      const px      = w * 0.045
      const py      = h * 0.022
      const boxH    = fLabel + fCode + py * 3.2
      const boxW    = Math.max(w * 0.28, fCode * code.length * 0.6) + px * 2
      const bx      = (w - boxW) / 2
      const by      = h - boxH - h * 0.045
      const radius  = h * 0.022

      // Shadow + pill
      ctx.save()
      ctx.shadowColor   = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur    = h * 0.025
      ctx.shadowOffsetY = h * 0.01
      rr(ctx, bx, by, boxW, boxH, radius)
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill()
      ctx.restore()

      // Subtle border
      rr(ctx, bx, by, boxW, boxH, radius)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke()

      // "USE CODE" label
      ctx.fillStyle   = 'rgba(255,255,255,0.6)'
      ctx.font        = `600 ${fLabel}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('USE CODE', w / 2, by + py + fLabel)

      // Thin divider
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bx + px * 0.8,        by + py + fLabel + py * 0.5)
      ctx.lineTo(bx + boxW - px * 0.8, by + py + fLabel + py * 0.5)
      ctx.stroke()

      // Code text
      ctx.fillStyle   = '#ffffff'
      ctx.font        = `900 ${fCode}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText(code, w / 2, by + boxH - py * 0.9)
    }
  }, [size, tmpl, promoCode, brandName, codeSize])

  useEffect(() => { redraw() }, [redraw])

  function download() {
    const canvas = canvasRef.current; if (!canvas) return
    const a = document.createElement('a')
    a.download = `banner_${tmplId}_${sizeId}.png`
    a.href     = canvas.toDataURL('image/png')
    a.click()
  }

  // Scale canvas for preview
  const MAX_W = 560, MAX_H = 360
  const ar    = size.w / size.h
  let dispW   = MAX_W, dispH = MAX_W / ar
  if (dispH > MAX_H) { dispH = MAX_H; dispW = MAX_H * ar }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Left controls ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Event picker */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Event Banner
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTmplId(t.id)}
                style={{
                  padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                  border: '1.5px solid', textAlign: 'left',
                  borderColor: tmplId === t.id ? '#6366f1' : '#e5e7eb',
                  background:  tmplId === t.id ? '#ede9fe' : '#fafafa',
                  fontSize: 11, fontWeight: 600, color: '#374151',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                <span style={{ fontSize: 14 }}>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size picker */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Banner Size
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SIZES.map(s => (
              <button key={s.id} onClick={() => setSizeId(s.id)}
                style={{
                  padding: '7px 10px', borderRadius: 7, border: '1.5px solid',
                  borderColor: sizeId === s.id ? '#0f766e' : '#e5e7eb',
                  background:  sizeId === s.id ? '#ccfbf1' : '#fafafa',
                  cursor: 'pointer', fontSize: 11, color: '#374151', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <span style={{ fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: '#9ca3af', fontSize: 10 }}>{s.w}×{s.h}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Promo code */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Promo Code
          </div>
          <input
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="E.g. SUMMER20"
            maxLength={20}
            style={{
              width: '100%', padding: '9px 11px', borderRadius: 7,
              border: '1.5px solid #d1d5db', fontSize: 14, fontWeight: 800,
              letterSpacing: '.1em', color: '#111827', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
            Placed at bottom center · always visible
          </div>
        </div>

        {/* Code size slider */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em', display: 'flex', justifyContent: 'space-between' }}>
            <span>Code Size</span>
            <span style={{ color: '#6366f1', fontWeight: 800 }}>{codeSize}%</span>
          </div>
          <input type="range" min={2.5} max={8} step={0.5} value={codeSize}
            onChange={e => setCodeSize(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1' }} />
        </div>

        {/* Download */}
        <button onClick={download}
          style={{
            padding: '11px 0', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>
          <i className="ti ti-download" style={{ fontSize: 15 }} />
          Download PNG — {size.w}×{size.h}
        </button>
      </div>

      {/* ── Right: canvas preview ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {size.platform} · <strong style={{ color: '#6b7280' }}>{size.label}</strong> · {size.w}×{size.h}px
        </div>
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 36px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
          flexShrink: 0, width: dispW, height: dispH,
          background: '#f3f4f6',
        }}>
          <canvas ref={canvasRef}
            style={{ width: dispW, height: dispH, display: 'block' }} />
        </div>
        <div style={{ fontSize: 10, color: '#d1d5db', display: 'flex', gap: 12 }}>
          <span>Preview scaled to fit</span>
          <span>·</span>
          <span>Download exports at full resolution</span>
        </div>
      </div>
    </div>
  )
}
