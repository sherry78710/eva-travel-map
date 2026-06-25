'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Place, STATUS } from '@/lib/supabase'

const lineOpacity = (s: string) => s === 'favorite' ? 1 : s === 'visited' ? 0.35 : 0.12

export default function SearchPage() {
  const router = useRouter()
  const [places, setPlaces] = useState<Place[]>([])
  const [q, setQ] = useState('')
  const [fCountry, setFC] = useState('')
  const [fType, setFT] = useState('')
  const [fStatus, setFS] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (fCountry) params.set('country', fCountry)
    if (fType) params.set('type', fType)
    if (fStatus) params.set('status', fStatus)
    fetch(`/api/places?${params}`).then(r => r.json()).then(data => {
      setPlaces(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [q, fCountry, fType, fStatus])

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      whiteSpace: 'nowrap', padding: '6px 14px',
      border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
      borderRadius: 20, background: active ? 'var(--ink)' : 'none',
      color: active ? 'white' : 'var(--sub)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em'
    }}>{label}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 24px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 12, padding: 0, flexShrink: 0 }}>← 返回</button>
          <div style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 8, background: 'var(--bg)' }}>
            <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="搜尋地點、食物、商圈..."
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14, color: 'var(--ink)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14 }}>
          {['韓國','日本','台灣'].map(c => pill(c, fCountry===c, () => setFC(fCountry===c?'':c)))}
          {['咖啡廳','餐廳','景點','市場'].map(t => pill(t, fType===t, () => setFT(fType===t?'':t)))}
          {Object.entries(STATUS).map(([k, s]) => pill(s.label, fStatus===k, () => setFS(fStatus===k?'':k)))}
        </div>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{loading ? '搜尋中...' : `${places.length} 個地點`}</div>
        {!loading && places.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)', fontSize: 14 }}>沒有符合的結果</div>
        )}
        {places.map(p => (
          <Link key={p.id} href={`/place/${p.id}`} style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
            <div style={{ width: 1, background: 'var(--ink)', opacity: lineOpacity(p.status), alignSelf: 'stretch', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--sub)' }}>{STATUS[p.status].mark} {STATUS[p.status].label}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>{p.country} · {p.city} · {p.neighborhood}</div>
              <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{p.types?.join('・')}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
