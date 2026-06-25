'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Place, STATUS } from '@/lib/supabase'

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/places').then(r => r.json()).then(data => {
      setPlaces(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const byCountry: Record<string, number> = {}
  places.forEach(p => { byCountry[p.country] = (byCountry[p.country] || 0) + 1 })

  const recent = places.slice(0, 4)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '20px 24px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 10, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Eva 的旅遊收藏
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {Object.entries(byCountry).map(([c, n]) => (
            <div key={c}>
              <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 2 }}>{c}</div>
            </div>
          ))}
          {places.length === 0 && !loading && (
            <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--dim)', lineHeight: 1 }}>0</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {[
          { label: '新增收藏', href: '/add', primary: true },
          { label: '地圖',     href: '/map' },
          { label: '搜尋',     href: '/search' },
          { label: '備忘錄',   href: '/country' },
        ].map(btn => (
          <Link key={btn.href} href={btn.href} style={{
            flex: 1, padding: '16px 0', borderRight: '1px solid var(--line)',
            background: btn.primary ? 'var(--btn)' : 'var(--surface)',
            color: btn.primary ? 'white' : 'var(--ink)',
            fontSize: 12, fontWeight: btn.primary ? 700 : 500,
            cursor: 'pointer', letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {btn.label}
          </Link>
        ))}
      </div>

      {/* Status summary */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        {Object.entries(STATUS).map(([key, s]) => {
          const n = places.filter(p => p.status === key).length
          return (
            <div key={key} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: '1px solid var(--line)' }}>
              <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ink)' }}>{n}</div>
              <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 2 }}>{s.mark} {s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ fontSize: 10, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 0 4px' }}>
          最近收藏
        </div>
        {loading && <div style={{ color: 'var(--dim)', fontSize: 14, padding: '20px 0' }}>載入中...</div>}
        {!loading && recent.length === 0 && (
          <div style={{ color: 'var(--dim)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
            還沒有收藏，點「新增收藏」開始吧
          </div>
        )}
        {recent.map(p => <PlaceRow key={p.id} place={p} />)}
      </div>
    </div>
  )
}

function PlaceRow({ place }: { place: Place }) {
  const st = STATUS[place.status]
  const lineOpacity = place.status === 'favorite' ? 1 : place.status === 'visited' ? 0.35 : 0.12

  return (
    <Link href={`/place/${place.id}`} style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
      <div style={{ width: 1, background: 'var(--ink)', opacity: lineOpacity, alignSelf: 'stretch', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{place.name}</div>
          <div style={{ fontSize: 10, color: 'var(--sub)', marginLeft: 12, flexShrink: 0 }}>{st.mark} {st.label}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>
          {place.country} · {place.city} · {place.neighborhood}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sub)' }}>
          {place.types?.join('・')}
          {place.recommendations?.length > 0 && (
            <span style={{ color: 'var(--dim)' }}>&ensp;/&ensp;{place.recommendations.slice(0, 2).join('、')}</span>
          )}
        </div>
        {place.note && (
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, fontStyle: 'italic' }}>{place.note}</div>
        )}
      </div>
    </Link>
  )
}
