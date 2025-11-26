// src/utils/hashHandler.js
/**
 * Enhanced utility to handle hash fragments with authentication tokens
 * This needs to run as early as possible during app initialization
 * CRITICAL: This runs BEFORE Supabase processes tokens, so we can detect recovery flows
 */

(function() {
  // Only run in the browser environment
  if (typeof window === 'undefined') return;
  
  // console.log('Hash handler: Checking URL for auth tokens...');
  
  /**
   * CRITICAL: Detect and store recovery flow BEFORE Supabase processes tokens
   * This must happen first because Supabase will consume the hash fragment
   */
  const detectAndStoreRecoveryFlow = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Check hash fragment for type=recovery
    if (hash) {
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        
        // console.log('Hash fragment type:', type);
        
        if (type === 'recovery') {
          // console.log('🔑 PASSWORD RECOVERY FLOW DETECTED - storing flag');
          sessionStorage.setItem('supabase_recovery_flow', 'true');
          sessionStorage.setItem('supabase_recovery_timestamp', Date.now().toString());
          return true;
        }
      } catch (e) {
        console.error('Error parsing hash fragment:', e);
      }
    }
    
    // Also check query params as fallback
    if (search) {
      try {
        const searchParams = new URLSearchParams(search);
        const type = searchParams.get('type');
        
        if (type === 'recovery') {
          // console.log('🔑 PASSWORD RECOVERY FLOW DETECTED (from query params) - storing flag');
          sessionStorage.setItem('supabase_recovery_flow', 'true');
          sessionStorage.setItem('supabase_recovery_timestamp', Date.now().toString());
          return true;
        }
      } catch (e) {
        console.error('Error parsing query params:', e);
      }
    }
    
    return false;
  };
  
  // Handle the case where the URL has an access_token in the hash
  const processAuthTokens = () => {
    const hash = window.location.hash;
    
    // Check if we have an access_token in the hash
    if (hash && hash.includes('access_token=')) {
      // console.log('Found access_token in hash fragment');
      
      // Check if we're already on the auth callback route
      if (window.location.pathname === '/auth/callback') {
        // console.log('Already on auth callback route, no redirect needed');
        return;
      }
      
      // If we're not on the callback route, redirect there with the hash preserved
      // console.log('Redirecting to auth callback with hash preserved...');
      
      // Set a flag to prevent infinite redirects
      if (sessionStorage.getItem('auth_redirect_in_progress')) {
        // console.log('Redirect already in progress, skipping...');
        return;
      }
      
      sessionStorage.setItem('auth_redirect_in_progress', 'true');
      
      // Preserve URL parameters when redirecting
      const urlParams = new URLSearchParams(window.location.search);
      const queryString = urlParams.toString();
      const newUrl = `/auth/callback${queryString ? `?${queryString}` : ''}${hash}`;
      // console.log('Navigating to:', newUrl);
      
      // Update the URL without reloading the page
      history.replaceState(null, '', newUrl);
      
      // Dispatch a custom event to trigger React Router navigation
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // Clear the redirect flag after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('auth_redirect_in_progress');
      }, 1000);
    }
  };
  
  // Handle URL-encoded hash fragments
  const fixMalformedTokenUrl = () => {
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('/%23access_token=')) {
      // console.log('Detected URL-encoded hash fragment, fixing...');
      
      const encodedPart = currentUrl.split('/%23')[1];
      const decodedHash = decodeURIComponent(encodedPart);
      const baseUrl = currentUrl.split('/%23')[0];
      const correctedUrl = `${baseUrl}#${decodedHash}`;
      
      // console.log('Correcting URL to:', correctedUrl);
      window.location.replace(correctedUrl);
      return;
    }
  };
  
  // IMPORTANT: Detect recovery flow FIRST, before anything else
  // This must happen before Supabase client processes the tokens
  detectAndStoreRecoveryFlow();
  
  // Then handle URL fixes and redirects
  fixMalformedTokenUrl();
  processAuthTokens();
  
  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    // console.log('Hash changed, re-checking...');
    detectAndStoreRecoveryFlow();
    processAuthTokens();
  });
})();