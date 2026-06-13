import { render, screen, fireEvent } from '@testing-library/react'
import CountrySelector from '@/app/components/CountrySelector'

const mockCountries = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
]

describe('CountrySelector', () => {
  it('renders with placeholder text', () => {
    render(<CountrySelector countries={mockCountries} onSelect={jest.fn()} />)
    expect(screen.getByText(/select a country/i)).toBeInTheDocument()
  })

  it('calls onSelect with the correct country object', () => {
    const onSelect = jest.fn()
    render(<CountrySelector countries={mockCountries} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Indonesia'))
    expect(onSelect).toHaveBeenCalledWith({ code: 'ID', name: 'Indonesia' })
  })

  it('disables the combobox when isLoading is true', () => {
    render(<CountrySelector countries={mockCountries} onSelect={jest.fn()} isLoading />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
