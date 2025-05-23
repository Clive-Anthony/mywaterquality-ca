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
  }, []);

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
          
          {/* Catch all other routes and redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}