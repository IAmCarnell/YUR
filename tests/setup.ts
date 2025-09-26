/**
 * Global test setup for YUR Framework
 * Configures testing environment and utilities
 */

// Mock global objects that may not be available in test environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock WebGL for Three.js components
const mockWebGLContext = {
  getExtension: () => null,
  getParameter: () => null,
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  getShaderParameter: () => true,
  createProgram: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  useProgram: () => {},
  createBuffer: () => ({}),
  bindBuffer: () => {},
  bufferData: () => {},
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  drawArrays: () => {},
  viewport: () => {},
  clearColor: () => {},
  clear: () => {},
};

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return mockWebGLContext;
    }
    return null;
  };
}

// Mock crypto for security tests
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  } as any;
}

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => []
  } as any;
}

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:8000';

// Increase test timeout for complex operations
jest.setTimeout(30000);

console.log('YUR Framework test environment initialized');