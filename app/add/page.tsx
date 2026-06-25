'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = ['餐廳','咖啡廳','景點','市場','百貨','購物','酒吧','住宿','其他']

type Result = {
  name: string; country: string; city: string; district: string; neighborhood: string
  types: string[]; summary: string; recommendations: string[]; tags: string[]
  address: string; lat: number; lng: number; reason: string
}

export default function AddPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<'confirm'>('confirm')
  const [result, setResult] = useState<Result>({
    name: '', country: '韓國', city: '首爾', district: '', neighborhood: '',
    types: [], summary: '', recommendations: [], tags: [], address: '', lat: 0, lng: 0, reason: ''
  })

  async function handleSave() {
    if (!result.name.trim()) return
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...result,
        source_url: url,
        note: result.reason,
        status: 'wishlist'
      })
    })
    if (res.ok) router.push('/')
    else alert('儲存失敗，請再試一次')
  }

  const setR = (k: string, v: unknown) => setResult(r => ({ ...r, [k]: v }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 12, padding: 0 }}>← 返回</button>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>新增收藏</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: '24px 24px 40px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 20, marginBottom: 20 }}>

          <Field label="地點名稱 *">
            <input value={result.name} onChange={e => setR('name', e.target.value)}
              placeholder="例：麵首爾 Myeon Seoul" style={inputStyle} />
          </Field>

          <Field label="收藏原因">
            <input value={result.reason} onChange={e => setR('reason', e.target.value)}
              placeholder="例：金度潤開的 / 朋友推薦 / 七月要去"
              style={inputStyle} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {(['country','city','neighborhood'] as const).map(k => (
              <div key={k} style={{ flex: 1 }}>
                <Label>{{ country:'國家', city:'城市', neighborhood:'商圈' }[k]}</Label>
                <input value={result[k]} onChange={e => setR(k, e.target.value)}
                  placeholder={{ country:'韓國', city:'首爾', neighborhood:'狎鷗亭' }[k]}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }} />
              </div>
            ))}
          </div>

          <Field label="來源連結（選填）">
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..." style={inputStyle} />
          </Field>

          <Field label="地址（選填）">
            <input value={result.address} onChange={e => setR('address', e.target.value)}
              placeholder="地址" style={inputStyle} />
          </Field>

          <Field label="描述（選填）">
            <textarea value={result.summary} onChange={e => setR('summary', e.target.value)}
              placeholder="簡單描述這個地點..." rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </Field>

          <Field label="推薦品項（選填）">
            <input
              value={result.recommendations.join('、')}
              onChange={e => setR('recommendations', e.target.value.split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean))}
              placeholder="例：水蜜桃、草莓蛋糕（用、分隔）" style={inputStyle} />
          </Field>

          <div>
            <Label>地點類型</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TYPES.map(t => {
                const active = result.types.includes(t)
                return (
                  <button key={t} onClick={() => setR('types', active ? result.types.filter(x => x !== t) : [...result.types, t])}
                    style={{ padding: '5px 12px', border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`, borderRadius: 4, background: active ? 'var(--ink)' : 'none', color: active ? 'white' : 'var(--sub)', fontSize: 11, cursor: 'pointer' }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!result.name.trim()}
          style={{ width: '100%', border: 'none', borderRadius: 8, padding: 15, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', background: result.name.trim() ? 'var(--btn)' : 'var(--line)', color: result.name.trim() ? 'white' : 'var(--dim)', cursor: result.name.trim() ? 'pointer' : 'default' }}>
          儲存
        </button>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><Label>{label}</Label>{children}</div>
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--line)', borderRadius: 6,
  padding: '10px 12px', fontSize: 14, color: 'var(--ink)', outline: 'none',
  background: 'var(--bg)', boxSizing: 'border-box',
}
