import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const db = getServiceClient()

  try {
    const { userId, name, url, description, industry, icpDescription, competitors, prompts, selectedModels } = await req.json()

    if (!userId || !name || !url) {
      return NextResponse.json({ error: 'userId, name and url are required' }, { status: 400 })
    }

    // Upsert company
    const { data: existing } = await db
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .eq('url', url)
      .maybeSingle()

    let companyId: string

    if (existing) {
      const { data, error } = await db
        .from('companies')
        .update({ name, description, industry, icp_description: icpDescription, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error) throw new Error(`Company update failed: ${error.message}`)
      companyId = data.id
    } else {
      const { data, error } = await db
        .from('companies')
        .insert({ user_id: userId, name, url, description, industry, icp_description: icpDescription, status: 'active' })
        .select('id')
        .single()
      if (error) throw new Error(`Company insert failed: ${error.message}`)
      companyId = data.id
    }

    // Sync competitors
    await db.from('competitors').delete().eq('company_id', companyId)
    if (competitors?.length > 0) {
      const { error } = await db.from('competitors').insert(competitors.map((n: string) => ({ company_id: companyId, name: n })))
      if (error) throw new Error(`Competitors insert failed: ${error.message}`)
    }

    // Sync prompts
    await db.from('prompts').delete().eq('company_id', companyId)
    if (prompts?.length > 0) {
      const { error } = await db.from('prompts').insert(prompts.map((text: string) => ({ company_id: companyId, text, source: 'user', is_active: true })))
      if (error) throw new Error(`Prompts insert failed: ${error.message}`)
    }

    // Sync tracked models
    await db.from('tracked_models').delete().eq('company_id', companyId)
    if (selectedModels?.length > 0) {
      const { error } = await db.from('tracked_models').insert(
        selectedModels.map(({ provider, model }: { provider: string; model: string }) => ({
          company_id: companyId, provider, model_slug: model, grounding: 'native', is_active: true
        }))
      )
      if (error) throw new Error(`Models insert failed: ${error.message}`)
    }

    return NextResponse.json({ companyId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
