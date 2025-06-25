// src/pages/TestKitsPage.jsx - Updated with priority ordering
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

export default function TestKitsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getItemQuantity, isInCart, loading: cartLoading } = useCart();
  
  const [testKits, setTestKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  
  // State to track quantities for each kit
  const [quantities, setQuantities] = useState({});

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

  // Handle add to cart button click
  const handleAddToCart = async (kit) => {
    // Check if user is authenticated
    if (!user) {
      setSelectedKit(kit);
      setShowLoginPrompt(true);
      return;
    }

    // Get the quantity for this kit
    const quantity = quantities[kit.id] || 1;

    // Check stock
    if (kit.quantity <= 0) {
      setError('This item is out of stock');
      return;
    }

    if (quantity > kit.quantity) {
      setError(`Only ${kit.quantity} items available in stock`);
      return;
    }

    setAddingToCart(prev => ({ ...prev, [kit.id]: true }));
    setError(null);

    try {
      const { success, error: cartError } = await addToCart(kit, quantity);
      
      if (!success) {
        throw cartError;
      }

      setSuccessMessage(`${quantity} x ${kit.name} added to cart!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [kit.id]: false }));
    }
  };

  // Handle login prompt actions
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/login', { 
      state: { 
        message: 'Please log in to add items to your cart',
        returnTo: '/test-kits'
      }
    });
  };

  const handleSignupRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/signup', { 
      state: { 
        message: 'Create an account to start shopping',
        returnTo: '/test-kits'
      }
    });
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

  // Get add to cart button content
  const getAddToCartButton = (kit) => {
    const inStock = isInStock(kit.quantity);
    const itemQuantity = getItemQuantity(kit.id);
    const isAdding = addingToCart[kit.id];
    const inCart = isInCart(kit.id);
    const selectedQuantity = quantities[kit.id] || 1;

    if (!inStock) {
      return {
        text: 'Out of Stock',
        disabled: true,
        className: 'bg-gray-100 text-gray-400 cursor-not-allowed'
      };
    }

    if (isAdding) {
      return {
        text: 'Adding...',
        disabled: true,
        className: 'bg-blue-400 text-white cursor-not-allowed'
      };
    }

    if (inCart) {
      return {
        text: `Add ${selectedQuantity} More (${itemQuantity} in cart)`,
        disabled: false,
        className: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
      };
    }

    return {
      text: user ? `Add ${selectedQuantity} to Cart` : 'Login to Add to Cart',
      disabled: false,
      className: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    };
  };

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
              <p className="text-gray-600">
                All test kits include professional laboratory analysis and detailed results within 5-7 business days.
                {/* <span className="block text-sm text-blue-600 mt-1">
                  ✨ Test kits are displayed in order of priority based on our recommendations.
                </span> */}
              </p>
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
                const buttonProps = getAddToCartButton(kit);
                const currentQuantity = quantities[kit.id] || 1;
                
                return (
                  <div 
                    key={kit.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
                  >
                    {/* Card Header */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                        <div className="h-12 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-6">
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
                          {kit.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer - Fixed height and positioning */}
                    <div className="px-6 pb-6 mt-auto">
                      {/* Quantity Selector */}
                      {isInStock(kit.quantity) && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleQuantityChange(kit.id, currentQuantity - 1)}
                              disabled={currentQuantity <= 1}
                              className="w-8 h-8 rounded-l border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={kit.quantity}
                              value={currentQuantity}
                              onChange={(e) => handleQuantityChange(kit.id, e.target.value)}
                              className="w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleQuantityChange(kit.id, currentQuantity + 1)}
                              disabled={currentQuantity >= kit.quantity}
                              className="w-8 h-8 rounded-r border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {/* Max: {kit.quantity} */}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleAddToCart(kit)}
                        disabled={buttonProps.disabled}
                        className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${buttonProps.className}`}
                      >
                        {buttonProps.text}
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

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
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
              
              {selectedKit && (
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="text-sm text-gray-700">
                    Selected: <span className="font-medium">{selectedKit.name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Quantity: {quantities[selectedKit.id] || 1}
                  </p>
                  <p className="text-sm text-gray-600">
                    Price: {formatPrice(selectedKit.price * (quantities[selectedKit.id] || 1))}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleLoginRedirect}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Log In
                </button>
                <button
                  onClick={handleSignupRedirect}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium transition-colors duration-200"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
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