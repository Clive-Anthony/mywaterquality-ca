// src/pages/TestKitsPage.jsx - Updated with product page links and reusable components
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import QuantitySelector from '../components/QuantitySelector';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useCartActions } from '../hooks/useCartActions';
import { 
  formatPrice, 
  getStockStatus, 
  isInStock,
  generateSlug,
  searchTestKitsByParameters 
} from '../utils/testKitHelpers';

export default function TestKitsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [testKits, setTestKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State to track quantities for each kit
  const [quantities, setQuantities] = useState({});

  // Use cart actions hook
  const {
    handleAddToCart,
    handleLoginRedirect,
    handleSignupRedirect,
    closeLoginPrompt,
    clearError,
    clearSuccessMessage,
    loading: cartLoading,
    error: cartError,
    successMessage,
    showLoginPrompt,
    selectedKit,
    getAddToCartButtonProps,
    isAddingToCart
  } = useCartActions();

  // Fetch test kits from Supabase with priority ordering
  useEffect(() => {
    const fetchTestKits = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // console.log('Fetching test kits from Supabase with priority ordering...');
        
        const { data, error } = await supabase
          .from('test_kits')
          .select('*')
          .eq('environment','prod')
          .order('priority', { ascending: true, nullsLast: true }) // Order by priority first (nulls last)
          .order('price', { ascending: true }); // Then by price as secondary sort

        if (error) {
          console.error('Error fetching test kits:', error);
          throw error;
        }

        // console.log('Test kits fetched successfully with priority ordering:', data);
        setTestKits(data || []);
        
        // Initialize quantities state
        const initialQuantities = {};
        (data || []).forEach(kit => {
          initialQuantities[kit.id] = 1;
        });
        setQuantities(initialQuantities);
        
      } catch (err) {
        console.error('Exception fetching test kits:', err);
        setError(err.message || 'Failed to load test kits');
      } finally {
        // CRITICAL: Always set loading to false
        // console.log('Setting loading to false');
        setLoading(false);
      }
    };

    fetchTestKits();
  }, []); // Empty dependency array

  // Handle quantity change for a specific kit
  const handleQuantityChange = (kitId, newQuantity) => {
    // Ensure quantity is at least 1 and no more than available stock
    const kit = testKits.find(k => k.id === kitId);
    const maxQuantity = kit ? kit.quantity : 1;
    
    const validQuantity = Math.max(1, Math.min(parseInt(newQuantity) || 1, maxQuantity));
    
    setQuantities(prev => ({
      ...prev,
      [kitId]: validQuantity
    }));
  };

  // Handle add to cart with cart actions hook
  const onAddToCart = async (kit) => {
    const quantity = quantities[kit.id] || 1;
    await handleAddToCart(kit, quantity);
  };

  // Handle parameter search
  const handleParameterSearch = async (term) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { testKits: results, error: searchError } = await searchTestKitsByParameters(term);
      
      if (searchError) {
        console.error('Search error:', searchError);
        setSearchResults([]);
      } else {
        setSearchResults(results || []);
      }
    } catch (error) {
      console.error('Search exception:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleParameterSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Generate slug for test kit (fallback if slug doesn't exist in DB)
  const getTestKitSlug = (testKit) => {
    return testKit.slug || generateSlug(testKit.name);
  };

  // Hero section for the test kits page
  const TestKitsHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Drinking Water Testing Kits
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Professional-grade water testing kits for comprehensive analysis of your drinking water. 
            Choose the right kit for your specific testing needs.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<TestKitsHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">{successMessage}</span>
              <button 
                onClick={clearSuccessMessage}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Cart Error */}
        {cartError && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-700">{cartError}</span>
              <button 
                onClick={clearError}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
              <p className="text-gray-600 mb-6">
                All test kits include professional laboratory analysis and detailed results within 5-7 business days.
                {/* <span className="block text-sm text-blue-600 mt-1">
                  ✨ Test kits are displayed in order of priority based on our recommendations.
                </span> */}
              </p>

              {/* Parameter Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <input
                    type="text"
                    placeholder="Search by parameter (e.g., lead, chloride, iron)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg 
                    className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {isSearching && (
                    <div className="absolute right-3 top-3.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                
                {/* Search Results */}
                {searchTerm.length >= 2 && searchResults.length > 0 && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-3">
                      Found {searchResults.length} test kit{searchResults.length !== 1 ? 's' : ''} with matching parameters:
                    </h3>
                    <div className="space-y-2">
                      {searchResults.slice(0, 5).map((result) => (
                        <div key={result.id}>
                          <Link 
                            to={`/shop/${result.slug}`}
                            className="text-blue-700 hover:text-blue-900 font-medium text-sm"
                          >
                            {result.name}
                          </Link>
                        </div>
                      ))}
                      {searchResults.length > 5 && (
                        <p className="text-xs text-blue-600 pt-2 border-t border-blue-200">
                          + {searchResults.length - 5} more results
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      No test kits found with parameters matching "{searchTerm}". Try a different search term.
                    </p>
                  </div>
                )}
              </div>

              {!user && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-blue-800">
                      <Link to="/login" className="font-medium underline hover:text-blue-600">
                        Log in
                      </Link> or <Link to="/signup" className="font-medium underline hover:text-blue-600">
                        create an account
                      </Link> to add items to your cart and checkout.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {testKits.map((kit, index) => {
                const stockStatus = getStockStatus(kit.quantity);
                const buttonProps = getAddToCartButtonProps(kit, quantities[kit.id] || 1);
                const currentQuantity = quantities[kit.id] || 1;
                const slug = getTestKitSlug(kit);
                
                return (
                  <div 
                    key={kit.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
                  >
                    {/* Card Header - Clickable to product page */}
                    <Link to={`/shop/${slug}`} className="block">
                      <div className="p-6 pb-4 hover:bg-gray-50 transition-colors duration-200">
                        <div className="mb-4">
                          <div className="h-12 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-6 hover:text-blue-600 transition-colors duration-200">
                              {kit.name}
                            </h3>
                          </div>
                          
                          {/* Price */}
                          <div className="mb-3">
                            <span className="text-3xl font-bold text-blue-600">
                              {formatPrice(kit.price)}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">CAD</span>
                          </div>
                          
                          <p className="text-gray-600 text-sm line-clamp-3 flex-1">
                            {kit.description || "Click to see parameters and learn how this test kit can support your drinking water quality"}
                          </p>
                        </div>
                        
                        {/* Parameters count */}
                        {kit.num_parameters && (
                          <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {kit.num_parameters} parameters tested
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Card Footer - Non-clickable actions */}
                    <div className="px-6 pb-6 mt-auto">
                      {/* View Details Link */}
                      <div className="mb-4">
                        <Link 
                          to={`/shop/${slug}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                        >
                          View Details & Parameters →
                        </Link>
                      </div>
                      
                      {/* Quantity Selector */}
                      {isInStock(kit.quantity) && (
                        <div className="mb-4">
                          <QuantitySelector
                            quantity={currentQuantity}
                            maxQuantity={kit.quantity}
                            onQuantityChange={(newQuantity) => handleQuantityChange(kit.id, newQuantity)}
                            disabled={isAddingToCart(kit.id)}
                            size="default"
                          />
                        </div>
                      )}
                      
                      <button
                        onClick={() => onAddToCart(kit)}
                        disabled={buttonProps.disabled}
                        className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${buttonProps.className}`}
                      >
                        {buttonProps.showSpinner && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {buttonProps.text}
                      </button>
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Login Prompt Modal */}
        {showLoginPrompt && selectedKit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Login Required</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                You need to be logged in to add items to your cart. Please log in to your existing account or create a new one.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-700">
                  Selected: <span className="font-medium">{selectedKit.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Quantity: {selectedKit.quantity}
                </p>
                <p className="text-sm text-gray-600">
                  Price: {formatPrice(selectedKit.price * selectedKit.quantity)}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleLoginRedirect('/shop')}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleSignupRedirect('/shop')}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium transition-colors duration-200"
                >
                  Sign Up
                </button>
                <button
                  onClick={closeLoginPrompt}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
            Not Sure Which Drinking Water Test Kit to Choose?
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
            {!user ? (
              <Link
                to="/signup"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Create Account & Order
              </Link>
            ) : (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Browse Kits Above
              </button>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}