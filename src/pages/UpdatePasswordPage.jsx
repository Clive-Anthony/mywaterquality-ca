// src/pages/UpdatePasswordPage.jsx - FIXED VERSION
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const authListenerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkRecoverySession = async () => {
      try {
        console.log('Validating recovery session...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Session check result:', !!session);
        
        if (!session) {
          console.log('No session found, redirecting to reset password');
          navigate('/reset-password', { 
            state: { error: 'Invalid or expired reset link. Please request a new one.' }
          });
          return;
        }
        
        // Check if user exists and session is valid
        console.log('Checking user data...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User validation error:', userError);
          navigate('/reset-password', { 
            state: { error: 'Session validation failed. Please request a new reset link.' }
          });
          return;
        }
        
        if (!user) {
          console.log('No user found, redirecting to reset password');
          navigate('/reset-password', { 
            state: { error: 'Invalid session. Please request a new reset link.' }
          });
          return;
        }
        
        console.log('Valid recovery session found for user:', user.email);
        setValidatingToken(false);
        
      } catch (err) {
        console.error('Session validation error:', err);
        
        navigate('/reset-password', { 
          state: { error: 'An error occurred validating your session. Please try again.' }
        });
      }
    };

    checkRecoverySession();
  }, [navigate, location]);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clean up auth listener and timeout on unmount
      if (authListenerRef.current) {
        authListenerRef.current.subscription?.unsubscribe();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting password update process...');
      
      // Set up auth state listener to detect successful password update
      const handleAuthStateChange = (event, session) => {
        console.log('Auth state change during password update:', event);
        
        if (event === 'USER_UPDATED' && session?.user) {
          console.log('Password updated successfully for user:', session.user.email);
          
          // Clean up listener
          if (authListenerRef.current) {
            authListenerRef.current.subscription?.unsubscribe();
            authListenerRef.current = null;
          }
          
          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // Set loading to false and redirect
          setLoading(false);
          
          console.log('Password update successful, redirecting to login...');
          
          // Use setTimeout to ensure the success is visible to the user briefly
          setTimeout(() => {
            // Hard redirect to login page with success indicator
            window.location.replace('/login?password_updated=true');
          }, 1000);
        }
      };

      // Set up the auth listener
      console.log('Setting up auth state listener...');
      authListenerRef.current = supabase.auth.onAuthStateChange(handleAuthStateChange);
      
      // Set up timeout as fallback (longer timeout)
      timeoutRef.current = setTimeout(() => {
        console.warn('Password update taking longer than expected...');
        
        // Clean up listener
        if (authListenerRef.current) {
          authListenerRef.current.subscription?.unsubscribe();
          authListenerRef.current = null;
        }
        
        setLoading(false);
        setError('The password update is taking longer than expected. Please check if it worked by trying to log in with your new password.');
      }, 60000); // 60 second fallback timeout
      
      // Call the password update
      console.log('Calling updateUser...');
      supabase.auth.updateUser({
        password: password
      }).then((result) => {
        console.log('UpdateUser promise resolved:', result);
        
        // Check for immediate errors
        if (result.error) {
          // Clean up listener and timeout
          if (authListenerRef.current) {
            authListenerRef.current.subscription?.unsubscribe();
            authListenerRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setLoading(false);
          
          // Handle specific errors
          if (result.error.message?.includes('same password') || 
              result.error.message?.includes('different from the old password')) {
            setError('Please choose a different password than your current one.');
          } else if (result.error.message?.includes('weak password')) {
            setError('Password is too weak. Please choose a stronger password.');
          } else if (result.error.message?.includes('invalid')) {
            setError('Invalid session. Please request a new password reset link.');
          } else {
            setError(result.error.message || 'Failed to update password. Please try again.');
          }
        }
        // If no error, the auth state listener will handle the success case
      }).catch((err) => {
        console.error('UpdateUser promise rejected:', err);
        
        // Clean up listener and timeout
        if (authListenerRef.current) {
          authListenerRef.current.subscription?.unsubscribe();
          authListenerRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setLoading(false);
        setError(err.message || 'Failed to update password. Please try again.');
      });
      
    } catch (err) {
      console.error('Password update setup error:', err);
      
      // Clean up
      if (authListenerRef.current) {
        authListenerRef.current.subscription?.unsubscribe();
        authListenerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setLoading(false);
      setError(err.message || 'Failed to update password. Please try again.');
    }
  };

  // Show loading while validating token
  if (validatingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">Validating session...</h2>
          <p className="text-gray-500 text-sm">Please wait while we verify your request.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">My Water Quality</h1>
          <div className="flex justify-center">
            <div className="h-1 w-16 bg-blue-400 rounded"></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Set new password
            </h2>
            <p className="text-gray-500 mb-6">
              Choose a new password that's different from your current one.
            </p>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter new password (different from current)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 6 characters and different from your current password
                </p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating password...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 sm:px-10">
            <p className="text-sm text-center text-gray-500">
              Having trouble?{' '}
              <button 
                onClick={() => navigate('/reset-password')}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Request new reset link
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}