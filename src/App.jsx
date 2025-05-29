// src/App.jsx - Add the UpdatePasswordPage route
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import CallbackDebugger from './components/CallbackDebugger';
// import CartDebugger from './components/CartDebugger'; // ADD THIS LINE
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage'; // ADD THIS IMPORT
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import TestKitsPage from './pages/TestKitsPage';
import WaterSamplingInstructionsPage from './pages/WaterSamplingInstructionsPage';
import CheckoutPage from './pages/CheckoutPage';
import PayPalTest from './components/PayPalTest';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import ProcessPage from './pages/ProcessPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
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
      <CartProvider>
        <Router>
          {/* Add callback debugger (invisible component) */}
          <CallbackDebugger />
          
          {/* ADD THIS LINE - Cart Debugger
          <CartDebugger /> */}
          
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
            
            {/* Public test kits page */}
            <Route path="/test-kits" element={<TestKitsPage />} />

            {/* Public Contact page */}
            <Route path="/contact" element={<ContactPage />} />

            {/* Public About Us page */}
            <Route path="/about-us" element={<AboutPage />} />

            {/* Public FAQ page */}
            <Route path="/faq" element={<FAQPage />} />
            
            {/* Public Terms and Conditions page */}
            <Route path="/terms-and-conditions" element={<TermsConditionsPage/>} />

            {/* Public Process page */}
            <Route path="/process" element={<ProcessPage />} />

            {/* Public Water Sampling Instructions */}
            <Route path="/sampling-instructions" element={<WaterSamplingInstructionsPage />} />

            {/* PAYPAL TEST ROUTE - Add this temporarily */}
            <Route path="/paypal-test" element={<PayPalTest />} />
          
            
            {/* Protected checkout page */}
            <Route 
              path="/checkout" 
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected order history page */}
            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              } 
            />
            
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
            
            {/* ADD THIS ROUTE - Update Password Page */}
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            
            {/* Auth redirect handler - This handles both URL parameters and hash fragments */}
            <Route path="/auth/callback" element={<AuthRedirect />} />
            
            {/* Catch all other routes and redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}