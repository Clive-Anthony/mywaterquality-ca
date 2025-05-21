// src/config.js
// Configuration values for different environments

// Get the base URL for redirects
const getBaseUrl = () => {
    // If VITE_APP_URL is defined in environment, use that (set in Netlify)
    if (import.meta.env.VITE_APP_URL) {
      return import.meta.env.VITE_APP_URL;
    }
    
    // In development mode, use the local server
    if (import.meta.env.DEV) {
      return window.location.origin;
    }
    
    // Fallback for production (if VITE_APP_URL not set)
    return 'https://mywaterqualityca.netlify.app/'; // Replace with your Netlify URL
  };
  
  export const config = {
    baseUrl: getBaseUrl(),
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };