// src/pages/LegacyKitClaimPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

export default function LegacyKitClaimPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [kitCode, setKitCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hero section
  const ClaimKitHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Claim Your Test Kit
          </h1>
          <p className="mt-4 text-xl text-purple-100 max-w-3xl mx-auto">
            Already have a test kit? Use your kit code to claim it and register for testing.
          </p>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!kitCode.trim()) {
      setError('Please enter your kit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Authentication required. Please log in and try again.');
        return;
      }

      // Call the claim kit function
      const response = await fetch('/.netlify/functions/claim-legacy-kit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kit_code: kitCode.trim().toUpperCase()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Successfully claimed, navigate to registration page
        navigate('/register-kit', { 
          state: { 
            message: `Kit ${kitCode.toUpperCase()} successfully claimed! You can now register it.`,
            claimedKit: result.kit
          }
        });
      } else {
        // Show error message
        setError(result.error || 'Failed to claim kit');
      }

    } catch (error) {
      console.error('Error claiming kit:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout hero={<ClaimKitHero />}>
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Claim Your Test Kit
            </h2>
          </div>

          <div className="p-6">
            {/* Instructions */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    How to Find Your Kit Code
                  </h3>
                  <p className="text-blue-800 mb-3">
                    Your kit code can be found on the <strong>bottom side of the delivery box lid</strong>. 
                    It's typically a combination of letters and numbers (e.g., ABC123DEF4).
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Look for a code printed or labeled on the inside of the box lid</li>
                    <li>• The code is usually 8-10 characters long</li>
                    <li>• Enter the code exactly as shown (letters and numbers)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium mb-2">{error}</p>
                    {error.includes('no matches') && (
                      <div className="text-red-600 text-sm">
                        <p className="mb-2">
                          If you're having trouble claiming your previous test kit, please contact us:
                        </p>
                        <ul className="space-y-1">
                          <li>
                            • Through our{' '}
                            <a 
                              href="https://www.mywaterquality.ca/contact" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-red-800"
                            >
                              Contact Us form
                            </a>
                          </li>
                          <li>
                            • Email us at{' '}
                            <a 
                              href="mailto:info@mywaterquality.ca"
                              className="underline hover:text-red-800"
                            >
                              info@mywaterquality.ca
                            </a>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Claim Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="kit-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Kit Code *
                </label>
                <input
                  type="text"
                  id="kit-code"
                  value={kitCode}
                  onChange={(e) => setKitCode(e.target.value.toUpperCase())}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg font-mono tracking-wider"
                  placeholder="Enter your kit code (e.g., ABC123DEF4)"
                  required
                  disabled={loading}
                  maxLength={20}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the code exactly as shown on your delivery box lid
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !kitCode.trim()}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Claiming Kit...
                    </>
                  ) : (
                    'Claim Test Kit'
                  )}
                </button>
              </div>
            </form>

            {/* Additional Help */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
                <p className="text-sm text-gray-600 mb-2">
                  If you can't find your kit code or are having trouble claiming your kit:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Double-check the bottom side of your delivery box lid</li>
                  <li>• Make sure you're entering the code exactly as shown</li>
                  <li>• Contact our support team at info@mywaterquality.ca</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}