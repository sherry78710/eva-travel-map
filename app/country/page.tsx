'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CountryNote } from '@/lib/supabase'

const CATEGORIES = ['入境', '交通', '退稅', '禮儀', '緊急聯絡', '其他']
const COUNTRIES = ['韓國', '日本', '台灣']

export default function CountryPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<CountryNote[]>([])
  const [country, setCountry] = useState('韓國')
  const [newCategory, setNewCat] = useState('入境')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [customCountry, setCustomCountry] = useState('')

  useEffect(() => {
    fetch(`/api/country-notes?country=${country}`).then(r => r.json()).then(data => {
      setNotes(Array.isArray(data) ? data : [])
    })
  }, [country])

  async function handleAdd() {
    if (!newContent.trim()) return
    const res = await fetch('/api/country-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, category: newCategory, content: newContent.trim() })
    })
    const data = await res.json()
    setNotes(n => [...n, data])
    setNewContent('')
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/country-notes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotes(n => n.filter(x => x.id !== id))
  }

  const grouped: Record<string, CountryNote[]> = {}
  notes.forEach(n => { if (!grouped[n.category]) grouped[n.category] = []; grouped[n.category].push(n) })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', fontSize: 12, padding: 0 }}>← 返回</button>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>國家備忘錄</div>
        <button onClick={() => setAdding(!adding)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 18, padding: 0 }}>+</button>
      </div>

      {/* Country tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
        {COUNTRIES.map(c => (
          <button key={c} onClick={() => setCountry(c)} style={{
            padding: '12px 20px', border: 'none', background: 'none',
            borderBottom: country === c ? '2px solid var(--ink)' : '2px solid transparent',
            color: country === c ? 'var(--ink)' : 'var(--sub)',
            fontSize: 13, fontWeight: country === c ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{c}</button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: 'var(--surface)', padding: '16px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ marginBottom: 10 }}>
            <Label>分類</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setNewCat(c)} style={{
                  padding: '5px 12px', border: `1px solid ${newCategory === c ? 'var(--ink)' : 'var(--line)'}`,
                  borderRadius: 4, background: newCategory === c ? 'var(--ink)' : 'none',
                  color: newCategory === c ? 'white' : 'var(--sub)', fontSize: 11, cursor: 'pointer'
                }}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Label>內容</Label>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder={`例：${country === '韓國' ? 'T-money 卡在便利商店購買，可搭地鐵和公車' : country === '日本' ? '退稅需出示護照，消費滿 5000 日圓以上' : '悠遊卡可在各捷運站購買'}`}
              rows={3}
              style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', background: 'var(--bg)', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 6, background: 'none', color: 'var(--sub)', fontSize: 12, cursor: 'pointer' }}>取消</button>
            <button onClick={handleAdd} disabled={!newContent.trim()} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 6, background: newContent.trim() ? 'var(--btn)' : 'var(--line)', color: newContent.trim() ? 'white' : 'var(--dim)', fontSize: 12, fontWeight: 600, cursor: newContent.trim() ? 'pointer' : 'default' }}>儲存</button>
          </div>
        </div>
      )}

      {/* Notes by category */}
      <div style={{ padding: '0 24px' }}>
        {notes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)', fontSize: 14 }}>
            還沒有 {country} 的備忘錄<br />
            <span style={{ fontSize: 12 }}>點右上角 + 新增</span>
          </div>
        )}
        {Object.entries(grouped).map(([cat, catNotes]) => (
          <div key={cat}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '18px 0 4px' }}>{cat}</div>
            {catNotes.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <div style={{ width: 1, background: 'var(--ink)', opacity: 0.2, alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{n.content}</div>
                <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 16, padding: '0 0 0 8px', flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>
}
