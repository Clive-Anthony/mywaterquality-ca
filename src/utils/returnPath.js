// src/utils/returnPath.js
import { supabase } from '../lib/supabaseClient';

// Whitelist of allowed return paths
const allowedReturnPaths = [
  '/register-kit',
  '/checkout', 
  '/orders',
  '/dashboard',
  '/admin-dashboard',
  '/shop',
  '/shop/*', // Allow shop sub-pages
  '/claim-kit',
  '/', // Allow homepage
];

/**
 * Validate path format for security
 * @param {string} path - Path to validate
 * @returns {boolean} - Whether path is valid
 */
const isValidReturnPath = (path) => {
  // Only allow relative paths starting with /
  if (!path || typeof path !== 'string' || !path.startsWith('/')) {
    return false;
  }
  
  // Reject external URLs, protocols, or suspicious patterns
  const dangerousPatterns = [
    /^https?:\/\//i,           // External URLs
    /^\/\//,                   // Protocol-relative URLs  
    /\.\./,                    // Path traversal attempts
    /<script/i,                // XSS attempts
    /javascript:/i,            // JavaScript protocol
    /data:/i,                  // Data URLs
    /vbscript:/i,             // VBScript protocol
    /[<>'"]/,                 // HTML/JS injection chars
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
};

/**
 * Check if path matches allowed patterns
 * @param {string} path - Path to check
 * @returns {boolean} - Whether path is whitelisted
 */
const isWhitelistedPath = (path) => {
  return allowedReturnPaths.some(allowedPath => {
    if (allowedPath.endsWith('/*')) {
      const basePath = allowedPath.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === allowedPath || path.startsWith(allowedPath + '?') || path.startsWith(allowedPath + '#');
  });
};

/**
 * Validate user permissions for a path
 * @param {Object} user - User object
 * @param {string} returnPath - Path to validate
 * @returns {Promise<boolean>} - Whether user has permission
 */
const validateUserPermissions = async (user, returnPath) => {
  if (!user) return false;
  
  try {
    // Get user role
    const { data: userRole } = await supabase.rpc('get_user_role', {
      user_uuid: user.id
    });
    
    // Define role-based access rules
    const accessRules = {
      '/admin-dashboard': ['admin', 'super_admin'],
      // All other protected routes allow any authenticated user
    };
    
    const requiredRoles = accessRules[returnPath];
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating user permissions:', error);
    return false;
  }
};

/**
 * Sanitize and clean return path
 * @param {string} path - Path to sanitize
 * @returns {string|null} - Cleaned path or null if invalid
 */
const sanitizeReturnPath = (path) => {
  if (!path) return null;
  
  // Length limit (prevent DOS via huge URLs)
  if (path.length > 200) return null;
  
  // Remove any fragments and keep query parameters
  const cleanPath = path.split('#')[0];
  
  // URL decode safely
  try {
    return decodeURIComponent(cleanPath);
  } catch {
    // Invalid encoding, reject
    return null;
  }
};

/**
 * Store return path in session storage
 * @param {string} path - Path to store
 */
export const storeReturnPath = (path) => {
  try {
    const returnData = {
      path: path,
      timestamp: Date.now(),
      sessionId: crypto.randomUUID() // Prevent cross-session attacks
    };
    
    sessionStorage.setItem('auth_return_to', JSON.stringify(returnData));
    console.log('Stored return path:', path);
  } catch (error) {
    console.error('Error storing return path:', error);
  }
};

/**
 * Get valid return path from storage
 * @returns {string|null} - Valid return path or null
 */
const getValidReturnPath = () => {
  try {
    const stored = sessionStorage.getItem('auth_return_to');
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Expire after 30 minutes
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem('auth_return_to');
      return null;
    }
    
    return data.path;
  } catch {
    // Invalid JSON, clear it
    sessionStorage.removeItem('auth_return_to');
    return null;
  }
};

/**
 * Validate and get return path with full security checks
 * @param {Object} user - User object (optional)
 * @returns {Promise<string|null>} - Valid return path or null
 */
export const validateAndGetReturnPath = async (user = null) => {
  const storedPath = getValidReturnPath();
  
  if (!storedPath) return null;
  
  // Step 1: Format validation
  if (!isValidReturnPath(storedPath)) {
    console.warn('Invalid return path format:', storedPath);
    sessionStorage.removeItem('auth_return_to');
    return null;
  }
  
  // Step 2: Whitelist validation
  if (!isWhitelistedPath(storedPath)) {
    console.warn('Return path not whitelisted:', storedPath);
    sessionStorage.removeItem('auth_return_to');
    return null;
  }
  
  // Step 3: Permission validation (if user provided)
  if (user && !(await validateUserPermissions(user, storedPath))) {
    console.warn('User lacks permission for return path:', storedPath);
    sessionStorage.removeItem('auth_return_to');
    return null;
  }
  
  // Step 4: Sanitize
  const cleanPath = sanitizeReturnPath(storedPath);
  if (!cleanPath) {
    sessionStorage.removeItem('auth_return_to');
    return null;
  }
  
  // Clear after successful validation
  sessionStorage.removeItem('auth_return_to');
  return cleanPath;
};

/**
 * Clear stored return path
 */
export const clearReturnPath = () => {
  try {
    sessionStorage.removeItem('auth_return_to');
  } catch (error) {
    console.error('Error clearing return path:', error);
  }
};