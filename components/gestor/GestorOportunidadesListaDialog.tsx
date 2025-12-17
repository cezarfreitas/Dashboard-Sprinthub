"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExportToExcelButton } from "@/components/ExportToExcelButton"

type TipoLista = "ganhas" | "perdidas" | "abertas"

type OportunidadeListaItem = {
  id: number
  nome?: string | null
  valor?: number | null
  data?: string | null
  dataCriacao?: string | null
  vendedorNome?: string | null
  motivoPerda?: string | null
  [key: string]: unknown
}

interface GestorOportunidadesListaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: TipoLista
  titulo: string
  unidadeId: number | null
  dataInicio?: string | null
  dataFim?: string | null
  funilId?: number | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatarDataPtBr(dateTime?: string | null) {
  if (!dateTime) return "-"
  const datePart = String(dateTime).split("T")[0]?.split(" ")[0] ?? ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "-"
  const [year, month, day] = datePart.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function GestorOportunidadesListaDialog({
  open,
  onOpenChange,
  tipo,
  titulo,
  unidadeId,
  dataInicio,
  dataFim,
  funilId,
}: GestorOportunidadesListaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itens, setItens] = useState<OportunidadeListaItem[]>([])

  const canFetch = Boolean(unidadeId)

  const url = useMemo(() => {
    if (!unidadeId) return null
    const params = new URLSearchParams()
    if (dataInicio && dataFim) {
      params.set("data_inicio", dataInicio)
      params.set("data_fim", dataFim)
    }
    if (funilId) {
      params.set("funil_id", String(funilId))
    }
    const qs = params.toString()
    return `/api/unidades/${unidadeId}/oportunidades-${tipo}${qs ? `?${qs}` : ""}`
  }, [unidadeId, tipo, dataInicio, dataFim, funilId])

  useEffect(() => {
    if (!open) return
    if (!url) return

    const controller = new AbortController()

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        setItens([])

        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()

        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Falha ao carregar oportunidades")
        }

        setItens(Array.isArray(json?.oportunidades) ? json.oportunidades : [])
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Erro desconhecido")
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [open, url])

  const totalValor = useMemo(
    () => itens.reduce((sum, it) => sum + (Number(it.valor) || 0), 0),
    [itens]
  )

  const crmUrl = process.env.NEXT_PUBLIC_URL_PUBLIC || "https://grupointeli.sprinthub.app"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0">
        <div className="border-b px-4 py-3 pr-12">
          <DialogHeader className="min-w-0 space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <List className="h-4 w-4 text-primary" />
              <span className="truncate" title={titulo}>
                {titulo}
              </span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
              <span>{itens.length} item(ns)</span>
              {itens.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium text-foreground">{formatCurrency(totalValor)}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="text-xs text-muted-foreground">
            {!canFetch ? "Selecione uma unidade para listar." : " "}
          </div>
          <ExportToExcelButton
            data={itens}
            filename={`oportunidades_${tipo}`}
            sheetName={titulo}
            disabled={!canFetch || loading || itens.length === 0}
            variant="outline"
            size="sm"
            className="shrink-0"
            colorScheme="default"
            columns={[
              { key: "id", label: "ID" },
              { key: "nome", label: "Título" },
              { key: "vendedorNome", label: "Vendedor" },
              {
                key: "valor",
                label: "Valor",
                format: (v) => {
                  const n = Number(v)
                  return Number.isFinite(n) ? formatCurrency(n) : "-"
                },
              },
              { key: "dataCriacao", label: "Data Criação", format: (v) => formatarDataPtBr(String(v)) },
              { key: "data", label: "Data", format: (v) => formatarDataPtBr(String(v)) },
              ...(tipo === "perdidas" ? [{ key: "motivoPerda", label: "Motivo Perda" }] : []),
            ]}
          />
        </div>

        <div className="flex-1 px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-destructive text-sm">{error}</div>
            </div>
          ) : !canFetch ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-muted-foreground">Selecione uma unidade.</div>
            </div>
          ) : itens.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-muted-foreground">Nenhuma oportunidade encontrada.</div>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="max-h-[60vh] overflow-x-scroll overflow-y-auto scrollbar-gutter-stable">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="bg-background">
                      <TableHead className="min-w-[90px] bg-background">ID</TableHead>
                      <TableHead className="min-w-[320px] bg-background">Título</TableHead>
                      <TableHead className="min-w-[220px] bg-background">Vendedor</TableHead>
                      <TableHead className="min-w-[140px] bg-background text-right">Valor</TableHead>
                      <TableHead className="min-w-[140px] bg-background text-center">Criação</TableHead>
                      <TableHead className="min-w-[140px] bg-background text-center">Data</TableHead>
                      {tipo === "perdidas" && (
                        <TableHead className="min-w-[240px] bg-background">Motivo</TableHead>
                      )}
                      <TableHead className="w-[60px] bg-background" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it) => (
                      <TableRow key={it.id} className="align-middle">
                        <TableCell className="font-medium tabular-nums">{it.id}</TableCell>
                        <TableCell className="max-w-[520px]">
                          <div className="truncate" title={String(it.nome ?? "")}>
                            {it.nome || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate" title={String(it.vendedorNome ?? "")}>
                            {it.vendedorNome || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(it.valor) > 0 ? formatCurrency(Number(it.valor)) : "-"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {formatarDataPtBr(it.dataCriacao)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {formatarDataPtBr(it.data)}
                        </TableCell>
                        {tipo === "perdidas" && <TableCell>{String(it.motivoPerda ?? "-")}</TableCell>}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label={`Abrir oportunidade ${it.id} no CRM`}
                            onClick={() => window.open(`${crmUrl}/sh/crm?opportunityID=${it.id}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


