// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
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
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Public routes */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Auth redirect handler */}
          <Route path="/auth/callback" element={<AuthRedirect />} />
          
          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}