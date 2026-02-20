import { z, ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Sanitize a string to prevent XSS attacks
 * Removes script tags and potentially dangerous HTML
 */
export function sanitizeString(str: string | undefined): string | undefined {
  if (str === undefined) return undefined;
  
  // Remove script tags (case insensitive)
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers like onclick, onerror, etc.
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs that could execute code
  sanitized = sanitized.replace(/data:/gi, '');
  
  return sanitized;
}

/**
 * Sanitize all string values in an object recursively
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware factory that validates request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // First sanitize the body to prevent XSS
      const sanitizedBody = sanitizeObject(req.body);
      
      // Then validate against the schema
      const result = schema.parse(sanitizedBody);
      
      // Replace req.body with the validated and sanitized data
      req.body = result;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error:', { details });
        
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details,
          },
        });
      }
      
      next(error);
    }
  };
}

/**
 * Middleware factory that validates request query params against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query);
      req.query = result as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Query validation error:', { details });
        
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details,
          },
        });
      }
      
      next(error);
    }
  };
}

/**
 * Middleware factory that validates URL params against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.params);
      // Update req.params with validated and transformed values
      Object.assign(req.params, result);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Params validation error:', { details });
        
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL parameters',
            details,
          },
        });
      }
      
      next(error);
    }
  };
}

// Common validation schemas

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Common email schema
 */
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email format');

/**
 * URL validation schema
 */
export const urlSchema = z.string()
  .min(1, 'URL is required')
  .url('Invalid URL format');

/**
 * Optional URL schema
 */
export const optionalUrlSchema = z.string()
  .optional()
  .refine(val => !val || z.string().url().safeParse(val).success, {
    message: 'Invalid URL format',
  });

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(50).default(12),
});
