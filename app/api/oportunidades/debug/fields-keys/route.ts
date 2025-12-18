import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue }

function safeParseJson(value: unknown): JsonValue | null {
  if (!value) return null
  try {
    if (typeof value === 'string') return JSON.parse(value) as JsonValue
    return value as JsonValue
  } catch {
    return null
  }
}

function collectKeys(
  value: JsonValue,
  counts: Map<string, number>,
  prefix: string = '',
  depth: number = 0
) {
  if (value === null) return
  if (depth > 6) return

  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, counts, prefix, depth + 1)
    return
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const keyPath = prefix ? `${prefix}.${k}` : k
      counts.set(keyPath, (counts.get(keyPath) || 0) + 1)
      collectKeys(v, counts, keyPath, depth + 1)
    }
  }
}

export async function GET(request: Request) {
  // Endpoint de diagnóstico: não expor em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || '').trim().toLowerCase()
    const limitRaw = Number(searchParams.get('limit') || 50)
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50

    const where: string[] = [
      'o.archived = 0',
      '(o.fields IS NOT NULL OR o.conf_installment IS NOT NULL)'
    ]
    const params: any[] = []

    if (status === 'lost' || status === 'gain' || status === 'open') {
      where.push('o.status = ?')
      params.push(status)
    }

    const rows = await executeQuery<{ fields: unknown; conf_installment: unknown }>(
      `
      SELECT o.fields, o.conf_installment
      FROM oportunidades o
      WHERE ${where.join(' AND ')}
      ORDER BY o.updateDate DESC
      LIMIT ?
      `,
      [...params, limit]
    )

    const countsFields = new Map<string, number>()
    const countsInstallment = new Map<string, number>()

    for (const row of rows) {
      const parsedFields = safeParseJson(row.fields)
      if (parsedFields) {
        collectKeys(parsedFields, countsFields)
      }

      const parsedInstallment = safeParseJson(row.conf_installment)
      if (parsedInstallment) {
        collectKeys(parsedInstallment, countsInstallment)
      }
    }

    const topFields = Array.from(countsFields.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([key, count]) => ({ key, count }))

    const topInstallment = Array.from(countsInstallment.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([key, count]) => ({ key, count }))

    const hintRegex = /mrr|recorr|mensal|assin|ps|p&s|produto|servi|setup|implant|install|parcela|parcel|mensalidade|recurrence/i

    const psMrrHints = [
      ...topFields.filter(({ key }) => hintRegex.test(key)).map((x) => ({ source: 'fields', ...x })),
      ...topInstallment.filter(({ key }) => hintRegex.test(key)).map((x) => ({ source: 'conf_installment', ...x }))
    ]

    return NextResponse.json({
      success: true,
      sample_size: rows.length,
      filters: { status: status || null, limit },
      top_fields_keys: topFields,
      top_conf_installment_keys: topInstallment,
      ps_mrr_hints: psMrrHints
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao inspecionar chaves de fields',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


