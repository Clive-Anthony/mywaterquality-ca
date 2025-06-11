// src/pages/SignupPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp, signInWithGoogle } from '../lib/supabaseClient';

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Form validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await signUp(
        formData.email, 
        formData.password, 
        formData.firstName, 
        formData.lastName
      );
      
      if (error) {
        throw error;
      }
      
      setSuccessMessage('Success! Please check your email for a verification link to complete your account setup.');
      
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // OAuth redirect will handle navigation
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google');
      setGoogleLoading(false);
    }
  };

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
              Create your account
            </h2>
            <p className="text-gray-500 mb-6">
              Join My Water Quality to test your drinking water quality
            </p>
            
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
            
            {successMessage && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded" role="alert">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Google Sign Up Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
              >
                {googleLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing up...
                  </div>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
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
                      Creating account...
                    </div>
                  ) : (
                    'Create Account with Email'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 sm:px-10">
            <p className="text-sm text-center text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-8">
          By creating an account, you agree to our <a href="#" className="underline hover:text-blue-500">Terms of Service</a> and <a href="#" className="underline hover:text-blue-500">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}