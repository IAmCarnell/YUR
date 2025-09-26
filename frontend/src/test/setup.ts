import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Add custom jest-dom matchers
expect.extend(matchers)

// Cleanup after each test case (e.g., clear jsdom)
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock WebGL context for Three.js tests
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return {}
  }
  return null
} as any