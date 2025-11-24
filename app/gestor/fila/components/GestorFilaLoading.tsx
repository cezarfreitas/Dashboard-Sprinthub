import React, { memo } from 'react'

export const GestorFilaLoading = memo(function GestorFilaLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-96"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  )
})



