// src/pages/TestKitsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../lib/supabaseClient';

export default function TestKitsPage() {
  const [testKits, setTestKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch test kits from Supabase
  useEffect(() => {
    const fetchTestKits = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching test kits from Supabase...');
        
        const { data, error } = await supabase
          .from('test_kits')
          .select('*')
          .order('price', { ascending: true });

        if (error) {
          console.error('Error fetching test kits:', error);
          throw error;
        }

        console.log('Test kits fetched successfully:', data);
        setTestKits(data || []);
      } catch (err) {
        console.error('Exception fetching test kits:', err);
        setError(err.message || 'Failed to load test kits');
      } finally {
        setLoading(false);
      }
    };

    fetchTestKits();
  }, []);

  // Hero section for the test kits page
  const TestKitsHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Water Testing Kits
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Professional-grade water testing kits for comprehensive analysis of your drinking water. 
            Choose the right kit for your specific testing needs.
          </p>
        </div>
      </div>
    </div>
  );

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // Check if kit is in stock
  const isInStock = (quantity) => quantity > 0;

  // Get stock status text and styling
  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return { text: 'Out of Stock', className: 'bg-red-100 text-red-800' };
    } else if (quantity <= 10) {
      return { text: 'Low Stock', className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'In Stock', className: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <PageLayout hero={<TestKitsHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Loading test kits...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-8">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium">Error Loading Test Kits</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Test Kits Found */}
        {!loading && !error && testKits.length === 0 && (
          <div className="text-center py-12">
            <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Kits Available</h3>
            <p className="text-gray-500">Please check back later for available water testing kits.</p>
          </div>
        )}

        {/* Test Kits Grid */}
        {!loading && !error && testKits.length > 0 && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Test Kits</h2>
              <p className="text-gray-600">
                All test kits include professional laboratory analysis and detailed results within 5-7 business days.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {testKits.map((kit) => {
                const stockStatus = getStockStatus(kit.quantity);
                const inStock = isInStock(kit.quantity);
                
                return (
                  <div 
                    key={kit.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  >
                    {/* Card Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {kit.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockStatus.className}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {kit.description}
                      </p>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-blue-600">
                          {formatPrice(kit.price)}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">CAD</span>
                      </div>
                      
                      {/* Stock Quantity */}
                      <div className="text-sm text-gray-500 mb-4">
                        {kit.quantity > 0 ? (
                          `${kit.quantity} available`
                        ) : (
                          'Currently out of stock'
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 pb-6">
                      <button
                        disabled={!inStock}
                        className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${
                          inStock
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                      
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Free shipping on all orders
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Features Section */}
        <div className="mt-16 border-t border-gray-200 pt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Why Choose Our Water Testing Kits?
          </h2>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Certified Labs</h3>
              <p className="text-gray-600 text-sm">
                All testing performed by certified laboratories with ISO 17025 accreditation.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Fast Results</h3>
              <p className="text-gray-600 text-sm">
                Receive detailed results within 5-7 business days of sample submission.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Clear Reports</h3>
              <p className="text-gray-600 text-sm">
                Easy-to-understand report cards with actionable recommendations.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 110 19.5 9.75 9.75 0 010-19.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Expert Support</h3>
              <p className="text-gray-600 text-sm">
                Get help from water quality experts to understand your results.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Not Sure Which Kit to Choose?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our water quality experts can help you select the right testing kit based on your specific concerns and water source.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              Contact an Expert
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Create Account & Order
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}