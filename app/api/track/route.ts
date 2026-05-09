import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MODEL_SLUGS: Record<string, string> = {
  'GPT-5.3': 'openai/gpt-5.3-chat',
  'GPT-5.5': 'openai/gpt-5.5',
  'Claude Sonnet 4.6': 'anthropic/claude-sonnet-4.6',
  'Claude Opus 4.6': 'anthropic/claude-opus-4.6-fast',
  'Claude Haiku 4.5': 'anthropic/claude-haiku-4.5',
  'Sonar': 'perplexity/sonar',
  'Gemini 3 Flash': 'google/gemini-3.1-flash-lite',
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Models that support OpenRouter's web search plugin
const WEB_PLUGIN_MODELS = ['perplexity/sonar', 'openai/gpt-5.3-chat', 'openai/gpt-5.5', 'anthropic/claude-sonnet-4.6', 'anthropic/claude-opus-4.6-fast', 'anthropic/claude-haiku-4.5']

async function queryOpenRouter(prompt: string, modelSlug: string) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://geointel.app',
        'X-Title': 'GeoIntel',
      },
      body: JSON.stringify({
        model: modelSlug,
        messages: [{ role: 'user', content: prompt }],
        ...(WEB_PLUGIN_MODELS.includes(modelSlug) ? { plugins: [{ id: 'web', max_results: 5 }] } : {}),
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err?.error?.message || `HTTP ${res.status}`, latencyMs }
    }

    const data = await res.json()
    return {
      ok: true,
      text: data.choices[0]?.message?.content || '',
      resolvedModel: data.model,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      latencyMs,
      raw: data,
    }
  } catch (err: any) {
    clearTimeout(timeout)
    return { ok: false, error: err.message, latencyMs: Date.now() - start }
  }
}

export async function POST(req: NextRequest) {
  const db = getServiceClient()

  try {
    const { companyId } = await req.json()
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })
    console.log('[track] starting for company:', companyId)

    // Fetch prompts and models
    const [{ data: prompts, error: pe }, { data: models, error: me }] = await Promise.all([
      db.from('prompts').select('id, text').eq('company_id', companyId).eq('is_active', true),
      db.from('tracked_models').select('id, provider, model_slug').eq('company_id', companyId).eq('is_active', true),
    ])

    console.log('[track] prompts:', prompts?.length, 'models:', models?.map(m => m.model_slug))
    if (pe) return NextResponse.json({ error: pe.message }, { status: 500 })
    if (me) return NextResponse.json({ error: me.message }, { status: 500 })
    if (!prompts?.length || !models?.length) {
      console.log('[track] no prompts or models — aborting')
      return NextResponse.json({ error: 'No prompts or models configured' }, { status: 400 })
    }

    // Create run
    const { data: run, error: re } = await db.from('runs').insert({ company_id: companyId, status: 'in_progress', started_at: new Date().toISOString() }).select('id').single()
    if (re) return NextResponse.json({ error: re.message }, { status: 500 })
    const runId = run.id

    // Build task queue
    const tasks = prompts.flatMap(prompt => models!.map(model => ({ prompt, model })))

    // Process with concurrency limit of 5
    const CONCURRENCY = 5
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      const chunk = tasks.slice(i, i + CONCURRENCY)
      await Promise.all(chunk.map(async ({ prompt, model }) => {
        const slug = MODEL_SLUGS[model.model_slug] || model.model_slug
        const result = await queryOpenRouter(prompt.text, slug)
        console.log(`[track] ${model.model_slug} → ${slug}: ${result.ok ? 'ok' : (result as any).error}`)

        await db.from('raw_responses').insert({
          run_id: runId,
          company_id: companyId,
          prompt_id: prompt.id,
          tracked_model_id: model.id,
          provider: model.provider,
          requested_model: model.model_slug,
          resolved_model: result.ok ? (result as any).resolvedModel : model.model_slug,
          response_text: result.ok ? (result as any).text : `Error: ${(result as any).error}`,
          raw_response: result.ok ? (result as any).raw : { error: (result as any).error },
          status: result.ok ? 'success' : 'error',
          input_tokens: result.ok ? (result as any).inputTokens : 0,
          output_tokens: result.ok ? (result as any).outputTokens : 0,
          latency_ms: (result as any).latencyMs || 0,
        })
      }))
    }

    // Mark run complete
    await db.from('runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', runId)

    // Extract brand positions from responses using Haiku (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(req.url).origin : 'http://localhost:3000'}/api/extract-positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, companyId }),
    }).catch(() => {})

    return NextResponse.json({ success: true, runId })

  } catch (err: any) {
    console.error('Track error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
