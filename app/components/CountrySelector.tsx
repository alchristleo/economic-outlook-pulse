'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Country } from '@/types'

interface CountrySelectorProps {
  countries: Country[]
  onSelect: (country: Country) => void
  selectedCode?: string
  isLoading?: boolean
}

export default function CountrySelector({
  countries,
  onSelect,
  selectedCode,
  isLoading,
}: CountrySelectorProps) {
  function handleValueChange(code: string) {
    const country = countries.find((c) => c.code === code)
    if (country) onSelect(country)
  }

  return (
    <Select value={selectedCode} onValueChange={handleValueChange} disabled={isLoading}>
      <SelectTrigger className="w-[240px] border-gray-300 font-medium">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
