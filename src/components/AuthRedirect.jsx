import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const AuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isReady, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  
  // Prevent multiple simultaneous redirects
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

        console.log('Processing OAuth redirect...');
        setStatus('setting_session');

        // Clear any existing redirect flags first
        sessionStorage.removeItem('auth_redirect_in_progress');
        
        // Set session with tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setStatus('error');
          
          setTimeout(() => {
            if (mountedRef.current) {
              navigate('/login', { 
                state: { 
                  error: 'Failed to establish session' 
                },
                replace: true 
              });
            }
          }, 2000);
          return;
        }

        if (!data.session || !data.user) {
          console.error('No session or user after setSession');
          setError('Failed to establish user session');
          setStatus('error');
          
          setTimeout(() => {
            if (mountedRef.current) {
              navigate('/login', { 
                state: { 
                  error: 'Session creation failed' 
                },
                replace: true 
              });
            }
          }, 2000);
          return;
        }

        console.log('Session established successfully');
        setStatus('success');

        // Wait a bit for AuthContext to update, then navigate
        setTimeout(() => {
          if (mountedRef.current) {
            // Get intended destination
            const returnTo = sessionStorage.getItem('auth_return_to') || '/dashboard';
            sessionStorage.removeItem('auth_return_to');
            
            console.log('Navigating to:', returnTo);
            navigate(returnTo, { replace: true });
          }
        }, 1000); // Reduced from 1500ms to be more responsive

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
  if (isAuthenticated && isReady) {
    // Redirect authenticated users away immediately
    const returnTo = sessionStorage.getItem('auth_return_to') || '/dashboard';
    sessionStorage.removeItem('auth_return_to');
    navigate(returnTo, { replace: true });
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