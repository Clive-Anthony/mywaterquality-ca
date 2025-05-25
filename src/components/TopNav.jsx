// src/components/TopNav.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/supabaseClient';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        return;
      }
      // Reload the page to refresh the auth state
      window.location.reload();
    } catch (error) {
      console.error('Exception during sign out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine if a link is active
  const isActivePage = (path) => {
    return location.pathname === path;
  };

  // Helper function to get link styling based on active state
  const getLinkClassName = (path, isUserOnly = false) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    
    if (isActivePage(path)) {
      return `${baseClasses} text-blue-600 bg-blue-50`;
    } else {
      return `${baseClasses} text-gray-700 hover:text-blue-600 hover:bg-blue-50`;
    }
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0020 5.5v-1.5" />
              </svg>
              <h1 className="text-xl font-bold text-blue-600 ml-2">MyWaterQuality</h1>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4 ml-6">
            {/* Test Kits - Always visible */}
            <Link 
              to="/test-kits" 
              className={getLinkClassName('/test-kits')}
            >
              Test Kits
            </Link>
            
            {/* User-only navigation links */}
            {user && (
              <>
                <Link 
                  to="/dashboard" 
                  className={getLinkClassName('/dashboard', true)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/results" 
                  className={getLinkClassName('/results', true)}
                >
                  Results
                </Link>
                <Link 
                  to="/resources" 
                  className={getLinkClassName('/resources', true)}
                >
                  Resources
                </Link>
              </>
            )}
          </div>
          
          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon */}
            <div className="text-gray-400 cursor-default">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            {/* User info if authenticated */}
            {user && (
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                  {user?.email}
                </span>
              </div>
            )}
            
            {/* Conditional Authentication Buttons */}
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing out...
                  </span>
                ) : (
                  'Sign Out'
                )}
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}