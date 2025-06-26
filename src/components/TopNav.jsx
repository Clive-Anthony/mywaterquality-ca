// src/components/TopNav.jsx - IMPROVED: Stable cart item ordering and smooth updates
import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileLearnSubmenu, setShowMobileLearnSubmenu] = useState(false);
  const [updatingItems, setUpdatingItems] = useState({}); // Track which items are being updated
  const learnDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  // IMPROVEMENT: Stable cart items ordering to prevent jumping
  const stableCartItems = useMemo(() => {
    // Sort cart items by created_at to ensure consistent order
    // If created_at is the same, fall back to item_id for deterministic ordering
    return [...cartItems].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      
      if (aTime === bTime) {
        // Fallback to item_id for consistent ordering
        return a.item_id.localeCompare(b.item_id);
      }
      
      return aTime - bTime;
    });
  }, [cartItems]);
  
  // Close dropdowns and mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (learnDropdownRef.current && !learnDropdownRef.current.contains(event.target)) {
        setShowLearnDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
        setShowMobileLearnSubmenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setShowMobileMenu(false);
    setShowMobileLearnSubmenu(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  const handleSignOut = async () => {
    setLoading(true);
    setShowMobileMenu(false); // Close mobile menu
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

  // Mobile link styling
  const getMobileLinkClassName = (path) => {
    const baseClasses = "block px-4 py-3 text-base font-medium transition-colors duration-200 border-l-4";
    
    if (isActivePage(path)) {
      return `${baseClasses} text-blue-600 bg-blue-50 border-blue-600`;
    } else {
      return `${baseClasses} text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-300`;
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // IMPROVED: Handle cart item quantity update with optimistic UI
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
      // Could add user notification here
    } finally {
      // Add a small delay to prevent jarring updates
      setTimeout(() => {
        setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
      }, 300);
    }
  };

  // IMPROVED: Handle cart item removal with smooth transition
  const handleCartItemRemove = async (itemId) => {
    setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
    
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing cart item:', error);
    } finally {
      // Keep updating state a bit longer for smooth removal
      setTimeout(() => {
        setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
      }, 200);
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
      navigate('/shop');
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
      navigate('/shop');
      return;
    }

    navigate('/checkout');
  };

  // Handle mobile menu item clicks
  const handleMobileMenuClick = (action) => {
    setShowMobileMenu(false);
    setShowMobileLearnSubmenu(false);
    if (action) action();
  };

  // Handle mobile learn submenu toggle
  const handleMobileLearnToggle = () => {
    setShowMobileLearnSubmenu(!showMobileLearnSubmenu);
  };
  
  return (
    <header className="bg-white shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/MWQ-logo-final.png" 
                alt="My Water Quality Logo" 
                className="h-8 w-auto sm:h-10"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation Links - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-4 ml-6">
            {/* Test Kits - Always visible */}
            <Link 
              to="/shop" 
              className={getLinkClassName('/shop')}
            >
              Browse Test Kits
            </Link>

            {/* Demo Report - Always visible */}
            <Link 
              to="/demo-report" 
              className={getLinkClassName('/demo-report')}
            >
              Demo Report
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
              </>
            )}

            {/* Learn Dropdown - Always visible */}
            <div className="relative" ref={learnDropdownRef}>
              <button
                onClick={() => setShowLearnDropdown(!showLearnDropdown)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
                  location.pathname.includes('/learn') || location.pathname.includes('/water-sampling-instructions') || location.pathname.includes('/process') || location.pathname.includes('/about-us') || location.pathname.includes('/faq') || location.pathname.includes('/about-canadas-drinking-water')
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
                        <span className="text-lg mr-3">🧪</span>
                        <div>
                          <div className="font-medium">Water Sampling Instructions</div>
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
                        <span className="text-lg mr-3">⚙️</span>
                        <div>
                          <div className="font-medium">My Water Quality Process</div>
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
                        <span className="text-lg mr-3">👥</span>
                        <div>
                          <div className="font-medium">About Us</div>
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
                        <span className="text-lg mr-3">❓</span>
                        <div>
                          <div className="font-medium">FAQ</div>
                          <div className="text-xs text-gray-500">Your questions - answered</div>
                        </div>
                      </div>
                    </Link>
                    
                    <Link
                      to="/about-canadas-drinking-water"
                      onClick={() => setShowLearnDropdown(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3">🇨🇦</span>
                        <div>
                          <div className="font-medium">About Canada's Water</div>
                          <div className="text-xs text-gray-500">Learn about your drinking water</div>
                        </div>
                      </div>
                    </Link>
                    
                  </div>
                </div>
              )}
            </div>
            
            {/* Contact Us - Always visible */}
            <Link 
              to="/contact" 
              className={getLinkClassName('/contact')}
            >
              Contact Us
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

              {/* IMPROVED: Enhanced Cart Dropdown with stable item ordering */}
              {showCartDropdown && user && (
                <div className="absolute right-0 mt-2 w-64 sm:right-0 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">Shopping Cart</h3>
                      <button
                        onClick={() => setShowCartDropdown(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {stableCartItems.length === 0 ? (
                      <div className="text-center py-6">
                        <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-3">Your cart is empty</p>
                        <Link
                          to="/shop"
                          onClick={() => setShowCartDropdown(false)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                        >
                          Browse Test Kits
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* IMPROVED: Cart Items with stable ordering and smooth transitions */}
                        <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                          {stableCartItems.map((item) => {
                            const isUpdating = updatingItems[item.item_id];
                            
                            return (
                              <div 
                                key={item.item_id} 
                                className={`flex items-start py-3 sm:py-4 border-b border-gray-100 last:border-b-0 gap-3 transition-opacity duration-200 ${
                                  isUpdating ? 'opacity-60' : 'opacity-100'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                                    {item.test_kits.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatPrice(item.test_kits.price)} each
                                  </p>
                                  
                                  {/* Quantity Controls with improved UX */}
                                  <div className="flex items-center mt-2 space-x-1 sm:space-x-2">
                                    <button
                                      onClick={() => handleCartItemUpdate(item.item_id, item.quantity - 1)}
                                      disabled={isUpdating || item.quantity <= 1}
                                      className="w-6 h-6 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors duration-150"
                                    >
                                      −
                                    </button>
                                    
                                    <span className="w-8 text-center text-sm font-medium min-h-[1.25rem] flex items-center justify-center">
                                      {isUpdating ? (
                                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        item.quantity
                                      )}
                                    </span>
                                    
                                    <button
                                      onClick={() => handleCartItemUpdate(item.item_id, item.quantity + 1)}
                                      disabled={isUpdating || item.quantity >= item.test_kits.quantity}
                                      className="w-6 h-6 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors duration-150"
                                    >
                                      +
                                    </button>
                                    
                                    {/* Remove Button */}
                                    <button
                                      onClick={() => handleCartItemRemove(item.item_id)}
                                      disabled={isUpdating}
                                      className="ml-1 sm:ml-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
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
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatPrice(item.quantity * item.test_kits.price)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Cart Summary */}
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-base font-medium text-gray-900">Total:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatPrice(cartSummary.totalPrice)}
                            </span>
                          </div>
                          
                          <button
                            onClick={handleCheckout}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200 mb-2 text-sm sm:text-base"
                          >
                            Proceed to Checkout ({cartSummary.totalItems} items)
                          </button>
                          
                          <Link
                            to="/shop"
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
            
            {/* User info if authenticated - Hidden on mobile */}
            {user && (
              <div className="hidden lg:flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Conditional Authentication Buttons - Hidden on mobile */}
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="hidden lg:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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
                  className="hidden lg:inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="hidden lg:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Hamburger Menu Button - Visible only on mobile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
          <div 
            ref={mobileMenuRef}
            className="absolute top-0 right-0 w-80 max-w-sm h-full bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="py-2">
              {/* Browse Test Kits */}
              <Link
                to="/shop"
                onClick={() => handleMobileMenuClick()}
                className={getMobileLinkClassName('/shop')}
              >
                Browse Test Kits
              </Link>

              {/* Demo Report */}
              <Link
                to="/demo-report"
                onClick={() => handleMobileMenuClick()}
                className={getMobileLinkClassName('/demo-report')}
              >
                Demo Report
              </Link>

              {/* Dashboard - Only show when logged in */}
              {user && (
                <Link
                  to="/dashboard"
                  onClick={() => handleMobileMenuClick()}
                  className={getMobileLinkClassName('/dashboard')}
                >
                  Dashboard
                </Link>
              )}

              {/* Learn Section with submenu */}
              <div>
                <button
                  onClick={handleMobileLearnToggle}
                  className={`w-full text-left px-4 py-3 text-base font-medium transition-colors duration-200 border-l-4 flex items-center justify-between ${
                    location.pathname.includes('/learn') || location.pathname.includes('/sampling-instructions') || location.pathname.includes('/process') || location.pathname.includes('/about-us') || location.pathname.includes('/faq') || location.pathname.includes('/about-canadas-drinking-water')
                      ? 'text-blue-600 bg-blue-50 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-300'
                  }`}
                >
                  Learn
                  <svg 
                    className={`h-5 w-5 transition-transform duration-200 ${showMobileLearnSubmenu ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Learn Submenu */}
                {showMobileLearnSubmenu && (
                  <div className="bg-gray-50 border-l-4 border-gray-200">
                    <Link
                      to="/sampling-instructions"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-8 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">Water Sampling Instructions</div>
                        <div className="text-xs text-gray-500 mt-1">Step-by-step sampling guide</div>
                      </div>
                    </Link>

                    <Link
                      to="/process"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-8 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">My Water Quality Process</div>
                        <div className="text-xs text-gray-500 mt-1">Learn how our testing works</div>
                      </div>
                    </Link>

                    <Link
                      to="/about-us"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-8 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">About Us</div>
                        <div className="text-xs text-gray-500 mt-1">Meet our team!</div>
                      </div>
                    </Link>

                    <Link
                      to="/faq"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-8 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">FAQ</div>
                        <div className="text-xs text-gray-500 mt-1">Your questions - answered</div>
                      </div>
                    </Link>
                    
                    <Link
                      to="/about-canadas-drinking-water"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-8 py-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <div>
                        <div className="font-medium">About Canada's Water</div>
                        <div className="text-xs text-gray-500 mt-1">Learn about your drinking water</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Contact Us */}
              <Link
                to="/contact"
                onClick={() => handleMobileMenuClick()}
                className={getMobileLinkClassName('/contact')}
              >
                Contact Us
              </Link>

              {/* Divider */}
              <div className="border-t border-gray-200 my-2"></div>

              {/* Authentication Section */}
              {user ? (
                <>
                  {/* User Info */}
                  <div className="px-4 py-3 border-l-4 border-transparent">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => handleMobileMenuClick(handleSignOut)}
                    disabled={loading}
                    className="w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 border-l-4 border-transparent hover:border-red-300 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing out...
                      </span>
                    ) : (
                      'Sign Out'
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Log In Button */}
                    <Link
                      to="/login"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-4 py-3 mx-4 mb-2 text-base font-medium text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 transition-colors duration-200 rounded-md text-center"
                    >
                      Log In
                    </Link>

                    {/* Sign Up Button */}
                    <Link
                      to="/signup"
                      onClick={() => handleMobileMenuClick()}
                      className="block px-4 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 mx-4 rounded-md text-center"
                    >
                      Sign Up
                    </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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