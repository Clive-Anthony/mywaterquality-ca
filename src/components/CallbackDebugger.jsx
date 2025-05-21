// src/components/CallbackDebugger.jsx
// This is a hidden component that logs helpful debugging information
// for OAuth redirects without interfering with the user experience

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function CallbackDebugger() {
  const location = useLocation();
  
  useEffect(() => {
    // Only run on the callback route
    if (!location.pathname.includes('/auth/callback')) {
      return;
    }
    
    console.group('🔍 Auth Callback Debug Info');
    
    // Log basic URL info
    console.log('Full URL:', window.location.href);
    console.log('Pathname:', location.pathname);
    console.log('Search params:', location.search);
    console.log('Hash:', location.hash);
    
    // Parse and log query parameters
    const searchParams = new URLSearchParams(location.search);
    const queryParams = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    console.log('Query parameters:', queryParams);
    
    // Parse and log hash parameters (for token-based auth)
    let hashParams = {};
    if (location.hash) {
      const hashString = location.hash.substring(1); // Remove the leading #
      const hashParts = hashString.split('&');
      
      hashParts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          hashParams[key] = decodeURIComponent(value);
        }
      });
      
      console.log('Hash parameters:', hashParams);
      
      // Special handling for access tokens (mask them for security)
      if (hashParams.access_token) {
        const tokenStart = hashParams.access_token.substring(0, 5);
        const tokenEnd = hashParams.access_token.substring(hashParams.access_token.length - 5);
        console.log('Access token found (masked):', `${tokenStart}...${tokenEnd}`);
      }
    }
    
    // Check for common error parameters
    if (queryParams.error) {
      console.error('OAuth Error:', queryParams.error);
      console.error('Error Description:', queryParams.error_description || 'No description provided');
    }
    
    // Log browser and environment info
    console.log('User Agent:', navigator.userAgent);
    console.log('Referrer:', document.referrer);
    console.log('Environment:', import.meta.env.MODE);
    
    console.groupEnd();
  }, [location]);
  
  // This component doesn't render anything visible
  return null;
}