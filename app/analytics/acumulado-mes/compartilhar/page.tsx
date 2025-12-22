"use client"

import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Share2, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CompartilharMetasPage() {
  const [loading, setLoading] = useState(true)
  const [svgData, setSvgData] = useState<string>('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  const currentDate = new Date()
  const mes = currentDate.getMonth() + 1
  const ano = currentDate.getFullYear()

  useEffect(() => {
    carregarSVG()
  }, [])

  const carregarSVG = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/acumulado-mes/wpp?mes=${mes}&ano=${ano}`)
      const svg = await response.text()
      setSvgData(svg)
      
      // Converter SVG para PNG automaticamente
      await converterParaPNG(svg)
    } catch (error) {
      console.error('Erro ao carregar SVG:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a imagem",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const converterParaPNG = async (svg: string) => {
    return new Promise<void>((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) {
        reject('Canvas não encontrado')
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject('Contexto 2D não disponível')
        return
      }

      // Criar um blob do SVG
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        // Definir tamanho do canvas
        canvas.width = img.width
        canvas.height = img.height

        // Desenhar imagem no canvas
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        // Converter canvas para PNG
        const pngUrl = canvas.toDataURL('image/png')
        setImageUrl(pngUrl)

        URL.revokeObjectURL(url)
        resolve()
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject('Erro ao carregar imagem')
      }

      img.src = url
    })
  }

  const baixarImagem = () => {
    if (!imageUrl) return

    const link = document.createElement('a')
    link.download = `metas-${mes}-${ano}.png`
    link.href = imageUrl
    link.click()

    toast({
      title: "Download iniciado",
      description: "A imagem está sendo baixada"
    })
  }

  const compartilhar = async () => {
    if (!imageUrl) return

    try {
      // Converter data URL para blob
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], `metas-${mes}-${ano}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Metas ${mes}/${ano}`,
          text: `Desempenho de Metas - ${mes}/${ano}`,
          files: [file]
        })

        toast({
          title: "Compartilhado!",
          description: "Imagem compartilhada com sucesso"
        })
      } else {
        // Fallback: copiar para clipboard
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])

        toast({
          title: "Copiado!",
          description: "Imagem copiada para a área de transferência"
        })
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível compartilhar a imagem",
        variant: "destructive"
      })
    }
  }

  return (
    <ProtectedRoute requiredPermission="view_analytics">
      <div className="min-h-screen bg-background flex flex-col">
        <main className="w-full px-6 py-6 flex-1">
          <div className="w-full max-w-[1400px] mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Compartilhar Metas
              </h1>
              <p className="text-gray-500 mt-2">
                Gere e compartilhe a tabela de metas no WhatsApp
              </p>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[600px] w-full bg-gray-100" />
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-32 bg-gray-100" />
                      <Skeleton className="h-10 w-32 bg-gray-100" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Preview da imagem */}
                    {imageUrl && (
                      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Tabela de Metas" 
                          className="w-full h-auto"
                        />
                      </div>
                    )}

                    {/* Canvas oculto para conversão */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Botões de ação */}
                    <div className="flex gap-3">
                      <Button
                        onClick={baixarImagem}
                        disabled={!imageUrl}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar PNG
                      </Button>

                      <Button
                        onClick={compartilhar}
                        disabled={!imageUrl}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Compartilhar
                      </Button>

                      <Button
                        onClick={carregarSVG}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Atualizar
                      </Button>
                    </div>

                    <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold mb-2">💡 Dica:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Clique em "Baixar PNG" para salvar a imagem no seu dispositivo</li>
                        <li>Use "Compartilhar" para enviar diretamente pelo WhatsApp ou outras redes</li>
                        <li>A imagem é gerada com os dados mais recentes do sistema</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

