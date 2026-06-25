'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Place, STATUS } from '@/lib/supabase'

export default function MapPage() {
  const router = useRouter()
  const [places, setPlaces] = useState<Place[]>([])
  const [drill, setDrill] = useState<string | null>(null)
  const [view, setView] = useState<'cluster'|'list'>('cluster')

  useEffect(() => {
    fetch('/api/places').then(r => r.json()).then(data => setPlaces(Array.isArray(data) ? data : []))
  }, [])

  const byCountry: Record<string, Place[]> = {}
  places.forEach(p => { if (!byCountry[p.country]) byCountry[p.country] = []; byCountry[p.country].push(p) })

  const drillPlaces = drill ? places.filter(p => p.neighborhood === drill) : []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={drill ? () => setDrill(null) : () => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 12, padding: 0 }}>
          ← {drill ? '全覽' : '返回'}
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {drill || '我的地圖'}
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
          {(['cluster','list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', border: 'none', background: view===v ? 'var(--ink)' : 'none', color: view===v ? 'white' : 'var(--sub)', fontSize: 11, cursor: 'pointer' }}>
              {v === 'cluster' ? '商圈' : '列表'}
            </button>
          ))}
        </div>
      </div>

      {/* Drill into neighborhood */}
      {drill && (
        <div style={{ padding: '0 24px' }}>
          <div style={{ fontSize: 10, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 0 4px' }}>
            {drillPlaces.length} 個地點
          </div>
          {drillPlaces.map(p => (
            <Link key={p.id} href={`/place/${p.id}`} style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
              <div style={{ width: 1, background: 'var(--ink)', opacity: p.status==='favorite'?1:p.status==='visited'?0.35:0.12, alignSelf: 'stretch', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--sub)' }}>{STATUS[p.status].mark} {STATUS[p.status].label}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--sub)' }}>{p.types?.join('・')}</div>
                {p.recommendations?.length > 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{p.recommendations.slice(0,2).join('、')}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Country / neighborhood overview */}
      {!drill && view === 'cluster' && (
        <div>
          {/* Country bar */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
            {Object.entries(byCountry).map(([c, ps]) => (
              <div key={c} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: '1px solid var(--line)' }}>
                <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ink)' }}>{ps.length}</div>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 2 }}>{c}</div>
              </div>
            ))}
          </div>

          {/* Neighborhood grid */}
          {Object.entries(byCountry).map(([country, cps]) => {
            const nbs: Record<string, Place[]> = {}
            cps.forEach(p => { if (!nbs[p.neighborhood]) nbs[p.neighborhood] = []; nbs[p.neighborhood].push(p) })
            return (
              <div key={country}>
                <div style={{ padding: '18px 24px 10px', fontSize: 10, fontWeight: 700, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {country}
                </div>
                <div style={{ padding: '0 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(nbs).map(([nb, nbps]) => {
                    const favCount = nbps.filter(p => p.status === 'favorite').length
                    const visitedCount = nbps.filter(p => p.status === 'visited').length
                    return (
                      <button key={nb} onClick={() => setDrill(nb)} style={{
                        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8,
                        padding: '14px 16px', textAlign: 'left', cursor: 'pointer', position: 'relative', overflow: 'hidden'
                      }}>
                        {favCount > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--ink)' }} />}
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{nb || '未分類'}</div>
                        <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ink)', lineHeight: 1, marginBottom: 6 }}>{nbps.length}</div>
                        <div style={{ fontSize: 10, color: 'var(--sub)' }}>
                          {visitedCount > 0 && `去過 ${visitedCount}  `}
                          {favCount > 0 && `最愛 ${favCount}`}
                          {visitedCount === 0 && favCount === 0 && '待探索'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {!drill && view === 'list' && (
        <div style={{ padding: '0 24px' }}>
          {places.map(p => (
            <Link key={p.id} href={`/place/${p.id}`} style={{ display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
              <div style={{ width: 1, background: 'var(--ink)', opacity: p.status==='favorite'?1:p.status==='visited'?0.35:0.12, alignSelf: 'stretch', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--sub)' }}>{STATUS[p.status].mark} {STATUS[p.status].label}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--sub)' }}>{p.country} · {p.city} · {p.neighborhood}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
