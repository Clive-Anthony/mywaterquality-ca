// src/components/AuthRedirect.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processingState, setProcessingState] = useState('processing'); // 'processing', 'success', 'error'

  useEffect(() => {
    // This effect runs when the component mounts
    const handleRedirect = async () => {
      try {
        console.log('AuthRedirect: Processing authentication callback');
        
        // Log the current URL for debugging
        console.log('Current URL:', window.location.href);
        
        // Check for error parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (errorCode) {
          console.error('OAuth error in URL params:', errorCode, errorDescription);
          throw new Error(`${errorCode}: ${errorDescription || 'Unknown error'}`);
        }
        
        // Look for hash fragments which might contain tokens
        if (window.location.hash) {
          console.log('Found hash fragment, attempting to extract session...');
        }
        
        // Try to get the session from URL (works with hash fragments)
        const { data, error } = await supabase.auth.getSessionFromUrl();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          console.log('Successfully extracted session from URL');
          setProcessingState('success');
          
          // Short delay before redirecting to home page
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000);
        } else {
          // If we don't have a session but also don't have an error, check current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('No session in URL, but user is already authenticated');
            setProcessingState('success');
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          } else {
            throw new Error('No authentication data found in URL and user is not authenticated');
          }
        }
      } catch (err) {
        console.error('Error handling auth redirect:', err);
        setError(err.message || 'Authentication failed');
        setProcessingState('error');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleRedirect();
  }, [navigate]);

  // Show different UI based on the processing state
  if (processingState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-4 rounded-md shadow bg-white max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800">Completing authentication...</h2>
          <p className="text-gray-500 mt-2">Please wait while we log you in.</p>
        </div>
      </div>
    );
  }
  
  if (processingState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-4 rounded-md shadow bg-white max-w-md text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-800">Authentication successful!</h2>
          <p className="text-gray-500 mt-2">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (processingState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-4 bg-red-50 text-red-700 rounded-md shadow max-w-md">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium mb-2 text-center">Authentication Error</h2>
          <p className="text-center">{error}</p>
          <p className="mt-4 text-sm text-center">Redirecting you to the login page...</p>
        </div>
      </div>
    );
  }
  
  // Fallback UI (shouldn't normally be reached)
  return null;
}