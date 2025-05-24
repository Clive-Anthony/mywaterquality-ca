// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import CallbackDebugger from './components/CallbackDebugger';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import { useState, useEffect } from 'react';

export default function App() {
  // Add a state to check if Tailwind is loaded
  const [tailwindWorks, setTailwindWorks] = useState(null);
  
  // State to handle hash fragment processing
  const [processingHash, setProcessingHash] = useState(false);

  useEffect(() => {
    // Simple check to see if Tailwind styles are applied
    const testElement = document.createElement('div');
    testElement.className = 'hidden';
    document.body.appendChild(testElement);
    
    // Check computed style - if hidden is working, Tailwind is likely working
    const computedStyle = window.getComputedStyle(testElement);
    setTailwindWorks(computedStyle.display === 'none');
    
    document.body.removeChild(testElement);
    
    console.log('Tailwind CSS working?', computedStyle.display === 'none');
    
    // Handle hash fragments on initial page load
    const handleHashFragment = () => {
      // Check if URL has a hash fragment with auth tokens
      if (window.location.hash && window.location.hash.includes('access_token=')) {
        console.log('Found access token in hash fragment, redirecting to auth callback handler');
        setProcessingHash(true);
        
        // Redirect to the auth callback route for proper processing
        const callbackPath = '/auth/callback';
        
        // Check if we're already on the callback path
        if (window.location.pathname !== callbackPath) {
          console.log('Redirecting to callback handler with hash preserved');
          
          // Preserve the hash fragment
          const currentHash = window.location.hash;
          
          // Set a session storage flag to avoid redirection loops
          sessionStorage.setItem('redirecting_auth', 'true');
          
          // Using window.location to ensure hash is preserved
          window.location.href = `${window.location.origin}${callbackPath}${currentHash}`;
        } else {
          console.log('Already on callback path, continuing with hash processing');
          setProcessingHash(false);
        }
      }
    };
    
    // Check if we should process hash or if we're already in a redirect
    if (!sessionStorage.getItem('redirecting_auth')) {
      handleHashFragment();
    } else {
      // Clear the redirect flag
      sessionStorage.removeItem('redirecting_auth');
    }
  }, []);

  // If we're processing a hash redirect, show a loading state
  if (processingHash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">Processing authentication...</h2>
          <p className="text-gray-500 text-sm">Please wait while we redirect you.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        {/* Add callback debugger (invisible component) */}
        <CallbackDebugger />
        
        {/* Add a simple visual indicator of Tailwind status */}
        {tailwindWorks !== null && (
          <div style={{ 
            position: 'fixed', 
            bottom: '10px', 
            right: '10px', 
            padding: '8px', 
            backgroundColor: tailwindWorks ? '#10B981' : '#EF4444',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 9999
          }}>
            Tailwind CSS: {tailwindWorks ? 'Working' : 'Not Working'}
          </div>
        )}
        
        <Routes>
          {/* Public home page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Protected user dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Public routes */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          
          {/* Auth redirect handler - This handles both URL parameters and hash fragments */}
          <Route path="/auth/callback" element={<AuthRedirect />} />
          
          {/* Catch any routes with access_token fragments and redirect to callback handler */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}