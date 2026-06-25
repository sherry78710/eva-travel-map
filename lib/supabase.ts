import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Place = {
  id: string
  name: string
  country: string
  city: string
  district: string
  neighborhood: string
  types: string[]
  status: 'wishlist' | 'visited' | 'favorite'
  summary: string
  recommendations: string[]
  tags: string[]
  address: string
  lat: number
  lng: number
  source_url: string
  note: string
  created_at: string
}

export type CountryNote = {
  id: string
  country: string
  category: string
  content: string
  created_at: string
}

export const STATUS = {
  wishlist: { label: '想去',  mark: '○' },
  visited:  { label: '去過',  mark: '●' },
  favorite: { label: '最愛',  mark: '◆' },
} as const
