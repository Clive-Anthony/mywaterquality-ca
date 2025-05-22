// src/pages/UserPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/supabaseClient';

export default function UserPage() {
  const navigate = useNavigate();
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
      // Force navigation to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Exception during sign out:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0020 5.5v-1.5" />
                </svg>
                <h1 className="ml-2 text-blue-600 text-xl font-bold">MyWaterQuality.ca</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 flex items-center space-x-4">
                <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors duration-200">Dashboard</a>
                <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200">Test Kits</a>
                <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200">Results</a>
                <a href="#" className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200">Resources</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
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
                  'Sign out'
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-64">
        <div className="absolute inset-0 bg-opacity-50 bg-blue-900">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Welcome to MyWaterQuality.ca
            </h1>
            <p className="mt-3 text-blue-100 max-w-2xl">
              Test, track, and improve your water quality with our comprehensive testing kits and detailed analysis.
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Dashboard Summary */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Dashboard
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Quick overview of your water quality testing status.
            </p>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Active Test Kits</dt>
                <dd className="mt-1 text-2xl font-semibold text-blue-600">0</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Tests Completed</dt>
                <dd className="mt-1 text-2xl font-semibold text-blue-600">0</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
                <dd className="mt-1">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    None
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {/* Card 1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Order Water Testing Kit</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Purchase a comprehensive water testing kit for your home or business.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Browse Kits
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">View Test Results</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Access and analyze your previous water testing results.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                    >
                      View Results
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Water Quality Tips</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Learn best practices for improving and maintaining your water quality.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                    >
                      Read Tips
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resources Section */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Water Quality Resources</h2>
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-800 mb-3">Why Water Quality Matters</h3>
            <p className="text-blue-700 mb-4">
              Clean water is essential for health and well-being. Regular testing helps identify potential contaminants before they become health hazards.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-white p-4 rounded shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">Common Water Contaminants</h4>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li>Lead and heavy metals</li>
                  <li>Bacteria and viruses</li>
                  <li>Pesticides and chemicals</li>
                  <li>Nitrates and phosphates</li>
                </ul>
              </div>
              <div className="bg-white p-4 rounded shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">Testing Frequency</h4>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li>Annual testing for most households</li>
                  <li>Bi-annual for homes with private wells</li>
                  <li>Quarterly for homes with water quality concerns</li>
                  <li>After major plumbing work</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <h3 className="text-gray-500 text-sm">© 2025 MyWaterQuality.ca. All rights reserved.</h3>
            </div>
            <div className="flex justify-center md:justify-end mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-gray-500 mx-2">
                <span className="sr-only">Privacy</span>
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500 mx-2">
                <span className="sr-only">Terms</span>
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500 mx-2">
                <span className="sr-only">Contact</span>
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}