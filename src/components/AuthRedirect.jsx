// src/components/AuthRedirect.jsx - Fixed Google OAuth vs Password Recovery detection
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, verifyEmailToken } from '../lib/supabaseClient';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState('processing');
  const [processingMessage, setProcessingMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('AuthRedirect: Processing authentication callback');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', location.search);
        console.log('Hash:', location.hash);
        
        // Parse URL and hash parameters
        const urlParams = new URLSearchParams(window.location.search);
        let hashParams = {};
        if (location.hash) {
          const hashString = location.hash.substring(1);
          const hashPairs = hashString.split('&');
          hashPairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value) {
              hashParams[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
        }
        
        console.log('URL params:', Object.fromEntries(urlParams));
        console.log('Hash params:', hashParams);
        
        // Clear any redirect flags
        sessionStorage.removeItem('auth_redirect_in_progress');
        
        // Check for errors in URL params or hash
        const errorCode = urlParams.get('error') || hashParams.error;
        const errorDescription = urlParams.get('error_description') || hashParams.error_description;
        const errorCodeFromHash = hashParams.error_code;
        
        if (errorCode) {
          console.error('OAuth error detected:', errorCode, errorDescription, errorCodeFromHash);
          
          // Handle specific error cases with user-friendly messages
          if (errorCode === 'access_denied' && errorCodeFromHash === 'otp_expired') {
            throw new Error('The password reset link has expired. Please request a new one.');
          } else if (errorCode === 'access_denied') {
            throw new Error('Access was denied. The link may be invalid or expired.');
          } else if (errorCode === 'invalid_request') {
            throw new Error('Invalid request. Please try requesting a new reset link.');
          } else {
            throw new Error(`${errorCode}: ${errorDescription || 'Authentication failed'}`);
          }
        }
        
        // Handle email verification (URL params with token)
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        
        if (type === 'signup' && token) {
          console.log('Processing email verification token...');
          setProcessingMessage('Verifying your email...');
          
          const { data, error } = await verifyEmailToken(token);
          
          if (error) {
            throw new Error(`Email verification failed: ${error.message}`);
          }
          
          console.log('Email verified successfully');
          setProcessingState('success');
          setProcessingMessage('Email verified successfully!');
          
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { message: 'Email verified successfully! You can now log in.' }
            });
          }, 2000);
          
          return;
        }
        
        // FIXED: Handle password recovery - ONLY if explicitly marked as recovery
        // Check for explicit recovery type in URL params or hash
        const recoveryType = urlParams.get('type') || hashParams.type;
        const accessToken = hashParams.access_token;
        const refreshToken = hashParams.refresh_token;
        
        console.log('Recovery check:', {
          recoveryType,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          urlType: urlParams.get('type'),
          hashType: hashParams.type,
          isExplicitRecovery: recoveryType === 'recovery'
        });
        
        // FIXED: Only treat as password recovery if explicitly marked as 'recovery'
        // Don't assume that having access_token + refresh_token means password recovery
        if (recoveryType === 'recovery') {
          console.log('Processing password recovery (explicit recovery type detected)...');
          setProcessingMessage('Setting up password recovery...');
          
          if (!accessToken || !refreshToken) {
            throw new Error('Invalid recovery link. Missing authentication tokens. Please request a new reset link.');
          }
          
          console.log('Setting recovery session with tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Failed to set recovery session:', error);
            // Provide more specific error message for session failures
            if (error.message.includes('expired')) {
              throw new Error('The password reset link has expired. Please request a new one.');
            } else {
              throw new Error(`Recovery session failed: ${error.message}`);
            }
          }
          
          console.log('Recovery session established successfully');
          
          // Double-check that the session is actually set
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Failed to establish recovery session. Please request a new reset link.');
          }
          
          console.log('Session verified, user can update password');
          setProcessingState('success');
          setProcessingMessage('Ready to update your password!');
          
          setTimeout(() => {
            navigate('/update-password', { replace: true });
          }, 1500);
          
          return;
        }
        
        // Handle regular OAuth sign-in (access_token in hash WITHOUT recovery type)
        if (accessToken && refreshToken && recoveryType !== 'recovery') {
          console.log('Processing OAuth sign-in (Google/regular OAuth)...');
          setProcessingMessage('Completing sign-in...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('OAuth session error:', error);
            throw error;
          }
          
          console.log('OAuth sign-in successful');
          setProcessingState('success');
          setProcessingMessage('Sign-in successful!');
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
          
          return;
        }
        
        // If no specific callback parameters are found, check current session
        await checkCurrentSession();
        
      } catch (err) {
        console.error('Error handling auth redirect:', err);
        setError(err.message || 'Authentication failed');
        setProcessingState('error');
        
        // Redirect based on error type with appropriate delays
        setTimeout(() => {
          if (err.message && (err.message.includes('expired') || err.message.includes('invalid'))) {
            navigate('/reset-password', { 
              replace: true,
              state: { error: err.message }
            });
          } else {
            navigate('/login', { 
              replace: true,
              state: { error: err.message || 'Authentication failed. Please try again.' }
            });
          }
        }, 3000);
      }
    };
    
    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('User is already authenticated');
          setProcessingState('success');
          setProcessingMessage('Redirecting to dashboard...');
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
        } else {
          throw new Error('No authentication data found in the callback URL');
        }
      } catch (err) {
        throw new Error('Session check failed: ' + (err.message || 'Unknown error'));
      }
    };

    handleRedirect();
  }, [navigate, location]);

  // Render different UI based on processing state
  if (processingState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">{processingMessage}</h2>
          <p className="text-gray-500 text-sm">Please wait while we complete your request.</p>
        </div>
      </div>
    );
  }
  
  if (processingState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">{processingMessage}</h2>
          <p className="text-gray-500 text-sm">Redirecting you now...</p>
        </div>
      </div>
    );
  }
  
  if (processingState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-6 bg-red-50 text-red-700 rounded-lg shadow-lg max-w-md">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium mb-2 text-center">Authentication Error</h2>
          <p className="text-center text-sm mb-4">{error}</p>
          <p className="text-xs text-center">
            {error && error.includes('expired') 
              ? 'Redirecting you to request a new reset link...' 
              : 'Redirecting you to try again...'
            }
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}