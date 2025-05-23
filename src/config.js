// src/config.js
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
    
    // In development mode, use the local server
    if (import.meta.env.DEV) {
      // For netlify dev, use port 8888
      return normalizeUrl('http://localhost:8888');
    }
    
    // Fallback for production (if VITE_APP_URL not set)
    return 'https://mywaterqualityca.netlify.app/'; // Make sure this matches your actual Netlify URL
  };
  
  export const config = {
    baseUrl: getBaseUrl(),
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };