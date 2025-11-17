"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Code, Settings, RefreshCw, Building2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Unidade {
  id: number
  nome: string
  ativo: boolean
}

export default function ConfiguracoesAPIPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(true)

  useEffect(() => {
    fetchUnidades()
  }, [])

  const fetchUnidades = async () => {
    try {
      setLoadingUnidades(true)
      const response = await fetch('/api/unidades/simple')
      const data = await response.json()
      
      if (data.success) {
        setUnidades(data.unidades)
      }
    } catch {
      // Erro ao carregar unidades
    } finally {
      setLoadingUnidades(false)
    }
  }
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">API - Documentação</h1>
          <p className="text-muted-foreground">
            Documentação e exemplos de uso das APIs do sistema
          </p>
        </div>
      </div>

      {/* API Fila V2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-5 w-5" />
            <span>API - Distribuição de Leads (Fila V2)</span>
          </CardTitle>
          <CardDescription>
            Documentação e exemplos de uso da API de distribuição automática de leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Endpoint</Label>
            <div className="bg-muted p-3 rounded-md">
              <code className="text-sm font-mono">
                POST /api/filav2
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              Também aceita GET e PUT para compatibilidade
            </p>
          </div>

          <Separator />

          {/* Payload */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Payload JSON</Label>
            <div className="bg-muted p-3 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono">
{`{
  "unidade": "112",
  "idlead": "64792"
}`}
              </pre>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong>unidade</strong> (obrigatório): ID da unidade</p>
              <p><strong>idlead</strong> (obrigatório): ID do lead (aceita {`{contactfield=id}`} que será removido automaticamente)</p>
            </div>
          </div>

          <Separator />

          {/* Exemplo cURL */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Exemplo com cURL</Label>
            <div className="bg-muted p-3 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
{`curl -X POST http://localhost:3000/api/filav2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "unidade": "112",
    "idlead": "64792"
  }'`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* Exemplo JavaScript */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Exemplo com JavaScript/Fetch</Label>
            <div className="bg-muted p-3 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
{`const response = await fetch('/api/filav2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    unidade: "112",
    idlead: "64792"
  })
})

const data = await response.json()
console.log(data)`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* Resposta */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Resposta de Sucesso</Label>
            <div className="bg-muted p-3 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
{`{
  "sucesso": true,
  "unidade": {
    "id": 112,
    "nome": "SC OUTDOOR",
    "dpto_gestao": 117
  },
  "lead_id": 64792,
  "vendedor_atribuido": {
    "vendedor_id": 218,
    "nome": "Luana"
  },
  "departamento": 117,
  "lead_atualizado": true,
  "lead_recuperado": { ... },
  "antes": { ... },
  "depois": { ... }
}`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* Funcionalidades */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Funcionalidades</Label>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Distribuição automática de leads baseada na fila da unidade</li>
              <li>Rotaciona a fila automaticamente após cada atribuição</li>
              <li>Atualiza o lead no SprintHub com owner, userAccess e departmentAccess</li>
              <li>Define automaticamente o campo <code className="bg-muted px-1 rounded">filial</code> com o nome da unidade</li>
              <li>Registra log completo da operação no banco de dados</li>
              <li>Retorna dados completos do lead antes e depois da atualização</li>
            </ul>
          </div>

          <Separator />

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notas Importantes</Label>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• O campo <code className="bg-muted px-1 rounded">whatsapp</code> é obrigatório e será preenchido automaticamente</p>
              <p>• A fila é rotacionada automaticamente após cada distribuição</p>
              <p>• O lead é atualizado no SprintHub com todos os campos necessários</p>
              <p>• Aceita tanto POST (JSON) quanto GET (query params) para compatibilidade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Unidades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>IDs das Unidades</CardTitle>
            </div>
            <button
              onClick={fetchUnidades}
              disabled={loadingUnidades}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              title="Atualizar lista"
            >
              <RefreshCw className={`h-4 w-4 ${loadingUnidades ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <CardDescription>
            Lista de todas as unidades disponíveis com seus respectivos IDs para uso na API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUnidades ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Carregando unidades...</span>
            </div>
          ) : unidades.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma unidade encontrada
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Nome da Unidade</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades.map((unidade) => (
                    <TableRow key={unidade.id}>
                      <TableCell className="font-mono font-semibold">
                        {unidade.id}
                      </TableCell>
                      <TableCell>{unidade.nome}</TableCell>
                      <TableCell className="text-center">
                        {unidade.ativo ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Inativa
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

