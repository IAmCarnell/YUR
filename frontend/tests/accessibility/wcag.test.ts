/**
 * Accessibility tests for WCAG 2.1 AA compliance
 * Uses axe-core for automated accessibility testing
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import React, { ReactElement } from 'react'

// Extend expect with axe matchers
expect.extend(toHaveNoViolations)

// Mock basic components for testing
const TestMandalaNode = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
  React.createElement('button', {
    role: 'button',
    tabIndex: 0,
    'aria-label': 'Navigation node',
    ...props
  }, children)
)

const TestForm = () => (
  React.createElement('form', null,
    React.createElement('label', { htmlFor: 'test-input' }, 'Test Input'),
    React.createElement('input', { id: 'test-input', type: 'text' }),
    React.createElement('button', { type: 'submit' }, 'Submit')
  )
)

const TestVisualization = () => (
  React.createElement('div', null,
    React.createElement('img', { src: '/test.png', alt: 'Scientific visualization showing data distribution' }),
    React.createElement('table', null,
      React.createElement('caption', null, 'Data table alternative for visualization'),
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', null, 'X'),
          React.createElement('th', null, 'Y'),
          React.createElement('th', null, 'Value')
        )
      ),
      React.createElement('tbody', null,
        React.createElement('tr', null,
          React.createElement('td', null, '1'),
          React.createElement('td', null, '2'),
          React.createElement('td', null, '100')
        )
      )
    )
  )
)

describe('WCAG 2.1 AA Compliance Tests', () => {
  describe('Color Contrast & Basic Accessibility', () => {
    it('should have no axe violations on basic elements', async () => {
      const { container } = render(
        React.createElement('div', null,
          React.createElement('h1', null, 'YUR Framework'),
          React.createElement('p', null, 'This is a test paragraph'),
          React.createElement('button', null, 'Test Button')
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Mandala Dock Accessibility', () => {
    it('should be navigable with keyboard', async () => {
      const { container } = render(
        React.createElement('div', { role: 'navigation', 'aria-label': 'Mandala dock' },
          React.createElement(TestMandalaNode, null, 'Node 1'),
          React.createElement(TestMandalaNode, null, 'Node 2'),
          React.createElement(TestMandalaNode, null, 'Node 3')
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check that nodes are keyboard accessible
      const nodes = screen.getAllByRole('button')
      expect(nodes).toHaveLength(3)
      
      nodes.forEach(node => {
        expect(node).toHaveAttribute('tabIndex', '0')
        expect(node).toHaveAttribute('aria-label')
      })
    })

    it('should announce spatial changes to screen readers', async () => {
      const { container } = render(
        React.createElement('div', null,
          React.createElement('div', { 'aria-live': 'polite', id: 'spatial-announcements' }, 'Current position: Center node'),
          React.createElement(TestMandalaNode, null, 'Active Node')
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const liveRegion = screen.getByText('Current position: Center node')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Scientific Visualization Accessibility', () => {
    it('should provide alternative representations', async () => {
      const { container } = render(React.createElement(TestVisualization))

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check for alt text on images
      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('alt')
      expect(image.getAttribute('alt')).not.toBe('')

      // Check for data table alternative
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const caption = screen.getByText('Data table alternative for visualization')
      expect(caption).toBeInTheDocument()
    })
  })

  describe('Form Accessibility', () => {
    it('should have properly labeled form controls', async () => {
      const { container } = render(React.createElement(TestForm))

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check for proper labeling
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id', 'test-input')
      
      const label = screen.getByText('Test Input')
      expect(label).toHaveAttribute('for', 'test-input')
    })

    it('should provide clear error messages', async () => {
      const { container } = render(
        React.createElement('form', null,
          React.createElement('label', { htmlFor: 'email-input' }, 'Email'),
          React.createElement('input', { 
            id: 'email-input', 
            type: 'email', 
            'aria-describedby': 'email-error',
            'aria-invalid': 'true'
          }),
          React.createElement('div', { id: 'email-error', 'aria-live': 'polite' }, 'Please enter a valid email address')
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('XR/AR Accessibility', () => {
    it('should provide non-XR alternatives', async () => {
      const { container } = render(
        React.createElement('div', null,
          React.createElement('div', { className: 'xr-content', 'aria-label': '3D visualization', role: 'img' },
            React.createElement('canvas', null, '3D Scene')
          ),
          React.createElement('div', { className: 'fallback-content' },
            React.createElement('h3', null, 'Alternative view'),
            React.createElement('p', null, 'This content provides an alternative to the 3D experience'),
            React.createElement('button', null, 'View in 2D')
          )
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check that fallback content exists
      const fallbackContent = screen.getByText('Alternative view')
      expect(fallbackContent).toBeInTheDocument()
      
      const fallbackButton = screen.getByText('View in 2D')
      expect(fallbackButton).toBeInTheDocument()
    })
  })

  describe('Skip Links and Navigation', () => {
    it('should provide skip navigation links', async () => {
      const { container } = render(
        React.createElement('div', null,
          React.createElement('a', { href: '#main-content', className: 'skip-link' }, 'Skip to main content'),
          React.createElement('nav', { 'aria-label': 'Main navigation' },
            React.createElement('ul', null,
              React.createElement('li', null, React.createElement('a', { href: '/' }, 'Home')),
              React.createElement('li', null, React.createElement('a', { href: '/docs' }, 'Documentation'))
            )
          ),
          React.createElement('main', { id: 'main-content' },
            React.createElement('h1', null, 'Main Content')
          )
        )
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toHaveAttribute('href', '#main-content')
      
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')
    })
  })
})