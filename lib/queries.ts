import { supabase } from './supabase'

// ─── Company ──────────────────────────────────────────────────────────────────

export async function getCompanies(userId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, url, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getCompanyWithDetails(companyId: string) {
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()
  if (error) throw error

  const [competitorsRes, promptsRes, modelsRes] = await Promise.all([
    supabase.from('competitors').select('name').eq('company_id', companyId),
    supabase.from('prompts').select('id, text').eq('company_id', companyId).eq('is_active', true),
    supabase.from('tracked_models').select('id, provider, model_slug').eq('company_id', companyId).eq('is_active', true),
  ])

  return {
    ...company,
    competitors: competitorsRes.data?.map(c => c.name) || [],
    prompts: promptsRes.data || [],
    trackedModels: modelsRes.data || [],
  }
}

export async function deleteCompany(companyId: string) {
  const { error } = await supabase.from('companies').delete().eq('id', companyId)
  if (error) throw error
}

export async function saveCompany(userId: string, payload: {
  name: string
  url: string
  description: string
  industry: string
  icpDescription: string
  competitors: string[]
  prompts: string[]
  selectedModels: { provider: string; model: string }[]
}) {
  const { name, url, description, industry, icpDescription, competitors, prompts, selectedModels } = payload

  // Upsert company — find existing by user_id + url
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle()

  let companyId: string

  if (existing) {
    const { data, error } = await supabase
      .from('companies')
      .update({ name, description, industry, icp_description: icpDescription, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    companyId = data.id
  } else {
    const { data, error } = await supabase
      .from('companies')
      .insert({ user_id: userId, name, url, description, industry, icp_description: icpDescription, status: 'active' })
      .select('id')
      .single()
    if (error) throw error
    companyId = data.id
  }

  // Sync competitors
  await supabase.from('competitors').delete().eq('company_id', companyId)
  if (competitors.length > 0) {
    await supabase.from('competitors').insert(competitors.map(name => ({ company_id: companyId, name })))
  }

  // Sync prompts
  await supabase.from('prompts').delete().eq('company_id', companyId)
  if (prompts.length > 0) {
    await supabase.from('prompts').insert(prompts.map(text => ({ company_id: companyId, text, source: 'user' })))
  }

  // Sync tracked models
  await supabase.from('tracked_models').delete().eq('company_id', companyId)
  if (selectedModels.length > 0) {
    await supabase.from('tracked_models').insert(
      selectedModels.map(({ provider, model }) => ({ company_id: companyId, provider, model_slug: model, grounding: 'native' }))
    )
  }

  return companyId
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function createRun(companyId: string) {
  const { data, error } = await supabase
    .from('runs')
    .insert({ company_id: companyId, status: 'pending' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function updateRunStatus(runId: string, status: string) {
  const updates: any = { status }
  if (status === 'in_progress') updates.started_at = new Date().toISOString()
  if (status === 'completed' || status === 'failed') updates.completed_at = new Date().toISOString()
  await supabase.from('runs').update(updates).eq('id', runId)
}

export async function getLatestRun(companyId: string) {
  const { data } = await supabase
    .from('runs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ─── Raw Responses ────────────────────────────────────────────────────────────

export async function saveResponse(response: {
  runId: string
  companyId: string
  promptId: string
  trackedModelId: string
  provider: string
  requestedModel: string
  resolvedModel: string
  responseText: string
  rawResponse: any
  status: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}) {
  await supabase.from('raw_responses').insert({
    run_id: response.runId,
    company_id: response.companyId,
    prompt_id: response.promptId,
    tracked_model_id: response.trackedModelId,
    provider: response.provider,
    requested_model: response.requestedModel,
    resolved_model: response.resolvedModel,
    response_text: response.responseText,
    raw_response: response.rawResponse,
    status: response.status,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
    latency_ms: response.latencyMs,
  })
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getVisibilityPerRun(companyId: string) {
  // Get company name for matching
  const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
  const companyName = company?.name || ''

  // Get all completed runs ordered by date
  const { data: runs } = await supabase
    .from('runs')
    .select('id, created_at, completed_at')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .order('created_at', { ascending: true })

  if (!runs?.length) return []

  // For each run, count visibility
  const results = await Promise.all(runs.map(async run => {
    const { data: responses } = await supabase
      .from('raw_responses')
      .select('response_text')
      .eq('run_id', run.id)
      .eq('status', 'success')
      .not('response_text', 'is', null)

    const total = responses?.length || 0
    const mentions = responses?.filter(r => r.response_text?.toLowerCase().includes(companyName.toLowerCase())).length || 0
    const visibility = total > 0 ? Math.round((mentions / total) * 100) : 0

    return {
      runId: run.id,
      date: run.completed_at || run.created_at,
      visibility,
      total,
    }
  }))

  return results
}

export async function getDashboardStats(companyId: string, days = 30, model = 'all') {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Get company name and competitors
  const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
  const { data: competitors } = await supabase.from('competitors').select('name').eq('company_id', companyId)
  const companyName = company?.name || ''
  const competitorNames = competitors?.map(c => c.name) || []

  // Get all successful responses in period, optionally filtered by model
  let query = supabase
    .from('raw_responses')
    .select('response_text, requested_model, provider, created_at')
    .eq('company_id', companyId)
    .eq('status', 'success')
    .gte('created_at', since)
    .not('response_text', 'is', null)

  if (model && model !== 'all') query = query.eq('requested_model', model)

  const { data: responses } = await query

  const total = responses?.length || 0
  if (total === 0) return { visibility: 0, rank: null, mentionCount: 0, totalResponses: 0, shareOfVoice: [], availableModels: [], lastRunAt: null }

  // Count brand mentions
  const mentionCount = responses!.filter(r => r.response_text?.toLowerCase().includes(companyName.toLowerCase())).length
  const visibility = Math.round((mentionCount / total) * 100)

  // Share of voice — brand + competitors
  const allEntities = [{ name: companyName, isOurBrand: true }, ...competitorNames.map(n => ({ name: n, isOurBrand: false }))]
  const shareOfVoice = allEntities.map(entity => ({
    name: entity.name,
    isOurBrand: entity.isOurBrand,
    visibility: total > 0 ? Math.round((responses!.filter(r => r.response_text?.toLowerCase().includes(entity.name.toLowerCase())).length / total) * 100) : 0,
  })).sort((a, b) => b.visibility - a.visibility)

  // Our rank
  const rank = shareOfVoice.findIndex(e => e.isOurBrand) + 1

  // Available models
  const { data: models } = await supabase.from('tracked_models').select('model_slug').eq('company_id', companyId)
  const availableModels = models?.map(m => m.model_slug) || []

  // Last run
  const { data: lastRun } = await supabase.from('runs').select('completed_at').eq('company_id', companyId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle()

  return { visibility, rank, mentionCount, totalResponses: total, shareOfVoice, availableModels, lastRunAt: lastRun?.completed_at || null }
}

export async function getResponses(companyId: string, limit = 20) {
  const { data, error } = await supabase
    .from('raw_responses')
    .select(`
      id, response_text, requested_model, provider, status, created_at, latency_ms,
      prompts ( text )
    `)
    .eq('company_id', companyId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getRankings(companyId: string) {
  const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
  const { data: competitors } = await supabase.from('competitors').select('name').eq('company_id', companyId)
  const companyName = company?.name || ''
  const competitorNames = competitors?.map(c => c.name) || []

  const { data: responses } = await supabase
    .from('raw_responses')
    .select('response_text, requested_model, provider')
    .eq('company_id', companyId)
    .eq('status', 'success')
    .not('response_text', 'is', null)
    .limit(200)

  const total = responses?.length || 0
  if (total === 0) return []

  const allEntities = [{ name: companyName, isOurBrand: true }, ...competitorNames.map(n => ({ name: n, isOurBrand: false }))]

  const rankings = allEntities.map(entity => {
    const mentioning = responses!.filter(r => r.response_text?.toLowerCase().includes(entity.name.toLowerCase()))
    const mentionCount = mentioning.length
    const visibility = Math.round((mentionCount / total) * 100)
    const models = [...new Set(mentioning.map(r => r.requested_model))]

    // Basic sentiment
    let positive = 0, negative = 0
    mentioning.forEach(r => {
      const idx = r.response_text!.toLowerCase().indexOf(entity.name.toLowerCase())
      const ctx = r.response_text!.toLowerCase().substring(Math.max(0, idx - 100), idx + 200)
      if (/recommend|best|top|leading|excellent|great|popular/.test(ctx)) positive++
      if (/not recommend|avoid|poor|bad|worst/.test(ctx)) negative++
    })
    const sentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'

    return { name: entity.name, isOurBrand: entity.isOurBrand, visibility, mentionCount, totalResponses: total, models, sentiment, avgPosition: null }
  })

  return rankings
    .sort((a, b) => b.visibility - a.visibility)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}
