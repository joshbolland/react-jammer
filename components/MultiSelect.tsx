'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  label?: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  id?: string
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  id,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setSearchTerm('')
      searchInputRef.current?.focus()
    }
  }, [open])

  const toggleOption = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    )
  }

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (!next) {
        setSearchTerm('')
      }
      return next
    })
  }

  const buttonLabel =
    selected.length === 0
      ? placeholder
      : selected
          .map((value) => options.find((option) => option.value === value)?.label ?? value)
          .join(', ')

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredOptions =
    normalizedSearch.length === 0
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-600">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={handleToggle}
        className="input-field filter-input flex items-center justify-between gap-2 text-left text-sm font-medium text-slate-800"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-800'}>
          {buttonLabel}
        </span>
        <svg
          className="h-4 w-4 text-slate-400 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-[0_30px_70px_-45px_rgba(112,66,255,0.35)]">
          <div className="border-b border-primary-50 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search..."
              aria-label="Search options"
              className="w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>
          <ul
            className="max-h-56 overflow-auto py-1"
            role="listbox"
            aria-multiselectable="true"
          >
            {filteredOptions.length === 0 && (
              <li className="px-4 py-2 text-sm text-slate-500">No matches found</li>
            )}
            {filteredOptions.map((option) => {
              const checked = selected.includes(option.value)
              return (
                <li key={option.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-primary-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(option.value)}
                      className="h-4 w-4 rounded border-primary-200 bg-transparent text-primary-500 focus:ring-primary-300"
                    />
                    <span>{option.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
