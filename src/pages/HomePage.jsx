// src/pages/HomePage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/supabaseClient';

export default function HomePage() {
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
      // Reload the page to refresh the auth state
      window.location.reload();
    } catch (error) {
      console.error('Exception during sign out:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">MyWaterQuality</h1>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              {/* Cart Icon (non-clickable) */}
              <div className="text-gray-400 cursor-default">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              
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

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
              Can You Trust Your Drinking Water?
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-blue-100">
              We can tell you! My Water Quality provides comprehensive water testing results in an understandable report card format that gives you the knowledge to make informed decisions about the safety of drinking water.
            </p>
            <div className="mt-10 flex justify-center space-x-4">
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Get Started
              </Link>
              <Link
                to="#learn-more"
                className="inline-flex items-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="learn-more" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose MyWaterQuality?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Professional water testing made simple and accessible for everyone
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Comprehensive Testing</h3>
              <p className="mt-2 text-gray-600">
                Test for over 100 contaminants including bacteria, heavy metals, pesticides, and more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Easy-to-Read Results</h3>
              <p className="mt-2 text-gray-600">
                Get your results in a clear, report card format that's easy to understand and act upon.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Fast Results</h3>
              <p className="mt-2 text-gray-600">
                Receive your detailed water quality report within 5-7 business days of submitting your sample.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Simple steps to get your water tested
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Order Your Kit</h3>
              <p className="mt-2 text-gray-600">
                Choose your testing kit and we'll ship it directly to your home.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Collect Your Sample</h3>
              <p className="mt-2 text-gray-600">
                Follow the simple instructions to collect your water sample at home.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Get Your Results</h3>
              <p className="mt-2 text-gray-600">
                Receive detailed results and recommendations within a week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Test Your Water?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join thousands of Canadians who trust MyWaterQuality for their water testing needs.
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-4">MyWaterQuality</h3>
              <p className="text-gray-300 mb-4">
                Professional water testing services for Canadian homes and businesses. 
                Get the knowledge you need to make informed decisions about your water quality.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700">
            <p className="text-center text-gray-300">
              © 2025 MyWaterQuality.ca. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}