
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import PartnerHeader from '../components/PartnerHeader';
import QuantitySelector from '../components/QuantitySelector';
import { useAuth } from '../contexts/AuthContext';
import { usePartner } from '../hooks/usePartner';
import { usePartnerProducts } from '../hooks/usePartnerProducts';
import { usePartnerContext } from '../hooks/usePartnerContext';
import { useCartActions } from '../hooks/useCartActions';
import { storeReturnPath } from '../utils/returnPath';
import CartConflictModal from '../components/CartConflictModal';
import { useCart } from '../contexts/CartContext';
import { 
  formatPrice,
  isInStock,
} from '../utils/testKitHelpers';

export default function PartnerShopPage() {
  const { partnerSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartPartnerInfo, clearCart } = useCart();
  
  // Load partner data
  const { partner, loading: partnerLoading, error: partnerError } = usePartner(partnerSlug);
  
  // Load partner products
  const { products, loading: productsLoading, error: productsError } = usePartnerProducts(partner?.partner_id);
  
  // Set up partner context (cookie)
  usePartnerContext(partnerSlug);
  
  // State to track quantities for each product
  const [quantities, setQuantities] = useState({});

  // Use cart actions hook
  const {
    handleAddToCart,
    handleLoginRedirect,
    handleSignupRedirect,
    closeLoginPrompt,
    clearError,
    clearSuccessMessage,
    error: cartError,
    successMessage,
    showLoginPrompt,
    selectedKit,
    getAddToCartButtonProps,
    isAddingToCart,
    showConflictModal,
    conflictInfo,
    closeConflictModal,
  } = useCartActions();

  // Initialize quantities when products load
  useEffect(() => {
    if (products.length > 0) {
      const initialQuantities = {};
      products.forEach(product => {
        initialQuantities[product.test_kit_id] = 1;
      });
      setQuantities(initialQuantities);
    }
  }, [products]);

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity) => {
    const product = products.find(p => p.test_kit_id === productId);
    const maxQuantity = product ? product.quantity : 1;
    
    const validQuantity = Math.max(1, Math.min(parseInt(newQuantity) || 1, maxQuantity));
    
    setQuantities(prev => ({
      ...prev,
      [productId]: validQuantity
    }));
  };

  // Handle add to cart with partner attribution
  const onAddToCart = async (product) => {
    const quantity = quantities[product.test_kit_id] || 1;
    
    // Create product object that matches expected format
    const productData = {
      id: product.test_kit_id,
      name: product.name,
      description: product.description,
      price: product.final_price,
      quantity: product.quantity,
      partner_id: partner.partner_id, // Add partner attribution
    };
    
    await handleAddToCart(productData, quantity);
  };

  // Loading state
  if (partnerLoading || productsLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600">Loading partner shop...</span>
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (partnerError || !partner) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium">Partner Not Found</p>
                <p className="text-red-600 text-sm mt-1">
                  {partnerError || 'The partner shop you are looking for does not exist or is no longer active.'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/shop"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Visit Regular Shop
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Hero section
  const PartnerShopHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            {partner.partner_name} Water Testing
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Professional-grade water testing kits provided in partnership with My Water Quality.
            Choose the right kit for your specific testing needs.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<PartnerShopHero />}>
      {/* Partner Header */}
      {/* <PartnerHeader partner={partner} /> */}

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

        {/* Products Error */}
        {productsError && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-700">Error loading products: {productsError}</span>
            </div>
          </div>
        )}

        {/* Login Prompt for non-authenticated users */}
        {!user && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800">
                <button
                  onClick={() => {
                    storeReturnPath(`/shop/partner/${partnerSlug}`);
                    navigate('/login', { 
                      state: { 
                        message: 'Please log in to add items to your cart and checkout'
                      }
                    });
                  }}
                  className="font-medium underline hover:text-blue-600 bg-transparent border-none p-0 cursor-pointer text-blue-800"
                >
                  Log in
                </button> or <button
                  onClick={() => {
                    storeReturnPath(`/shop/partner/${partnerSlug}`);
                    navigate('/signup', { 
                      state: { 
                        message: 'Create an account to add items to your cart and checkout'
                      }
                    });
                  }}
                  className="font-medium underline hover:text-blue-600 bg-transparent border-none p-0 cursor-pointer text-blue-800"
                >
                  create an account
                </button> to add items to your cart and checkout.
              </p>
            </div>
          </div>
        )}

        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Test Kits</h2>
          <p className="text-gray-600 mb-6">
            All test kits include professional laboratory analysis and detailed results within 5-7 business days.
          </p>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h3>
              <p className="text-gray-500">This partner currently has no test kits available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const buttonProps = getAddToCartButtonProps(
                  { 
                    id: product.test_kit_id, 
                    quantity: product.quantity,
                    name: product.name,
                    price: product.final_price 
                  }, 
                  quantities[product.test_kit_id] || 1
                );
                const currentQuantity = quantities[product.test_kit_id] || 1;
                
                return (
                  <div 
                    key={product.test_kit_id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
                  >

                    <Link 
          to={`/shop/${product.slug}`}
          className="block p-2 pb-2 flex-1 hover:bg-gray-50 transition-colors duration-200"
        >
                    {/* Card Header */}
                    <div className="p-6 pb-4">
                      <div className="mb-4">
                        <div className="h-12 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-6">
                            {product.name}
                          </h3>
                        </div>
                        
                        {/* Price - Show custom price if different */}
                        <div className="mb-3">
                          {product.custom_price && product.custom_price !== product.price ? (
                            <div>
                              <span className="text-2xl font-bold text-blue-600">
                                {formatPrice(product.final_price)}
                              </span>
                              <span className="text-gray-500 text-sm ml-1">CAD</span>
                              <span className="ml-2 text-sm text-gray-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                              <span className="ml-2 text-xs text-green-600 font-medium">
                                Partner Price
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-3xl font-bold text-blue-600">
                                {formatPrice(product.final_price)}
                              </span>
                              <span className="text-gray-500 text-sm ml-1">CAD</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-600 text-sm line-clamp-3 flex-1">
                          {product.description || "Professional water quality testing"}
                        </p>
                      </div>
                      
                      {/* Parameters count */}
                      {product.num_parameters && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.num_parameters} parameters tested
                          </span>
                        </div>
                      )}
                    </div>
                    </Link>
                    {/* Card Footer */}
                    <div className="px-6 pb-6 mt-auto">
                      {/* View Details Link */}
                      {product.slug && (
                        <div className="mb-4">
                          <Link 
                            to={`/shop/${product.slug}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                          >
                            View Details & Parameters →
                          </Link>
                        </div>
                      )}
                      
                      {/* Quantity Selector */}
                      {isInStock(product.quantity) && (
                        <div className="mb-4">
                          <QuantitySelector
                            quantity={currentQuantity}
                            maxQuantity={product.quantity}
                            onQuantityChange={(newQuantity) => handleQuantityChange(product.test_kit_id, newQuantity)}
                            disabled={isAddingToCart(product.test_kit_id)}
                            size="default"
                          />
                        </div>
                      )}
                      
                      <button
                        onClick={() => onAddToCart(product)}
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
          )}
        </div>

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
                  onClick={() => handleLoginRedirect(`/shop/partner/${partnerSlug}`)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleSignupRedirect(`/shop/partner/${partnerSlug}`)}
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
      </div>
      <CartConflictModal
  isOpen={showConflictModal}
  onClose={closeConflictModal}
  conflictType={conflictInfo?.type}
  message={conflictInfo?.message}
  cartPartnerInfo={cartPartnerInfo}
  onClearCart={clearCart}
/>
    </PageLayout>
  );
}