// src/components/TopNav.jsx - Enhanced with Learn dropdown and Contact Us link
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { signOut } from '../lib/supabaseClient';

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartSummary, cartItems, updateCartItemQuantity, removeFromCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [showLearnDropdown, setShowLearnDropdown] = useState(false);
  const [updatingItems, setUpdatingItems] = useState({}); // Track which items are being updated
  const learnDropdownRef = useRef(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (learnDropdownRef.current && !learnDropdownRef.current.contains(event.target)) {
        setShowLearnDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // Handle cart item quantity update
  const handleCartItemUpdate = async (itemId, newQuantity) => {
    setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
    
    try {
      if (newQuantity <= 0) {
        await removeFromCart(itemId);
      } else {
        await updateCartItemQuantity(itemId, newQuantity);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle cart item removal
  const handleCartItemRemove = async (itemId) => {
    setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
    
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing cart item:', error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle cart click
  const handleCartClick = () => {
    if (!user) {
      navigate('/login', { 
        state: { message: 'Please log in to view your cart' }
      });
      return;
    }

    if (cartSummary.totalItems === 0) {
      navigate('/test-kits');
      return;
    }

    setShowCartDropdown(!showCartDropdown);
  };

  // Handle checkout navigation
  const handleCheckout = () => {
    setShowCartDropdown(false);
    
    if (!user) {
      navigate('/login', { 
        state: { message: 'Please log in to proceed to checkout' }
      });
      return;
    }

    if (cartSummary.totalItems === 0) {
      navigate('/test-kits');
      return;
    }

    navigate('/checkout');
  };
  
  return (
    <header className="bg-white shadow-sm relative">
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

            {/* Learn Dropdown - Always visible */}
            <div className="relative" ref={learnDropdownRef}>
              <button
                onClick={() => setShowLearnDropdown(!showLearnDropdown)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
                  location.pathname.includes('/learn') || location.pathname.includes('/water-sampling-instructions')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Learn
                <svg 
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${showLearnDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Learn Dropdown Menu */}
              {showLearnDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <Link
                      to="/sampling-instructions"
                      onClick={() => setShowLearnDropdown(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3"></span>
                        <div>
                          <div className="font-medium"><strong>Water Sampling Instructions</strong></div>
                          <div className="text-xs text-gray-500">Step-by-step sampling guide</div>
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/process"
                      onClick={() => setShowLearnDropdown(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3"></span>
                        <div>
                          <div className="font-medium"><strong>MyWaterQuality Process</strong></div>
                          <div className="text-xs text-gray-500">Learn how our testing works</div>
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/about-us"
                      onClick={() => setShowLearnDropdown(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3"></span>
                        <div>
                          <div className="font-medium"><strong>About Us</strong></div>
                          <div className="text-xs text-gray-500">Meet our team!</div>
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/faq"
                      onClick={() => setShowLearnDropdown(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3"></span>
                        <div>
                          <div className="font-medium"><strong>FAQ</strong></div>
                          <div className="text-xs text-gray-500">Your questions - answered</div>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    {/* Future learn content can be added here */}
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-500">More learning resources coming soon...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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
            
            {/* Contact Us - Always visible */}
            <Link 
              to="/contact" 
              className={getLinkClassName('/contact')}
            >
              Contact
            </Link>
          </div>
          
          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon */}
            <div className="relative">
              <button
                onClick={handleCartClick}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 relative"
                title={user ? 
                  (cartSummary.totalItems > 0 ? `Cart (${cartSummary.totalItems} items)` : 'Cart (empty)') :
                  'Login to view cart'
                }
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                
                {/* Cart Badge */}
                {user && cartSummary.totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartSummary.totalItems > 99 ? '99+' : cartSummary.totalItems}
                  </span>
                )}
              </button>

              {/* Enhanced Cart Dropdown */}
              {showCartDropdown && user && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Shopping Cart</h3>
                      <button
                        onClick={() => setShowCartDropdown(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="text-center py-6">
                        <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-3">Your cart is empty</p>
                        <Link
                          to="/test-kits"
                          onClick={() => setShowCartDropdown(false)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                        >
                          Browse Test Kits
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* Enhanced Cart Items */}
                        <div className="max-h-80 overflow-y-auto">
                          {cartItems.map((item) => {
                            const isUpdating = updatingItems[item.item_id];
                            
                            return (
                              <div key={item.item_id} className="flex items-center py-4 border-b border-gray-100 last:border-b-0">
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {item.test_kits.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatPrice(item.test_kits.price)} each
                                  </p>
                                  
                                  {/* Quantity Controls */}
                                  <div className="flex items-center mt-2 space-x-2">
                                    <button
                                      onClick={() => handleCartItemUpdate(item.item_id, item.quantity - 1)}
                                      disabled={isUpdating || item.quantity <= 1}
                                      className="w-6 h-6 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    >
                                      −
                                    </button>
                                    
                                    <span className="w-8 text-center text-sm font-medium">
                                      {isUpdating ? '...' : item.quantity}
                                    </span>
                                    
                                    <button
                                      onClick={() => handleCartItemUpdate(item.item_id, item.quantity + 1)}
                                      disabled={isUpdating || item.quantity >= item.test_kits.quantity}
                                      className="w-6 h-6 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    >
                                      +
                                    </button>
                                    
                                    {/* Remove Button */}
                                    <button
                                      onClick={() => handleCartItemRemove(item.item_id)}
                                      disabled={isUpdating}
                                      className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Remove item"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                  
                                  {/* Stock Warning */}
                                  {item.quantity >= item.test_kits.quantity && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      Max quantity reached ({item.test_kits.quantity} available)
                                    </p>
                                  )}
                                </div>
                                
                                {/* Item Total */}
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatPrice(item.quantity * item.test_kits.price)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Cart Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-base font-medium text-gray-900">Total:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatPrice(cartSummary.totalPrice)}
                            </span>
                          </div>
                          
                          <button
                            onClick={handleCheckout}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200 mb-2"
                          >
                            Proceed to Checkout ({cartSummary.totalItems} items)
                          </button>
                          
                          <Link
                            to="/test-kits"
                            onClick={() => setShowCartDropdown(false)}
                            className="block w-full text-center text-blue-600 hover:text-blue-800 text-sm py-1"
                          >
                            Continue Shopping
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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

      {/* Click outside to close dropdowns */}
      {(showCartDropdown || showLearnDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowCartDropdown(false);
            setShowLearnDropdown(false);
          }}
        />
      )}
    </header>
  );
}