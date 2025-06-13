// src/config.js - Updated for Netlify Dev
// Configuration values for different environments

// Normalize URL by ensuring it ends with a trailing slash
const normalizeUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
};

// Get the base URL for redirects
const getBaseUrl = () => {
  // If VITE_APP_URL is defined in environment, use that (set in Netlify)
  if (import.meta.env.VITE_APP_URL) {
      return normalizeUrl(import.meta.env.VITE_APP_URL);
  }
  
  // In development mode, check if we're using Netlify Dev
  if (import.meta.env.DEV) {
      // Check if we're running under Netlify Dev (port 3000) or direct Vite (port 8888)
      const currentPort = window.location.port;
      
      if (currentPort === '3000') {
          // Netlify Dev
          return normalizeUrl('http://localhost:3000');
      } else {
          // Direct Vite dev server
          return normalizeUrl('http://localhost:8888');
      }
  }
  
  // Fallback for production (if VITE_APP_URL not set)
  return 'https://mywaterquality.ca';
};

export const config = {
  baseUrl: getBaseUrl(),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};