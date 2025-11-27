"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Selecione a data",
  className,
  disabled = false,
  required = false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mobile: Seletores separados
  if (isMobile) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={date ? date.getDate().toString() : ''}
          onValueChange={(value) => {
            const newDate = date || new Date()
            newDate.setDate(parseInt(value))
            onSelect?.(new Date(newDate))
          }}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className={cn("h-11 text-sm", className)}>
            <SelectValue placeholder="Dia" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={date ? (date.getMonth() + 1).toString() : ''}
          onValueChange={(value) => {
            const newDate = date || new Date()
            newDate.setMonth(parseInt(value) - 1)
            onSelect?.(new Date(newDate))
          }}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className={cn("h-11 text-sm", className)}>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((mes, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {mes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={date ? date.getFullYear().toString() : ''}
          onValueChange={(value) => {
            const newDate = date || new Date()
            newDate.setFullYear(parseInt(value))
            onSelect?.(new Date(newDate))
          }}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className={cn("h-11 text-sm", className)}>
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Desktop: Calendário visual
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onSelect?.(selectedDate)
            setOpen(false)
          }}
          initialFocus
          required={required}
        />
      </PopoverContent>
    </Popover>
  )
}

