import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/App.jsx'

describe('App', () => {
  it('renders project title', () => {
    const { container } = render(<App />)
    expect(container.textContent).toContain('<%= projectName %>')
  })
})
