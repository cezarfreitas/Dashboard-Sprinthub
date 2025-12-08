"use client"

import { HeaderGestor } from "@/components/header_gestor"
import { AppFooter } from "@/components/app-footer"

export default function GestorOportunidadesParadasPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderGestor />
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-20 py-6 flex-1">
        <h1 className="text-3xl font-bold text-gray-900">Oportunidades Paradas</h1>
      </div>
      <AppFooter />
    </div>
  )
}

