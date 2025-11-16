"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Save, Pencil, Trash2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface Unidade {
  id: number
  nome?: string
  name?: string
}

interface Grupo {
  id: number
  nome: string
  descricao?: string | null
  total_unidades: number
  unidadeIds: number[]
}

// Componente de item de unidade reutilizável (checkbox + nome + badge)
function UnitRow({
  id,
  nome,
  selectedIds,
  setSelectedIds,
  unitGroupName,
  disabled,
}: {
  id: number
  nome: string
  selectedIds: number[]
  setSelectedIds: (updater: (prev: number[]) => number[]) => void
  unitGroupName?: string
  disabled?: boolean
}) {
  const checked = selectedIds.includes(id)
  return (
    <label
      className={`grid grid-cols-[auto,1fr] items-center gap-2 px-2 py-1 rounded hover:bg-accent/40 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(c) => {
          if (disabled) return
          setSelectedIds((prev) => {
            const set = new Set(prev)
            if (c) set.add(id); else set.delete(id)
            return Array.from(set)
          })
        }}
      />
      <div className="min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium max-w-[220px] whitespace-nowrap overflow-hidden text-ellipsis" title={nome}>
          {nome}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] ${unitGroupName ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {unitGroupName ? `Grupo: ${unitGroupName}` : 'Disponível'}
        </span>
      </div>
    </label>
  )
}

export default function GruposUnidadesPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novoDescricao, setNovoDescricao] = useState("")
  const [novoUnidadeIds, setNovoUnidadeIds] = useState<number[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editNome, setEditNome] = useState("")
  const [editDescricao, setEditDescricao] = useState("")
  const [editUnidadeIds, setEditUnidadeIds] = useState<number[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const unidadesFiltradas = useMemo(() => unidades, [unidades])

  // Mapa rápido id -> nome para exibir nomes dentro dos cards
  const unidadeIdToNome = useMemo(() => {
    const map = new Map<number, string>()
    for (const u of unidades) {
      const nome = u.nome || u.name || `Unidade ${u.id}`
      map.set(u.id, nome)
    }
    return map
  }, [unidades])

  // Mapa id da unidade -> nome do grupo atual
  const unidadeIdToGrupoNome = useMemo(() => {
    const map = new Map<number, string>()
    for (const g of grupos) {
      for (const id of g.unidadeIds || []) {
        map.set(id, g.nome)
      }
    }
    return map
  }, [grupos])

  const carregarUnidades = useCallback(async () => {
    try {
      const resp = await fetch("/api/unidades/list")
      if (!resp.ok) {
        throw new Error(`Erro HTTP: ${resp.status}`)
      }
      const data = await resp.json()
      if (data.success) {
        setUnidades(data.unidades || [])
      } else {
        throw new Error(data.message || "Erro ao carregar unidades")
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao carregar unidades"
      setError(errorMsg)
      throw e
    }
  }, [])

  const carregarGrupos = useCallback(async () => {
    try {
      const resp = await fetch("/api/unidades/grupos")
      if (!resp.ok) {
        throw new Error(`Erro HTTP: ${resp.status}`)
      }
      const data = await resp.json()
      if (data.success) {
        setGrupos(data.grupos || [])
      } else {
        throw new Error(data.message || "Erro ao carregar grupos")
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao carregar grupos"
      setError(errorMsg)
      throw e
    }
  }, [])

  const carregarTudo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([carregarUnidades(), carregarGrupos()])
    } catch (e) {
      // Error already set in individual functions
    } finally {
      setLoading(false)
    }
  }, [carregarUnidades, carregarGrupos])

  useEffect(() => {
    carregarTudo()
  }, [carregarTudo])

  // Unidades já vinculadas a algum grupo (para garantir 1 grupo por unidade)
  const unidadeIdsJaVinculadas = useMemo(() => {
    const set = new Set<number>()
    for (const g of grupos) {
      for (const id of g.unidadeIds || []) set.add(id)
    }
    return set
  }, [grupos])

  const unidadesDisponiveisParaNovo = useMemo(() => {
    return unidades.filter(u => !unidadeIdsJaVinculadas.has(u.id))
  }, [unidades, unidadeIdsJaVinculadas])

  // Para edição: pode selecionar unidades já do grupo ou livres
  const unidadesDisponiveisParaEdicao = useMemo(() => {
    const currentSet = new Set(editUnidadeIds)
    return unidades.filter(u => currentSet.has(u.id) || !unidadeIdsJaVinculadas.has(u.id))
  }, [unidades, unidadeIdsJaVinculadas, editUnidadeIds])

  const salvarNovoGrupo = useCallback(async () => {
    if (!novoNome.trim()) {
      setError("Informe o nome do grupo")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const resp = await fetch("/api/unidades/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome.trim(),
          descricao: novoDescricao || null,
          unidadeIds: novoUnidadeIds
        })
      })
      
      if (!resp.ok) {
        throw new Error(`Erro HTTP: ${resp.status}`)
      }
      
      const data = await resp.json()
      if (!data.success) {
        throw new Error(data.message || "Erro ao salvar")
      }
      
      await carregarGrupos()
      setCreateOpen(false)
      setNovoNome("")
      setNovoDescricao("")
      setNovoUnidadeIds([])
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao salvar grupo"
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }, [novoNome, novoDescricao, novoUnidadeIds, carregarGrupos])

  const abrirEditar = useCallback((g: Grupo) => {
    setEditId(g.id)
    setEditNome(g.nome)
    setEditDescricao(g.descricao || "")
    setEditUnidadeIds(Array.isArray(g.unidadeIds) ? g.unidadeIds.slice() : [])
    setEditOpen(true)
  }, [])

  const salvarEdicao = useCallback(async () => {
    if (!editId) return
    if (!editNome.trim()) {
      setError("Informe o nome do grupo")
      return
    }
    try {
      setSaving(true)
      setError(null)
      const resp = await fetch("/api/unidades/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          nome: editNome.trim(),
          descricao: editDescricao || null,
          unidadeIds: editUnidadeIds
        })
      })
      
      if (!resp.ok) {
        throw new Error(`Erro HTTP: ${resp.status}`)
      }
      
      const data = await resp.json()
      if (!data.success) {
        throw new Error(data.message || "Erro ao salvar")
      }
      
      await carregarGrupos()
      setEditOpen(false)
      setEditId(null)
      setEditNome("")
      setEditDescricao("")
      setEditUnidadeIds([])
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao salvar grupo"
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }, [editId, editNome, editDescricao, editUnidadeIds, carregarGrupos])

  const confirmarExcluir = useCallback((g: Grupo) => {
    setDeleteId(g.id)
    setDeleteOpen(true)
  }, [])

  const excluirGrupo = useCallback(async () => {
    if (!deleteId) return
    try {
      setSaving(true)
      setError(null)
      const resp = await fetch(`/api/unidades/grupos?id=${deleteId}`, { method: "DELETE" })
      
      if (!resp.ok) {
        throw new Error(`Erro HTTP: ${resp.status}`)
      }
      
      const data = await resp.json()
      if (!data.success) {
        throw new Error(data.message || "Erro ao excluir")
      }
      
      await carregarGrupos()
      setDeleteOpen(false)
      setDeleteId(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao excluir grupo"
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }, [deleteId, carregarGrupos])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grupos de Unidades</h1>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[1100px] max-h-[85vh] overflow-y-auto">
              <DialogHeader className="pb-2">
                <DialogTitle>Novo Grupo</DialogTitle>
                <DialogDescription>Cada unidade só pode estar em um grupo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Linha: Nome e Descrição */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome</label>
                    <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Grupo Sul" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
                    <Input value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} placeholder="Descrição" />
                  </div>
                </div>
                {/* Linha: Unidades */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Unidades disponíveis</div>
                  <div className="border rounded max-h-[60vh] overflow-auto p-2">
                    {unidades.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-2 py-4">Nenhuma unidade disponível — todas já estão em grupos.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {unidades.map(u => (
                          <UnitRow
                            key={u.id}
                            id={u.id}
                            nome={u.nome || u.name || `Unidade ${u.id}`}
                            selectedIds={novoUnidadeIds}
                            setSelectedIds={(updater) => setNovoUnidadeIds(updater(novoUnidadeIds))}
                            unitGroupName={unidadeIdToGrupoNome.get(u.id)}
                            disabled={Boolean(unidadeIdToGrupoNome.get(u.id))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Ações */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
                  <Button onClick={salvarNovoGrupo} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* Grid de Grupos como Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          {grupos.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Nenhum grupo cadastrado ainda. Clique em "Novo Grupo" para criar.
              </CardContent>
            </Card>
          )}

          {grupos.map((g) => (
            <Card
              key={g.id}
              className="hover:shadow-md hover:border-primary/60 transition"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate" title={g.nome}>
                    {g.nome}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {/* Editar */}
                    <Dialog open={editOpen && editId === g.id} onOpenChange={(o) => { if (!o) setEditOpen(false) }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => abrirEditar(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-[1100px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="pb-2">
                          <DialogTitle>Editar Grupo</DialogTitle>
                          <DialogDescription>Altere o nome, descrição e unidades do grupo. Cada unidade só pode estar em um grupo.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Linha: Nome e Descrição */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Nome</label>
                              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Descrição</label>
                              <Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
                            </div>
                          </div>
                          {/* Linha: Unidades do Grupo */}
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Unidades do Grupo</div>
                            <div className="border rounded max-h-[60vh] overflow-auto p-2">
                              {unidadesDisponiveisParaEdicao.length === 0 ? (
                                <div className="text-sm text-muted-foreground px-2 py-4">Nenhuma unidade disponível.</div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {unidadesDisponiveisParaEdicao.map(u => (
                                    <UnitRow
                                      key={u.id}
                                      id={u.id}
                                      nome={u.nome || u.name || `Unidade ${u.id}`}
                                      selectedIds={editUnidadeIds}
                                      setSelectedIds={(updater) => setEditUnidadeIds(updater(editUnidadeIds))}
                                      unitGroupName={unidadeIdToGrupoNome.get(u.id)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Ações */}
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</Button>
                            <Button onClick={salvarEdicao} disabled={saving}>
                              <Save className="h-4 w-4 mr-2" />
                              {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {/* Excluir */}
                    <Dialog open={deleteOpen && deleteId === g.id} onOpenChange={(o) => { if (!o) setDeleteOpen(false) }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => confirmarExcluir(g)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader className="pb-2">
                          <DialogTitle>Excluir Grupo</DialogTitle>
                          <DialogDescription>Tem certeza que deseja excluir o grupo "{g.nome}"? As unidades serão desvinculadas.</DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
                          <Button className="bg-red-600 hover:bg-red-700" onClick={excluirGrupo} disabled={saving}>
                            {saving ? 'Excluindo...' : 'Excluir'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {g.total_unidades} unidade(s) vinculada(s)
                </div>
                {!!g.unidadeIds?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {g.unidadeIds
                      .map(id => unidadeIdToNome.get(id))
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((nome, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[11px] max-w-[120px] whitespace-nowrap overflow-hidden text-ellipsis"
                          title={String(nome)}
                        >
                          {String(nome)}
                        </Badge>
                      ))}
                    {g.unidadeIds.length > 6 && (
                      <Badge variant="outline" className="text-[11px]">
                        +{g.unidadeIds.length - 6}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}
