import React, { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Database } from 'lucide-react'

interface GestorFilaErrorProps {
  error: string
}

export const GestorFilaError = memo(function GestorFilaError({ error }: GestorFilaErrorProps) {
  return (
    <Card className="border-red-200 bg-red-50 mb-6">
      <CardContent className="pt-4">
        <div className="flex items-center space-x-2 text-red-700">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      </CardContent>
    </Card>
  )
})





