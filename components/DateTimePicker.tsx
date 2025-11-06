'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

type DateTimePickerProps = {
  id?: string
  value?: string | null
  onChange: (value: string | '') => void
  placeholder?: string
  error?: string
}

const hours = Array.from({ length: 24 }, (_, idx) => idx)
const minuteSteps = [0, 15, 30, 45]

export function DateTimePicker({ id, value, onChange, placeholder = 'Select date & time', error }: DateTimePickerProps) {
  const parsedValue = useMemo(() => (value ? new Date(value) : null), [value])
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(parsedValue ?? new Date())
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (parsedValue) {
      setCurrentMonth(parsedValue)
    }
  }, [parsedValue])

  useEffect(() => {
    if (!parsedValue) return
    const minute = parsedValue.getMinutes()
    if (!minuteSteps.includes(minute)) {
      const closestMinute = minuteSteps.reduce((closest, candidate) => {
        return Math.abs(candidate - minute) < Math.abs(closest - minute) ? candidate : closest
      }, minuteSteps[0])
      const normalized = setMinutes(parsedValue, closestMinute)
      onChange(normalized.toISOString())
    }
  }, [onChange, parsedValue])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const closeOnOutsideClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current) return
    if (!containerRef.current.contains(event.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [closeOnOutsideClick, open])

  useEffect(() => {
    if (!open) return
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [open])

  const handleDayClick = (day: Date) => {
    const base = parsedValue ?? new Date()
    const next = setMinutes(setHours(day, base.getHours()), base.getMinutes())
    onChange(next.toISOString())
  }

  const handleHourChange = (hour: number) => {
    const base = parsedValue ?? new Date()
    const next = setHours(base, hour)
    onChange(next.toISOString())
  }

  const handleMinuteChange = (minute: number) => {
    const base = parsedValue ?? new Date()
    const next = setMinutes(base, minute)
    onChange(next.toISOString())
  }

  const displayValue = parsedValue ? format(parsedValue, "EEE, MMM d 'at' h:mm a") : ''

  const clearSelection = () => {
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className={`input-field flex w-full items-center justify-between gap-3 text-left pr-10 ${error ? 'ring-1 ring-red-400' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm text-slate-700">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {displayValue || <span className="text-slate-400">{placeholder}</span>}
        </span>
      </button>
      {parsedValue && (
        <button
          type="button"
          onClick={() => clearSelection()}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="absolute z-30 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="font-semibold text-slate-700">{format(currentMonth, 'MMMM yyyy')}</div>
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = parsedValue ? isSameDay(day, parsedValue) : false
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`rounded-full py-2 transition ${isSelected
                      ? 'bg-primary-600 text-white shadow'
                      : isToday(day)
                        ? 'border border-primary-100 bg-primary-50 text-primary-700'
                        : isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300'
                    }`}
                  onClick={() => handleDayClick(day)}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Clock className="h-4 w-4 text-slate-400" /> Time
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-500">Hour</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={parsedValue ? parsedValue.getHours() : new Date().getHours()}
                  onChange={(event) => handleHourChange(Number(event.target.value))}
                >
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>
                      {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-500">Minutes</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={parsedValue ? parsedValue.getMinutes() : minuteSteps[0]}
                  onChange={(event) => handleMinuteChange(Number(event.target.value))}
                >
                  {minuteSteps.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" className="text-sm font-medium text-slate-500" onClick={clearSelection}>
              Clear
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
