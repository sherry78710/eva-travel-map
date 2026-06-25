'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Place, STATUS } from '@/lib/supabase'

export default function PlacePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [place, setPlace] = useState<Place | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/places').then(r => r.json()).then((data: Place[]) => {
      const p = data.find(x => x.id === params.id)
      if (p) { setPlace(p); setNote(p.note || '') }
    })
  }, [params.id])

  async function updateStatus(status: string) {
    if (!place) return
    setPlace({ ...place, status: status as Place['status'] })
    await fetch(`/api/places/${place.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  async function saveNote() {
    if (!place) return
    setSaving(true)
    await fetch(`/api/places/${place.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!place || !confirm('確定要刪除這筆收藏嗎？')) return
    setDeleting(true)
    await fetch(`/api/places/${place.id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (!place) return (
    <div style={{ padding: 24, color: 'var(--dim)', fontSize: 14 }}>載入中...</div>
  )

  const query = encodeURIComponent(place.name + ' ' + (place.address || ''))
  const googleMapsUrl = `https://maps.google.com/?q=${query}`
  const naverMapsUrl = `https://map.naver.com/v5/search/${query}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 12, padding: 0 }}>← 返回</button>
        <button onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 11, padding: 0 }}>
          {deleting ? '刪除中...' : '刪除'}
        </button>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{place.name}</div>
          <div style={{ fontSize: 12, color: 'var(--sub)' }}>
            {[place.country, place.city, place.district, place.neighborhood].filter(Boolean).join(' · ')}
          </div>
        </div>

        <Divider />

        {/* Status */}
        <div style={{ display: 'flex', margin: '20px 0' }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <button key={key} onClick={() => updateStatus(key)} style={{
              flex: 1, padding: '10px 0', border: 'none',
              borderBottom: place.status === key ? '2px solid var(--ink)' : '2px solid var(--line)',
              background: 'none', cursor: 'pointer',
              color: place.status === key ? 'var(--ink)' : 'var(--dim)',
              fontSize: 12, fontWeight: place.status === key ? 700 : 400,
              transition: 'all 0.15s ease',
            }}>{s.mark}&ensp;{s.label}</button>
          ))}
        </div>

        <Divider />

        {/* Types */}
        {place.types?.length > 0 && (
          <>
            <div style={{ padding: '16px 0' }}>
              <Label>類型</Label>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{place.types.join('・')}</div>
            </div>
            <Divider />
          </>
        )}

        {/* Summary */}
        {place.summary && (
          <>
            <div style={{ padding: '20px 0' }}>
              <Label>描述</Label>
              <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7 }}>{place.summary}</div>
            </div>
            <Divider />
          </>
        )}

        {/* Recommendations */}
        {place.recommendations?.length > 0 && (
          <>
            <div style={{ padding: '20px 0' }}>
              <Label>推薦品項</Label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {place.recommendations.map(r => (
                  <span key={r} style={{ fontSize: 12, color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 4, padding: '4px 10px' }}>{r}</span>
                ))}
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Address */}
        {place.address && (
          <>
            <div style={{ padding: '20px 0' }}>
              <Label>地址</Label>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{place.address}</div>
            </div>
            <Divider />
          </>
        )}

        {/* Note */}
        <div style={{ padding: '20px 0' }}>
          <Label>收藏原因 / 備註</Label>
          <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
            placeholder="金度潤開的 / 朋友推薦 / 七月要去..."
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', background: 'var(--bg)', minHeight: 72, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
            {saving ? '儲存中...' : '離開欄位自動儲存'}
          </div>
        </div>

        <Divider />

        {/* Source */}
        {place.source_url && (
          <>
            <div style={{ padding: '16px 0' }}>
              <Label>來源連結</Label>
              <a href={place.source_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: 'var(--sub)', wordBreak: 'break-all' }}>
                {place.source_url}
              </a>
            </div>
            <Divider />
          </>
        )}

        {/* Navigation buttons */}
        <div style={{ paddingTop: 20, display: 'flex', gap: 10 }}>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, background: 'var(--btn)', color: 'white', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Google Maps
          </a>
          <a href={naverMapsUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, background: 'none', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Naver Maps
          </a>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--line)' }} />
}
