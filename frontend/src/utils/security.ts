/**
 * Security utilities for API authentication and authorization
 */

import { ValidationResult, validateString, validateUrl } from './validation';

export interface SecurityConfig {
  maxRetries: number;
  timeoutMs: number;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxRetries: 3,
  timeoutMs: 30000,
  allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  rateLimitWindowMs: 60000, // 1 minute
  rateLimitMaxRequests: 100,
};

/**
 * Rate limiting tracker
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, config: SecurityConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.rateLimitWindowMs;
    
    let requestTimes = this.requests.get(key) || [];
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    if (requestTimes.length >= config.rateLimitMaxRequests) {
      return false;
    }
    
    requestTimes.push(now);
    this.requests.set(key, requestTimes);
    return true;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Secure API request wrapper with built-in security measures
 */
export async function secureApiRequest<T>(
  url: string,
  options: RequestInit = {},
  config: Partial<SecurityConfig> = {}
): Promise<ValidationResult<T>> {
  const securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.success) {
    return { success: false, error: `Invalid URL: ${urlValidation.error}` };
  }

  // Check rate limiting
  const rateLimitKey = `${url}:${options.method || 'GET'}`;
  if (!rateLimiter.isAllowed(rateLimitKey, securityConfig)) {
    return { success: false, error: 'Rate limit exceeded. Please try again later.' };
  }

  // Set secure headers
  const secureHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  // Add CSRF protection for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      secureHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  const secureOptions: RequestInit = {
    ...options,
    headers: secureHeaders,
    credentials: 'same-origin', // Only send credentials to same origin
    signal: AbortSignal.timeout(securityConfig.timeoutMs),
  };

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= securityConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(urlValidation.data, secureOptions);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on client errors (4xx)
      if (lastError.message.includes('HTTP 4')) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < securityConfig.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return { 
    success: false, 
    error: lastError?.message || 'Request failed after retries' 
  };
}

/**
 * Get CSRF token from meta tag or cookie
 */
function getCsrfToken(): string | null {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  // Try to get from cookie
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Validates API token format and authenticity
 */
export function validateApiToken(token: unknown): ValidationResult<string> {
  const stringResult = validateString(token, { 
    minLength: 32, 
    maxLength: 256,
    pattern: /^[A-Za-z0-9+/=.-]+$/ // Base64-like pattern
  });
  
  if (!stringResult.success) {
    return { success: false, error: 'Invalid token format' };
  }

  // Additional token validation logic could go here
  // (e.g., signature verification, expiry check)
  
  return { success: true, data: stringResult.data };
}

/**
 * Content Security Policy helper
 */
export function createCSPHeader(options: {
  allowInlineStyles?: boolean;
  allowInlineScripts?: boolean;
  allowedImageSources?: string[];
  allowedScriptSources?: string[];
} = {}): string {
  const directives = [
    "default-src 'self'",
    options.allowInlineStyles ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    options.allowInlineScripts ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    `img-src 'self' data: ${(options.allowedImageSources || []).join(' ')}`.trim(),
    `script-src 'self' ${(options.allowedScriptSources || []).join(' ')}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join('; ');
}

/**
 * Sanitizes data before logging to prevent log injection
 */
export function sanitizeForLogging(data: unknown): string {
  if (typeof data === 'string') {
    // Remove newlines and control characters to prevent log injection
    return data.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, '');
  }
  
  if (typeof data === 'object' && data !== null) {
    try {
      const sanitized = JSON.stringify(data, (key, value) => {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('secret')) {
          return '[REDACTED]';
        }
        return typeof value === 'string' ? 
          value.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, '') : 
          value;
      });
      return sanitized.slice(0, 1000); // Limit length
    } catch {
      return '[INVALID_OBJECT]';
    }
  }
  
  return String(data).replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, '').slice(0, 1000);
}

/**
 * Secure random string generation
 */
export function generateSecureId(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}