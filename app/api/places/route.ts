import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const country = searchParams.get('country') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''

  let query = supabase.from('places').select('*').order('created_at', { ascending: false })

  if (country) query = query.eq('country', country)
  if (status) query = query.eq('status', status)
  if (type) query = query.contains('types', [type])
  if (q) query = query.or(
    `name.ilike.%${q}%,summary.ilike.%${q}%,note.ilike.%${q}%,neighborhood.ilike.%${q}%,city.ilike.%${q}%`
  )

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('places').insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
