import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  // Admin auth
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', claims.sub)
    .single()

  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const editorId = searchParams.get('editorId')
  if (!editorId) return NextResponse.json({ error: 'editorId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_articles')
    .select('id, url, title, snippet, published_date, topic_match_score, topic_keywords')
    .eq('editor_id', editorId)
    .order('topic_match_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data ?? [] })
}
