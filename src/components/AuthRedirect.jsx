import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getPartnerContext } from '../utils/partnerContext';
import { validatePartnerSlug } from '../utils/partnerHelpers';


const AuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isReady, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  
  // Prevent multiple simultaneous redirects
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const recoveryDetected = checkForRecoveryFlow();
    if (recoveryDetected) {
      // console.log('🔑 Recovery flow detected on mount');
      setIsRecoveryFlow(true);
    }
  }, []);

  // Handle recovery flow redirect - must be in useEffect to avoid render-time navigation
  useEffect(() => {
    if (isRecoveryFlow && isAuthenticated && isReady) {
      // console.log('🔑 Executing recovery flow redirect to update-password');
      clearRecoveryFlags();
      navigate('/update-password', { replace: true });
    }
  }, [isRecoveryFlow, isAuthenticated, isReady, navigate]);

  // Helper function to determine redirect path based on user role
  const getRedirectPath = async (user) => {
  try {
    // PRIORITY 1: Check for partner cookie (survives new tabs)
    const partnerSlug = getPartnerContext();
    if (partnerSlug) {
      // console.log('Partner context found in cookie:', partnerSlug);
      
      // Validate partner exists and is active
      const { isValid } = await validatePartnerSlug(partnerSlug);
      if (isValid) {
        // console.log('Redirecting to partner shop:', partnerSlug);
        return `/shop/partner/${partnerSlug}`;
      } else {
        // console.log('Partner slug invalid, clearing context');
        // Clear invalid partner context
        const { clearPartnerContext } = await import('../utils/partnerContext');
        clearPartnerContext();
      }
    }
    
    // PRIORITY 2: Check for a valid stored return path
    const { validateAndGetReturnPath } = await import('../utils/returnPath');
    const storedPath = await validateAndGetReturnPath(user);
    
    if (storedPath) {
      // console.log('Using stored return path:', storedPath);
      return storedPath;
    }
    
    // PRIORITY 3: Fall back to role-based redirection
    const { data: userRole } = await supabase.rpc('get_user_role', {
      user_uuid: user.id
    });
    
    // console.log('No valid return path, using role-based redirect. User role:', userRole);
    
    return (userRole === 'admin' || userRole === 'super_admin') 
      ? '/admin-dashboard' 
      : '/dashboard';
  } catch (error) {
    console.error('Error determining redirect path:', error);
    return '/dashboard'; // Default fallback
  }
};

// Helper function to check if this is a password recovery flow
  // Checks both the stored flag (set by hashHandler.js) and URL params
  const checkForRecoveryFlow = () => {
    // PRIORITY 1: Check sessionStorage flag set by hashHandler.js
    // This is the most reliable because it was captured BEFORE Supabase processed tokens
    const recoveryFlag = sessionStorage.getItem('supabase_recovery_flow');
    const recoveryTimestamp = sessionStorage.getItem('supabase_recovery_timestamp');
    
    if (recoveryFlag === 'true') {
      // Verify it's not stale (within last 5 minutes)
      if (recoveryTimestamp) {
        const age = Date.now() - parseInt(recoveryTimestamp, 10);
        if (age < 5 * 60 * 1000) { // 5 minutes
          // console.log('Recovery flow detected from stored flag');
          return true;
        } else {
          // Stale flag, clear it
          sessionStorage.removeItem('supabase_recovery_flow');
          sessionStorage.removeItem('supabase_recovery_timestamp');
        }
      } else {
        // console.log('Recovery flow detected from stored flag (no timestamp)');
        return true;
      }
    }
    
    // PRIORITY 2: Check URL hash fragment (may still be present)
    const hash = window.location.hash;
    if (hash) {
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        if (hashParams.get('type') === 'recovery') {
          // console.log('Recovery flow detected from hash');
          return true;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    // PRIORITY 3: Check query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'recovery') {
      // console.log('Recovery flow detected from query params');
      return true;
    }
    
    return false;
  };

  // Helper to clear recovery flow flags
  const clearRecoveryFlags = () => {
    sessionStorage.removeItem('supabase_recovery_flow');
    sessionStorage.removeItem('supabase_recovery_timestamp');
  };

  // Helper function to handle pending newsletter signups for OAuth users
  const handlePendingNewsletterSignup = async (user) => {
    const newsletterOptInPending = localStorage.getItem('newsletter_opt_in_pending');
    
    if (newsletterOptInPending === 'true' && user?.email) {
      try {
        // console.log('Processing pending newsletter signup for Google OAuth user:', user.email);
        
        const { config } = await import('../config');
        const { trackNewsletterSignupConversion } = await import('../utils/gtm');
        
        const response = await fetch(
          `${config.supabaseUrl}/functions/v1/newsletter-signup`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.supabaseAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: user.email.toLowerCase().trim(),
              source: 'google_oauth_signup',
              metadata: {
                page_url: window.location.href,
                referrer: document.referrer || 'direct',
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || '',
                oauth_provider: 'google',
                opted_in_during_signup: true
              }
            })
          }
        );

        const result = await response.json();
        
        if (response.ok && result.success) {
          // console.log('Newsletter signup successful for OAuth user');
          
          try {
            await trackNewsletterSignupConversion({
              email: user.email.toLowerCase().trim(),
              source: 'google_oauth_signup',
              alreadySubscribed: result.alreadySubscribed || false,
              opted_in_during_signup: true,
              oauth_provider: 'google'
            });
          } catch (gtmError) {
            console.error('GTM newsletter signup tracking error (non-critical):', gtmError);
          }
        } else {
          console.error('Newsletter signup failed for OAuth user:', result.error);
        }
        
      } catch (error) {
        console.error('Error processing newsletter signup for OAuth user:', error);
      } finally {
        localStorage.removeItem('newsletter_opt_in_pending');
      }
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      // Prevent multiple simultaneous processing
      if (processingRef.current || !mountedRef.current) {
        return;
      }

      // Wait for AuthContext to be ready
      if (!isReady) {
        return;
      }

      processingRef.current = true;

      try {

        // If this is a recovery flow, don't process as regular OAuth
        // Let the recovery-specific useEffect handle it
        if (checkForRecoveryFlow()) {
          // console.log('🔑 Recovery flow detected in handleRedirect, setting state and returning');
          setIsRecoveryFlow(true);
          setStatus('success');
          return; // Let the recovery useEffect handle navigation
        }

        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setStatus('error');
          
          // Navigate to login with error after delay
          setTimeout(() => {
            if (mountedRef.current) {
              navigate('/login', { 
                state: { 
                  error: errorDescription || 'Authentication failed' 
                },
                replace: true 
              });
            }
          }, 2000);
          return;
        }

        // Check for password recovery flow in hash fragment
        // (tokens may be in hash, not query params for recovery)
        if (checkForRecoveryFlow()) {
          // console.log('Password recovery flow detected from hash');
          setStatus('success');
          
          // Let Supabase client handle the token processing from hash
          // Then redirect to update password page
          setTimeout(() => {
            if (mountedRef.current) {
              navigate('/update-password', { replace: true });
            }
          }, 500);
          return;
        }

        // Regular OAuth login flow
        // Validate required tokens
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in redirect');
          setError('Invalid authentication response');
          setStatus('error');
          
          setTimeout(() => {
            if (mountedRef.current) {
              navigate('/login', { 
                state: { 
                  error: 'Authentication failed - missing tokens' 
                },
                replace: true 
              });
            }
          }, 2000);
          return;
        }

        // Set session with OAuth tokens
        // console.log('Setting session with OAuth tokens...');
        setStatus('setting_session');

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!data?.user) {
          throw new Error('No user data returned from session');
        }

        // console.log('OAuth session set successfully for user:', data.user.email);

        // Handle pending newsletter signup for OAuth users
        await handlePendingNewsletterSignup(data.user);

        setStatus('success');

        // Get redirect path and navigate
        const redirectPath = await getRedirectPath(data.user);
        // console.log('Redirecting OAuth user to:', redirectPath);
        
        setTimeout(() => {
          if (mountedRef.current) {
            navigate(redirectPath, { replace: true });
          }
        }, 1000);

      } catch (error) {
        console.error('Auth redirect error:', error);
        setError(error.message);
        setStatus('error');
        
        setTimeout(() => {
          if (mountedRef.current) {
            navigate('/login', { 
              state: { 
                error: 'Authentication processing failed' 
              },
              replace: true 
            });
          }
        }, 2000);
      } finally {
        processingRef.current = false;
      }
    };

    handleRedirect();
  }, [searchParams, navigate, isReady]);

  // Don't render anything if already authenticated (avoid interference)
  // BUT: If this is a recovery flow, let the useEffect handle the redirect
  if (isAuthenticated && isReady) {
    // If recovery flow is detected, wait for the useEffect to handle redirect
    // Don't do any navigation here to avoid race conditions
    if (isRecoveryFlow) {
      // console.log('🔑 Recovery flow active, waiting for useEffect redirect...');
      // Return loading state while useEffect handles redirect
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Password Reset
            </h2>
            <p className="text-blue-600">
              Redirecting to password update page...
            </p>
          </div>
        </div>
      );
    }
    
    // Regular authenticated user - redirect to appropriate dashboard
    // This needs to be in a useEffect to avoid the render warning too
    // For now, return null and let existing useEffect handle it
    return null;
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Processing authentication...';
      case 'setting_session':
        return 'Setting up your session...';
      case 'success':
        return 'Authentication successful! Redirecting...';
      case 'error':
        return `Authentication failed: ${error}`;
      default:
        return 'Loading...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'error' ? (
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ) : status === 'success' ? (
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentication
        </h2>
        
        <p className={`${getStatusColor()} mb-4`}>
          {getStatusMessage()}
        </p>
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthRedirect;