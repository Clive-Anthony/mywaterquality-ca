// src/components/AuthRedirect.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    // This effect runs when the component mounts
    const handleRedirect = async () => {
      try {
        // The URL contains a hash with the token
        const { hashParams, error } = await supabase.auth.getSessionFromUrl();
        
        if (error) {
          throw error;
        }

        console.log('Successful auth redirect. Navigating to home...');
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Error handling auth redirect:', err);
        setError(err.message || 'Authentication failed');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      {error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md shadow max-w-md">
          <h2 className="text-lg font-medium mb-2">Authentication Error</h2>
          <p>{error}</p>
          <p className="mt-4 text-sm">Redirecting you to the login page...</p>
        </div>
      ) : (
        <div className="p-4 rounded-md shadow bg-white max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800">Completing authentication...</h2>
          <p className="text-gray-500 mt-2">Please wait while we log you in.</p>
        </div>
      )}
    </div>
  );
}