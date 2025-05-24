// src/components/AuthRedirect.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, verifyEmailToken } from '../lib/supabaseClient';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState('processing'); // 'processing', 'success', 'error'
  const [processingMessage, setProcessingMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('AuthRedirect: Processing authentication callback');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', location.search);
        console.log('Hash:', location.hash);
        
        // Check for error parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const nextUrl = urlParams.get('next'); // For password reset flow
        const type = urlParams.get('type'); // Check for recovery type
        
        // Clear any redirect flags
        sessionStorage.removeItem('auth_redirect_in_progress');
        
        // Also check for errors in hash fragment
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
        
        // Check for errors in either location
        const hashError = hashParams.error;
        const hashErrorDescription = hashParams.error_description;
        
        if (errorCode || hashError) {
          const finalError = errorCode || hashError;
          const finalDescription = errorDescription || hashErrorDescription;
          
          console.error('OAuth error detected:', finalError, finalDescription);
          
          // Handle specific error cases
          if (finalError === 'access_denied' && hashParams.error_code === 'otp_expired') {
            throw new Error('The password reset link has expired. Please request a new one.');
          } else if (finalError === 'access_denied') {
            throw new Error('Access was denied. Please try again.');
          } else {
            throw new Error(`${finalError}: ${finalDescription || 'Authentication failed'}`);
          }
        }
        
        // Check for email verification parameters (URL params)
        const token = urlParams.get('token');
        
        // Handle email verification callback
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
          
          // Redirect to login page after successful verification
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { message: 'Email verified successfully! You can now log in.' }
            });
          }, 2000);
          
          return;
        }
        
        // Handle password recovery flow (URL params OR hash params)
        if (type === 'recovery' || hashParams.type === 'recovery') {
          console.log('Processing password recovery callback...');
          console.log('Recovery type found in:', type ? 'URL params' : 'hash params');
          setProcessingMessage('Setting up password recovery...');
          
          // For recovery, we expect the actual tokens to be in the hash fragment
          const accessToken = hashParams.access_token;
          const refreshToken = hashParams.refresh_token;
          
          console.log('Recovery tokens:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenStart: accessToken ? accessToken.substring(0, 10) + '...' : 'none'
          });
          
          if (accessToken && refreshToken) {
            console.log('Setting recovery session...');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Failed to set recovery session:', error);
              throw new Error(`Recovery session failed: ${error.message}`);
            }
            
            console.log('Recovery session established successfully');
            setProcessingState('success');
            setProcessingMessage('Ready to update your password!');
            
            // Redirect to update password page
            setTimeout(() => {
              navigate('/update-password', { replace: true });
            }, 1000);
            
            return;
          } else {
            console.error('Missing recovery tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
            throw new Error('Invalid recovery link. Missing authentication tokens.');
          }
        }
        
        // Check for OAuth callback or hash fragment (access_token) for regular sign-in
        if (location.hash || window.location.hash) {
          console.log('Processing OAuth or token callback...');
          const hashValue = location.hash || window.location.hash;
          
          // Special handling for URLs like /#access_token=...
          if (hashValue.includes('access_token=')) {
            try {
              // Remove the # character and parse the fragment as query params
              const hashParams = new URLSearchParams(hashValue.substring(1));
              
              // Extract the tokens and parameters
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              const tokenType = hashParams.get('token_type');
              const expiresIn = hashParams.get('expires_in');
              const authType = hashParams.get('type');
              
              console.log('Token data found:', {
                tokenType,
                expiresIn,
                authType,
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken
              });
              
              if (accessToken) {
                // Check if this is a password recovery session
                if (authType === 'recovery') {
                  console.log('Processing password recovery session from hash...');
                  setProcessingMessage('Setting up password recovery session...');
                  
                  // Set the session with the recovery tokens
                  const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                  });
                  
                  if (error) throw error;
                  
                  console.log('Password recovery session established');
                  setProcessingState('success');
                  setProcessingMessage('Ready to update your password!');
                  
                  // Redirect to update password page or the next URL specified
                  const redirectUrl = nextUrl || '/update-password';
                  setTimeout(() => {
                    navigate(redirectUrl, { replace: true });
                  }, 1000);
                  
                  return;
                }
                
                // Regular OAuth sign-in
                console.log('Setting session from OAuth tokens...');
                setProcessingMessage('Completing sign-in...');
                
                // Set the session with the extracted tokens
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                
                if (error) throw error;
                
                console.log('Session set successfully from hash fragment');
                setProcessingState('success');
                setProcessingMessage('Sign-in successful!');
                
                // Redirect to dashboard for newly authenticated users
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
                }, 1000);
                
                return;
              }
            } catch (tokenErr) {
              console.error('Error processing tokens from hash fragment:', tokenErr);
              throw tokenErr;
            }
          }
        }
        
        // If no specific callback parameters are found, check current session
        await checkCurrentSession();
      } catch (err) {
        console.error('Error handling auth redirect:', err);
        setError(err.message || 'Authentication failed');
        setProcessingState('error');
        
        // Redirect based on error type
        if (err.message && err.message.includes('expired')) {
          setTimeout(() => {
            navigate('/reset-password', { 
              replace: true,
              state: { error: err.message }
            });
          }, 3000);
        } else {
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { error: err.message || 'Authentication failed. Please try again.' }
            });
          }, 3000);
        }
      }
    };
    
    // Helper function to check current session
    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('User is already authenticated');
          
          // Check if this is a recovery session
          const user = session.user;
          if (user && user.aud === 'authenticated' && user.recovery_sent_at) {
            console.log('Detected recovery session, redirecting to update password');
            setProcessingState('success');
            setProcessingMessage('Ready to update your password!');
            setTimeout(() => {
              navigate('/update-password', { replace: true });
            }, 1000);
          } else {
            console.log('Regular session, redirecting to dashboard');
            setProcessingState('success');
            setProcessingMessage('Sign-in successful!');
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1000);
          }
        } else {
          throw new Error('No authentication data found');
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
          <p className="text-xs text-center">Redirecting you to try again...</p>
        </div>
      </div>
    );
  }
  
  return null;
}