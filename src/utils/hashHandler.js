// Create this as a new file: src/utils/hashHandler.js

/**
 * Special utility to handle hash fragments with authentication tokens
 * This needs to run as early as possible during app initialization
 */

// Self-executing function to run when the file is imported
(function() {
    // Only run in the browser environment
    if (typeof window === 'undefined') return;
    
    // Handle the case where the URL has an access_token in the hash
    // but it's being treated as part of the path
    const fixMalformedTokenUrl = () => {
      const currentUrl = window.location.href;
      
      // Check if we have a URL pattern that looks like a 404 for an access token
      // This happens when the hash fragment is being treated as part of the path
      if (currentUrl.includes('/%23access_token=') || 
          currentUrl.includes('/#access_token=') && !currentUrl.includes('/auth/callback')) {
        console.log('Detected malformed access token URL, redirecting...');
        
        // Extract the token part
        let tokenPart = '';
        if (currentUrl.includes('/%23access_token=')) {
          // Handle URL-encoded hash
          tokenPart = currentUrl.split('/%23')[1];
        } else {
          // Handle regular hash
          tokenPart = currentUrl.split('/#')[1];
        }
        
        if (tokenPart) {
          // Redirect to the correct callback URL with the hash properly preserved
          const callbackUrl = `${window.location.origin}/auth/callback#${tokenPart}`;
          console.log('Redirecting to:', callbackUrl);
          
          // Use replace to avoid creating a history entry for the malformed URL
          window.location.replace(callbackUrl);
        }
      }
    };
    
    // Run the fix immediately
    fixMalformedTokenUrl();
  })();