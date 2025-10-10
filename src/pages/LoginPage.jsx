// src/pages/LoginPage.jsx - WITH TURNSTILE BOT PROTECTION
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { signIn, signInWithGoogle } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { trackUserLogin } from '../utils/gtm';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  
  // Prevent double submissions
  const submissionInProgress = useRef(false);
  const formRef = useRef(null);

  // Check for success or error messages from navigation state
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('password_updated') === 'true') {
      setSuccessMessage('Password updated successfully! You can now log in with your new password.');
      navigate(location.pathname, { replace: true });
      return;
    }
    
    if (localStorage.getItem('password_update_success') === 'true') {
      setSuccessMessage('Password updated successfully! You can now log in with your new password.');
      localStorage.removeItem('password_update_success');
      return;
    }
    
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.error) {
      setError(location.state.error);
      navigate(location.pathname, { replace: true, state: {} });
    }

  }, [location, navigate, setSuccessMessage]);

  // Handle auth state changes - navigate when user is authenticated
  useEffect(() => {
    const handleSuccessfulAuth = async () => {
      if (waitingForAuth && user && !authLoading && isReady) {
        console.log('Auth state updated, user is now authenticated');
      
        try {
          // Check for stored return path first
          const { validateAndGetReturnPath } = await import('../utils/returnPath');
          const storedPath = await validateAndGetReturnPath(user);
          
          if (storedPath) {
            console.log('Using stored return path:', storedPath);
            navigate(storedPath, { replace: true });
          } else {
            // Fall back to role-based redirection
            const { data: userRole } = await supabase.rpc('get_user_role', {
              user_uuid: user.id
            });
            
            // console.log('No stored return path, using role-based redirect. User role:', userRole);
            
            const redirectPath = (userRole === 'admin' || userRole === 'super_admin') 
              ? '/admin-dashboard' 
              : '/dashboard';
            
            // console.log('Redirecting to:', redirectPath);
            navigate(redirectPath, { replace: true });
          }
          
        } catch (error) {
          console.error('Error determining redirect path:', error);
          navigate('/dashboard', { replace: true });
        } finally {
          setWaitingForAuth(false);
          setLoading(false);
          submissionInProgress.current = false;
        }
      }
    };

    handleSuccessfulAuth();
  }, [user, authLoading, waitingForAuth, navigate, isReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submissions
    if (submissionInProgress.current || loading) {
      console.log('Submission already in progress, blocking duplicate');
      return;
    }
    
    // Check for Turnstile token
    if (!turnstileToken) {
      setError('Please complete the verification challenge');
      return;
    }
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    
    submissionInProgress.current = true;
    setError(null);
    setLoading(true);
    
    try {
      console.log('Starting login attempt for:', email);
      
      // Verify Turnstile token on backend
      console.log('Verifying Turnstile token...');
      const verifyResponse = await fetch('/.netlify/functions/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken })
      });

      // Check if response is OK before parsing JSON
      if (!verifyResponse.ok) {
        console.error('Verification request failed:', verifyResponse.status, verifyResponse.statusText);
        throw new Error('Verification request failed. Please try again.');
      }

      // Get response text first to debug
      const responseText = await verifyResponse.text();
      // console.log('Verification response:', responseText);
      
      let verifyResult;
      try {
        verifyResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse verification response:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid verification response. Please try again.');
      }
      
      if (!verifyResult.success) {
        console.error('Turnstile verification failed:', verifyResult);
        throw new Error('Verification failed. Please try again.');
      }

      console.log('Turnstile verification successful');
      
      const { error } = await signIn(email.trim(), password);
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      console.log('Login successful, waiting for auth state to update...');
      
      // Track successful login
      try {
        await trackUserLogin('email');
      } catch (gtmError) {
        console.error('GTM tracking error (non-critical):', gtmError);
      }
      
      // Clear form on success
      setEmail('');
      setPassword('');
      setTurnstileToken(null);
      
      // Set flag to wait for auth context to update
      setWaitingForAuth(true);
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Reset loading states on error
      setLoading(false);
      submissionInProgress.current = false;
      setWaitingForAuth(false);
      
      // Handle specific error messages
      if (err.message?.includes('invalid_credentials') || err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.message?.includes('too_many_requests')) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else if (err.message?.includes('email_not_confirmed')) {
        setError('Please check your email and click the verification link before logging in.');
      } else if (err.message?.includes('Verification failed')) {
        setError('Bot verification failed. Please try again.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    // Prevent multiple Google sign-in attempts
    if (googleLoading) {
      return;
    }
    
    setError(null);
    setGoogleLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // OAuth redirect will handle navigation
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  // Disable form during loading or waiting for auth
  const formDisabled = loading || googleLoading || waitingForAuth;

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
              Welcome back
            </h2>
            <p className="text-gray-500 mb-6">
              Sign in to your My Water Quality account
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

            {/* Google Sign In Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={formDisabled}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {googleLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <form ref={formRef} className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={formDisabled}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="text-sm">
                    <Link to="/reset-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={formDisabled}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  disabled={formDisabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              {/* Turnstile Widget */}
              <div>
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                    console.log('Turnstile challenge completed');
                  }}
                  onError={() => {
                    setTurnstileToken(null);
                    console.error('Turnstile error occurred');
                  }}
                  onExpire={() => {
                    setTurnstileToken(null);
                    console.log('Turnstile token expired');
                  }}
                  theme="light"
                  size="normal"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={formDisabled || !turnstileToken}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {waitingForAuth ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing sign in...
                    </div>
                  ) : loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in with Email'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 sm:px-10">
            <p className="text-sm text-center text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                Create account
              </Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-8">
          Protected by strong encryption. Your water quality data is secure.
        </p>
      </div>
    </div>
  );
}