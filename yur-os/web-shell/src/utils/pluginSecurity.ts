/**
 * Plugin security utilities for YUR OS plugin system
 * Implements sandboxing, validation, and security auditing for plugins
 */

import type { PluginManifest, Plugin } from '../lib/plugin-loader';

export interface SecurityAuditResult {
  passed: boolean;
  violations: SecurityViolation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityViolation {
  type: 'permission' | 'code' | 'network' | 'storage' | 'validation';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  details?: string;
}

/**
 * Allowed plugin permissions and their risk levels
 */
const PERMISSION_REGISTRY = {
  'storage': { riskLevel: 'low', description: 'Access local storage' },
  'notifications': { riskLevel: 'low', description: 'Show notifications' },
  'audio': { riskLevel: 'medium', description: 'Access audio system' },
  'camera': { riskLevel: 'high', description: 'Access camera' },
  'microphone': { riskLevel: 'high', description: 'Access microphone' },
  'network': { riskLevel: 'medium', description: 'Make network requests' },
  'filesystem': { riskLevel: 'high', description: 'Access file system' },
  'location': { riskLevel: 'high', description: 'Access location data' },
  'system': { riskLevel: 'critical', description: 'System-level access' },
  'admin': { riskLevel: 'critical', description: 'Administrative privileges' },
} as const;

/**
 * Validates plugin manifest for security compliance
 */
export function validatePluginManifest(manifest: unknown): SecurityAuditResult {
  const violations: SecurityViolation[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return {
      passed: false,
      violations: [{
        type: 'validation',
        severity: 'critical',
        message: 'Invalid manifest format',
      }],
      riskLevel: 'critical',
    };
  }

  const m = manifest as Record<string, unknown>;

  // Validate required fields
  const requiredFields = ['id', 'name', 'version', 'author', 'entryPoint'];
  for (const field of requiredFields) {
    if (!m[field] || typeof m[field] !== 'string') {
      violations.push({
        type: 'validation',
        severity: 'error',
        message: `Missing or invalid required field: ${field}`,
      });
    }
  }

  // Validate plugin ID format
  if (typeof m.id === 'string') {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(m.id)) {
      violations.push({
        type: 'validation',
        severity: 'error',
        message: 'Plugin ID must use lowercase letters, numbers, and hyphens only',
      });
    }
  }

  // Validate version format
  if (typeof m.version === 'string') {
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(m.version)) {
      violations.push({
        type: 'validation',
        severity: 'error',
        message: 'Version must follow semantic versioning (e.g., 1.0.0)',
      });
    }
  }

  // Validate permissions
  if (m.permissions && Array.isArray(m.permissions)) {
    for (const permission of m.permissions) {
      if (typeof permission !== 'string') {
        violations.push({
          type: 'permission',
          severity: 'error',
          message: 'All permissions must be strings',
        });
        continue;
      }

      if (!(permission in PERMISSION_REGISTRY)) {
        violations.push({
          type: 'permission',
          severity: 'warning',
          message: `Unknown permission: ${permission}`,
        });
      }
    }
  }

  // Validate entry point path
  if (typeof m.entryPoint === 'string') {
    if (m.entryPoint.includes('..') || m.entryPoint.startsWith('/')) {
      violations.push({
        type: 'validation',
        severity: 'critical',
        message: 'Entry point path must be relative and cannot traverse directories',
      });
    }
  }

  // Calculate risk level
  const riskLevel = calculateRiskLevel(violations, m.permissions as string[]);

  return {
    passed: !violations.some(v => v.severity === 'critical'),
    violations,
    riskLevel,
  };
}

/**
 * Calculates overall risk level based on violations and permissions
 */
function calculateRiskLevel(violations: SecurityViolation[], permissions: string[] = []): 'low' | 'medium' | 'high' | 'critical' {
  // Check for critical violations
  if (violations.some(v => v.severity === 'critical')) {
    return 'critical';
  }

  // Check permission risk levels
  let maxPermissionRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  for (const permission of permissions) {
    const permissionInfo = PERMISSION_REGISTRY[permission as keyof typeof PERMISSION_REGISTRY];
    if (permissionInfo) {
      const riskLevels = ['low', 'medium', 'high', 'critical'];
      if (riskLevels.indexOf(permissionInfo.riskLevel) > riskLevels.indexOf(maxPermissionRisk)) {
        maxPermissionRisk = permissionInfo.riskLevel;
      }
    }
  }

  // Check for error violations
  if (violations.some(v => v.severity === 'error')) {
    return maxPermissionRisk === 'low' ? 'medium' : maxPermissionRisk;
  }

  return maxPermissionRisk;
}

/**
 * Creates a sandboxed environment for plugin execution
 */
export function createPluginSandbox(pluginId: string, permissions: string[] = []) {
  const sandbox = {
    // Allowed globals
    console: createSandboxedConsole(pluginId),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    JSON,
    Date,
    Math,
    
    // Conditional APIs based on permissions
    ...(permissions.includes('storage') && {
      localStorage: createSandboxedStorage(pluginId),
      sessionStorage: createSandboxedStorage(pluginId),
    }),
    
    ...(permissions.includes('network') && {
      fetch: createSandboxedFetch(pluginId),
    }),
  };

  return sandbox;
}

/**
 * Creates sandboxed console for plugin
 */
function createSandboxedConsole(pluginId: string) {
  return {
    log: (...args: unknown[]) => console.log(`[Plugin:${pluginId}]`, ...args),
    warn: (...args: unknown[]) => console.warn(`[Plugin:${pluginId}]`, ...args),
    error: (...args: unknown[]) => console.error(`[Plugin:${pluginId}]`, ...args),
    info: (...args: unknown[]) => console.info(`[Plugin:${pluginId}]`, ...args),
  };
}

/**
 * Creates sandboxed storage for plugin
 */
function createSandboxedStorage(pluginId: string) {
  const prefix = `plugin_${pluginId}_`;
  
  return {
    getItem(key: string): string | null {
      return localStorage.getItem(prefix + key);
    },
    setItem(key: string, value: string): void {
      localStorage.setItem(prefix + key, value);
    },
    removeItem(key: string): void {
      localStorage.removeItem(prefix + key);
    },
    clear(): void {
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => localStorage.removeItem(key));
    },
    get length(): number {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(prefix)).length;
    },
    key(index: number): string | null {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith(prefix));
      return keys[index]?.replace(prefix, '') || null;
    },
  };
}

/**
 * Creates sandboxed fetch for plugin
 */
function createSandboxedFetch(pluginId: string) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // Add plugin identification header
    const headers = new Headers(init?.headers);
    headers.set('X-Plugin-ID', pluginId);
    
    // Validate URL to prevent SSRF
    const url = typeof input === 'string' ? input : input.toString();
    if (!isAllowedUrl(url)) {
      throw new Error(`Plugin ${pluginId}: URL not allowed: ${url}`);
    }
    
    return fetch(input, {
      ...init,
      headers,
    });
  };
}

/**
 * Validates if URL is allowed for plugin access
 */
function isAllowedUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Block local network addresses
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return false;
    }
    
    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Secure dynamic import for plugin loading
 */
export async function secureDynamicImport<T = unknown>(
  url: string, 
  pluginId: string,
  permissions: string[] = []
): Promise<T> {
  // Validate URL
  if (!isValidPluginUrl(url)) {
    throw new Error(`Invalid plugin URL: ${url}`);
  }

  try {
    // Create sandboxed environment
    const sandbox = createPluginSandbox(pluginId, permissions);
    
    // Import with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Plugin load timeout')), 30000);
    });
    
    const modulePromise = import(/* @vite-ignore */ url);
    
    const module = await Promise.race([modulePromise, timeoutPromise]) as T;
    
    console.log(`Plugin ${pluginId} loaded successfully`);
    return module;
    
  } catch (error) {
    console.error(`Failed to load plugin ${pluginId}:`, error);
    throw new Error(`Plugin load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates plugin URL format and safety
 */
function isValidPluginUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // Must be relative or same origin
    if (parsedUrl.origin !== window.location.origin && !url.startsWith('./')) {
      return false;
    }
    
    // Must end with .js or .mjs
    if (!parsedUrl.pathname.match(/\.(m?js)$/)) {
      return false;
    }
    
    // No directory traversal
    if (parsedUrl.pathname.includes('..')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Plugin permission checker
 */
export function checkPluginPermission(pluginId: string, permission: string, permissions: string[]): boolean {
  if (!permissions.includes(permission)) {
    console.warn(`Plugin ${pluginId} does not have permission: ${permission}`);
    return false;
  }
  return true;
}

/**
 * Generate security report for plugin
 */
export function generateSecurityReport(plugin: Plugin): SecurityAuditResult {
  const manifestAudit = validatePluginManifest(plugin.manifest);
  
  // Additional runtime checks could be added here
  // - Code analysis
  // - Network behavior monitoring
  // - Resource usage tracking
  
  return manifestAudit;
}