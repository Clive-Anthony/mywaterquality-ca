// src/utils/hashHandler.js
/**
 * Enhanced utility to handle hash fragments with authentication tokens
 * This needs to run as early as possible during app initialization
 */

// Self-executing function to run when the file is imported
(function() {
  // Only run in the browser environment
  if (typeof window === 'undefined') return;
  
  console.log('Hash handler: Checking URL for auth tokens...');
  console.log('Current URL:', window.location.href);
  
  // Handle the case where the URL has an access_token in the hash
  const processAuthTokens = () => {
    const currentUrl = window.location.href;
    const hash = window.location.hash;
    
    console.log('Hash fragment:', hash);
    
    // Check if we have an access_token in the hash
    if (hash && hash.includes('access_token=')) {
      console.log('Found access_token in hash fragment');
      
      // Parse the hash parameters
      const hashParams = new URLSearchParams(hash.substring(1)); // Remove the #
      const accessToken = hashParams.get('access_token');
      const tokenType = hashParams.get('type');
      const refreshToken = hashParams.get('refresh_token');
      
      console.log('Token details:', {
        hasAccessToken: !!accessToken,
        tokenType,
        hasRefreshToken: !!refreshToken
      });
      
      // Check if we're already on the auth callback route
      if (window.location.pathname === '/auth/callback') {
        console.log('Already on auth callback route, no redirect needed');
        return;
      }
      
      // If we're not on the callback route, redirect there with the hash preserved
      console.log('Redirecting to auth callback with hash preserved...');
      
      // Set a flag to prevent infinite redirects
      if (sessionStorage.getItem('auth_redirect_in_progress')) {
        console.log('Redirect already in progress, skipping...');
        return;
      }
      
      sessionStorage.setItem('auth_redirect_in_progress', 'true');
      
      // Use history.replaceState to navigate to the callback without triggering a full page reload
      const newUrl = `/auth/callback${hash}`;
      console.log('Navigating to:', newUrl);
      
      // Update the URL without reloading the page
      history.replaceState(null, '', newUrl);
      
      // Dispatch a custom event to trigger React Router navigation
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // Clear the redirect flag after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('auth_redirect_in_progress');
      }, 1000);
    } else {
      console.log('No access_token found in hash fragment');
    }
  };
  
  // Also handle URL-encoded hash fragments (just in case)
  const fixMalformedTokenUrl = () => {
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('/%23access_token=')) {
      console.log('Detected URL-encoded hash fragment, fixing...');
      
      // Extract the token part and decode it
      const encodedPart = currentUrl.split('/%23')[1];
      const decodedHash = decodeURIComponent(encodedPart);
      
      // Construct the correct URL
      const baseUrl = currentUrl.split('/%23')[0];
      const correctedUrl = `${baseUrl}#${decodedHash}`;
      
      console.log('Correcting URL from:', currentUrl);
      console.log('To:', correctedUrl);
      
      // Replace the current URL
      window.location.replace(correctedUrl);
      return;
    }
  };
  
  // Run both checks
  fixMalformedTokenUrl();
  processAuthTokens();
  
  // Also listen for hash changes in case the hash is set after page load
  window.addEventListener('hashchange', () => {
    console.log('Hash changed, re-checking for auth tokens...');
    processAuthTokens();
  });
})();