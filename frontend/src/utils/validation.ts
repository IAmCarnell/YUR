/**
 * Centralized input validation and sandboxing utilities for security hardening
 */

export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic HTML sanitization - remove script tags and event handlers
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '');
}

/**
 * Validates and sanitizes string input
 */
export function validateString(
  input: unknown,
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationResult<string> {
  if (input === null || input === undefined) {
    if (options.allowEmpty) {
      return { success: true, data: '' };
    }
    return { success: false, error: 'Value is required' };
  }

  if (typeof input !== 'string') {
    return { success: false, error: 'Value must be a string' };
  }

  const sanitized = sanitizeHtml(input.trim());

  if (!options.allowEmpty && sanitized.length === 0) {
    return { success: false, error: 'Value cannot be empty' };
  }

  if (options.minLength !== undefined && sanitized.length < options.minLength) {
    return { success: false, error: `Value must be at least ${options.minLength} characters long` };
  }

  if (options.maxLength !== undefined && sanitized.length > options.maxLength) {
    return { success: false, error: `Value must be at most ${options.maxLength} characters long` };
  }

  if (options.pattern && !options.pattern.test(sanitized)) {
    return { success: false, error: 'Value format is invalid' };
  }

  return { success: true, data: sanitized };
}

/**
 * Validates numeric input
 */
export function validateNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult<number> {
  if (input === null || input === undefined) {
    return { success: false, error: 'Value is required' };
  }

  const num = typeof input === 'string' ? parseFloat(input) : Number(input);

  if (isNaN(num) || !isFinite(num)) {
    return { success: false, error: 'Value must be a valid number' };
  }

  if (options.integer && !Number.isInteger(num)) {
    return { success: false, error: 'Value must be an integer' };
  }

  if (options.min !== undefined && num < options.min) {
    return { success: false, error: `Value must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { success: false, error: `Value must be at most ${options.max}` };
  }

  return { success: true, data: num };
}

/**
 * Validates array input
 */
export function validateArray<T>(
  input: unknown,
  itemValidator: (item: unknown) => ValidationResult<T>,
  options: {
    minLength?: number;
    maxLength?: number;
  } = {}
): ValidationResult<T[]> {
  if (!Array.isArray(input)) {
    return { success: false, error: 'Value must be an array' };
  }

  if (options.minLength !== undefined && input.length < options.minLength) {
    return { success: false, error: `Array must have at least ${options.minLength} items` };
  }

  if (options.maxLength !== undefined && input.length > options.maxLength) {
    return { success: false, error: `Array must have at most ${options.maxLength} items` };
  }

  const validatedItems: T[] = [];
  for (let i = 0; i < input.length; i++) {
    const result = itemValidator(input[i]);
    if (!result.success) {
      return { success: false, error: `Item at index ${i}: ${result.error}` };
    }
    validatedItems.push(result.data);
  }

  return { success: true, data: validatedItems };
}

/**
 * Validates object with schema
 */
export function validateObject<T extends Record<string, unknown>>(
  input: unknown,
  schema: {
    [K in keyof T]: (value: unknown) => ValidationResult<T[K]>;
  }
): ValidationResult<T> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { success: false, error: 'Value must be an object' };
  }

  const obj = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, validator] of Object.entries(schema)) {
    const validationResult = validator(obj[key]);
    if (!validationResult.success) {
      return { success: false, error: `Field '${key}': ${validationResult.error}` };
    }
    result[key] = validationResult.data;
  }

  return { success: true, data: result as T };
}

/**
 * Safe JSON parsing with validation
 */
export function safeJsonParse<T>(
  input: string,
  validator?: (data: unknown) => ValidationResult<T>
): ValidationResult<T> {
  try {
    const parsed = JSON.parse(input);
    
    if (validator) {
      return validator(parsed);
    }
    
    return { success: true, data: parsed };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON' 
    };
  }
}

/**
 * URL validation and sanitization
 */
export function validateUrl(input: unknown): ValidationResult<string> {
  const stringResult = validateString(input);
  if (!stringResult.success) {
    return stringResult;
  }

  try {
    const url = new URL(stringResult.data);
    
    // Only allow HTTP(S) protocols for security
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Only HTTP(S) URLs are allowed' };
    }

    return { success: true, data: url.toString() };
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }
}

/**
 * Email validation
 */
export function validateEmail(input: unknown): ValidationResult<string> {
  const stringResult = validateString(input, { maxLength: 254 });
  if (!stringResult.success) {
    return stringResult;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(stringResult.data)) {
    return { success: false, error: 'Invalid email format' };
  }

  return { success: true, data: stringResult.data.toLowerCase() };
}

/**
 * Plugin ID validation for security
 */
export function validatePluginId(input: unknown): ValidationResult<string> {
  return validateString(input, {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
  });
}

/**
 * Version string validation
 */
export function validateVersion(input: unknown): ValidationResult<string> {
  return validateString(input, {
    minLength: 1,
    maxLength: 20,
    pattern: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/,
  });
}