// src/components/AuthRedirect.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, verifyEmailToken } from '../lib/supabaseClient';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState('processing'); // 'processing', 'success', 'error'

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('AuthRedirect: Processing authentication callback');
        console.log('Current URL:', window.location.href);
        
        // Check for error parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (errorCode) {
          console.error('OAuth error in URL params:', errorCode, errorDescription);
          throw new Error(`${errorCode}: ${errorDescription || 'Unknown error'}`);
        }
        
        // Check for email verification parameters
        const type = urlParams.get('type');
        const token = urlParams.get('token');
        
        // Handle email verification callback
        if (type === 'signup' && token) {
          console.log('Processing email verification token...');
          
          const { data, error } = await verifyEmailToken(token);
          
          if (error) {
            throw new Error(`Email verification failed: ${error.message}`);
          }
          
          console.log('Email verified successfully');
          setProcessingState('success');
          
          // Redirect to login page after successful verification
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { message: 'Email verified successfully! You can now log in.' }
            });
          }, 2000);
          
          return;
        }
        
        // Check for OAuth callback (Google sign-in)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Processing OAuth callback...');
          
          try {
            // Parse the hash fragment
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken) {
              console.log('Setting session from OAuth tokens...');
              
              // Set the session with the extracted tokens
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (error) throw error;
              
              console.log('OAuth session set successfully');
              setProcessingState('success');
              
              // Redirect to dashboard for OAuth users
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 1000);
            } else {
              throw new Error('No access token found in OAuth callback');
            }
          } catch (tokenErr) {
            console.error('Error processing OAuth tokens:', tokenErr);
            await checkCurrentSession();
          }
        } else {
          // No specific callback parameters, check current session
          await checkCurrentSession();
        }
      } catch (err) {
        console.error('Error handling auth redirect:', err);
        setError(err.message || 'Authentication failed');
        setProcessingState('error');
        
        // Redirect to login after error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };
    
    // Helper function to check current session
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('User is already authenticated, redirecting to dashboard');
        setProcessingState('success');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        throw new Error('No authentication data found');
      }
    };

    handleRedirect();
  }, [navigate]);

  // Render different UI based on processing state
  if (processingState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">Processing authentication...</h2>
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
          <h2 className="text-lg font-medium text-gray-800 mb-2">Success!</h2>
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
          <p className="text-xs text-center">Redirecting to login page...</p>
        </div>
      </div>
    );
  }
  
  return null;
}