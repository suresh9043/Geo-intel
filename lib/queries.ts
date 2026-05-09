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
    competitors: competitorsRes.data?.map(c => ({ name: c.name, url: c.url || "" })) || [],
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
    await supabase.from('prompts').insert(prompts.map(text => ({ company_id: companyId, text, source: 'user', is_active: true })))
  }

  // Sync tracked models
  await supabase.from('tracked_models').delete().eq('company_id', companyId)
  if (selectedModels.length > 0) {
    await supabase.from('tracked_models').insert(
      selectedModels.map(({ provider, model }) => ({ company_id: companyId, provider, model_slug: model, grounding: 'native', is_active: true }))
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
  const [companyRes, competitorsRes, runsRes] = await Promise.all([
    supabase.from('companies').select('name').eq('id', companyId).single(),
    supabase.from('competitors').select('name').eq('company_id', companyId),
    supabase.from('runs').select('id, created_at, completed_at').eq('company_id', companyId).eq('status', 'completed').order('created_at', { ascending: true }),
  ])

  const companyName = companyRes.data?.name || ''
  const competitorNames = competitorsRes.data?.map(c => c.name) || []
  const runs = runsRes.data || []

  if (!runs.length) return []

  const results = await Promise.all(runs.map(async run => {
    const { data: responses } = await supabase
      .from('raw_responses')
      .select('response_text')
      .eq('run_id', run.id)
      .eq('status', 'success')
      .not('response_text', 'is', null)

    const total = responses?.length || 0
    const texts = responses?.map(r => r.response_text?.toLowerCase() || '') || []

    const brandMentions = texts.filter(t => t.includes(companyName.toLowerCase())).length
    const visibility = total > 0 ? Math.round((brandMentions / total) * 100) : 0

    // Competitor visibility per run
    const competitors: Record<string, number> = {}
    competitorNames.forEach(name => {
      const mentions = texts.filter(t => t.includes(name.toLowerCase())).length
      competitors[name] = total > 0 ? Math.round((mentions / total) * 100) : 0
    })

    return {
      runId: run.id,
      date: run.completed_at || run.created_at,
      visibility,
      total,
      competitors,
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
    .select('response_text, requested_model, provider, positions_json')
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

    // Avg position from Haiku-extracted positions_json
    const positions = responses!
      .map(r => r.positions_json?.[entity.name])
      .filter((p): p is number => typeof p === 'number' && p > 0)
    const avgPosition = positions.length > 0
      ? parseFloat((positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1))
      : null

    return { name: entity.name, isOurBrand: entity.isOurBrand, visibility, mentionCount, totalResponses: total, models, avgPosition }
  })

  return rankings
    .sort((a, b) => b.visibility - a.visibility)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export async function getPromptStats(companyId: string) {
  const [companyRes, promptsRes] = await Promise.all([
    supabase.from('companies').select('name').eq('id', companyId).single(),
    supabase.from('prompts').select('id, text').eq('company_id', companyId).eq('is_active', true),
  ])

  const companyName = companyRes.data?.name || ''
  const prompts = promptsRes.data || []
  if (!prompts.length) return []

  const { data: responses } = await supabase
    .from('raw_responses')
    .select('prompt_id, response_text, requested_model, positions_json')
    .eq('company_id', companyId)
    .eq('status', 'success')
    .not('response_text', 'is', null)
    .limit(500)

  return prompts.map(prompt => {
    const pr = (responses || []).filter(r => r.prompt_id === prompt.id)
    const total = pr.length
    const mentioning = pr.filter(r => r.response_text?.toLowerCase().includes(companyName.toLowerCase()))
    const mentionCount = mentioning.length
    const mentionRate = total > 0 ? Math.round((mentionCount / total) * 100) : 0
    const positions = pr.map(r => r.positions_json?.[companyName]).filter((p): p is number => typeof p === 'number' && p > 0)
    const avgPosition = positions.length > 0
      ? parseFloat((positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1))
      : null
    const models = [...new Set(mentioning.map(r => r.requested_model).filter(Boolean))]
    const health: 'Strong' | 'Average' | 'Weak' | 'Dead' =
      mentionRate >= 60 ? 'Strong' : mentionRate >= 30 ? 'Average' : mentionRate >= 10 ? 'Weak' : 'Dead'
    return { id: prompt.id, text: prompt.text, mentionRate, avgPosition, models, totalResponses: total, mentionCount, health }
  }).sort((a, b) => b.mentionRate - a.mentionRate)
}

export async function getPromptResponses(promptId: string, limit = 5) {
  const { data } = await supabase
    .from('raw_responses')
    .select('id, response_text, requested_model, created_at')
    .eq('prompt_id', promptId)
    .eq('status', 'success')
    .not('response_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

function extractCitationCount(rawResponse: any, responseText: string): number {
  if (!rawResponse) return 0
  // Perplexity/Sonar: top-level citations array
  if (Array.isArray(rawResponse.citations)) return rawResponse.citations.length
  // Other models: count URLs in response text
  const urls = responseText?.match(/https?:\/\/[^\s\)\]>]+/g)
  return urls?.length || 0
}

export async function getPromptModelBreakdown(companyId: string, promptId: string) {
  const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single()
  const companyName = company?.name || ''

  const { data: responses } = await supabase
    .from('raw_responses')
    .select('id, response_text, requested_model, positions_json, raw_response, created_at')
    .eq('company_id', companyId)
    .eq('prompt_id', promptId)
    .eq('status', 'success')
    .not('response_text', 'is', null)
    .order('created_at', { ascending: false })

  if (!responses?.length) return []

  // Group all responses by model
  const byModel = new Map<string, any[]>()
  for (const r of responses) {
    if (!byModel.has(r.requested_model)) byModel.set(r.requested_model, [])
    byModel.get(r.requested_model)!.push(r)
  }

  return Array.from(byModel.entries()).map(([model, rows]) => {
    const total = rows.length
    const mentionedRows = rows.filter(r => {
      const pos = r.positions_json?.[companyName]
      return pos !== null && pos !== undefined
    })
    const mentionCount = mentionedRows.length

    // Total citations across all responses for this model
    const citationCount = rows.reduce((sum, r) => sum + extractCitationCount(r.raw_response, r.response_text || ''), 0)

    const latest = rows[0]
    const pos = latest.positions_json?.[companyName]
    const position = (typeof pos === 'number' && pos > 0) ? pos : null
    const isHM = pos === -1
    const preview = latest.response_text?.split('\n').find((l: string) => l.trim().length > 20)?.slice(0, 120) || ''

    return { model, total, mentionCount, citationCount, position, isHM, preview, responseText: latest.response_text, id: latest.id }
  })
}

export async function getCitationStats(companyId: string) {
  const { data: company } = await supabase
    .from('companies')
    .select('name, url')
    .eq('id', companyId)
    .single()

  let companyDomain = ''
  try {
    const raw = company?.url || ''
    companyDomain = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace('www.', '')
  } catch {}

  const { data: responses } = await supabase
    .from('raw_responses')
    .select('raw_response, response_text, requested_model')
    .eq('company_id', companyId)
    .eq('status', 'success')
    .not('response_text', 'is', null)
    .limit(500)

  if (!responses?.length) return { domains: [], companyDomain, totalCitations: 0, ownCitations: 0 }

  const domainMap = new Map<string, { count: number; models: Set<string> }>()

  for (const r of responses) {
    const urls: string[] = []
    // Perplexity: citations array in raw_response
    if (Array.isArray(r.raw_response?.citations)) {
      urls.push(...r.raw_response.citations)
    } else {
      // Other models: extract URLs from response text
      const matches = r.response_text?.match(/https?:\/\/[^\s\)\]>,"']+/g) || []
      urls.push(...matches)
    }

    for (const url of urls) {
      try {
        const domain = new URL(url).hostname.replace('www.', '')
        if (!domain || domain.length < 4) continue
        if (!domainMap.has(domain)) domainMap.set(domain, { count: 0, models: new Set() })
        const entry = domainMap.get(domain)!
        entry.count++
        entry.models.add(r.requested_model)
      } catch {}
    }
  }

  const domains = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      count: data.count,
      models: Array.from(data.models),
      isOwn: companyDomain ? (domain.includes(companyDomain) || companyDomain.includes(domain)) : false,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const totalCitations = Array.from(domainMap.values()).reduce((s, d) => s + d.count, 0)
  const ownCitations = domains.find(d => d.isOwn)?.count || 0

  return { domains, companyDomain, totalCitations, ownCitations }
}

export async function saveAnalysisResult(userId: string, url: string, analysis: any) {
  const { supabase } = await import("./supabase")
  await supabase.from("analysis_cache").upsert({
    user_id: userId,
    url,
    analysis,
    analysed_at: new Date().toISOString(),
  }, { onConflict: "user_id,url" })
}

export async function getAnalysisHistory(userId: string, limit = 10) {
  const { supabase } = await import("./supabase")
  const { data } = await supabase
    .from("analysis_cache")
    .select("url, analysis, analysed_at")
    .eq("user_id", userId)
    .order("analysed_at", { ascending: false })
    .limit(limit)
  return data || []
}

export async function getCachedAnalysis(userId: string, url: string) {
  const { supabase } = await import("./supabase")
  const { data } = await supabase
    .from("analysis_cache")
    .select("analysis, analysed_at")
    .eq("user_id", userId)
    .eq("url", url)
    .single()
  return data
}
