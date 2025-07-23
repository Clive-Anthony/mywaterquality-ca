// src/pages/TestKitDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import QuantitySelector from '../components/QuantitySelector';
import { useCartActions } from '../hooks/useCartActions';
import {
  getTestKitBySlug,
  getTestKitParameters,
  getTestKitImageUrl,
  formatPrice,
  getStockStatus,
  getParameterTypeBadge,
  getDefaultDescription,
  sortParametersAlphabetically,
  groupParametersByType,
  generateMetaTags
} from '../utils/testKitHelpers';

export default function TestKitDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [testKit, setTestKit] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [featuredParameters, setFeaturedParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showAllParameters, setShowAllParameters] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Cart actions
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
    getItemQuantity,
    isInCart
  } = useCartActions();

  // Fetch test kit data
  useEffect(() => {
    const fetchTestKitData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch test kit by slug
        const { testKit: testKitData, error: testKitError } = await getTestKitBySlug(slug);
        
        if (testKitError || !testKitData) {
          throw testKitError || new Error('Test kit not found');
        }

        setTestKit(testKitData);

        // Fetch parameters for this test kit
        const { parameters: paramData, featuredParameters: featuredData, error: paramError } = 
          await getTestKitParameters(testKitData.id);

        if (paramError) {
          console.warn('Error fetching parameters:', paramError);
          // Don't throw - test kit page can still be useful without parameters
        }

        setParameters(paramData || []);
        setFeaturedParameters(featuredData || []);

        // Update page meta tags
        const metaTags = generateMetaTags(testKitData);
        document.title = metaTags.title;
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', metaTags.description);
        }

      } catch (err) {
        console.error('Error fetching test kit data:', err);
        setError(err.message || 'Failed to load test kit');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchTestKitData();
    }
  }, [slug]);

  // Handle image loading error
  const handleImageError = () => {
    setImageError(true);
  };

  // Handle add to cart
  const onAddToCart = async () => {
    if (!testKit) return;
    
    clearError();
    const success = await handleAddToCart(testKit, quantity);
    
    if (success) {
      // Reset quantity to 1 after successful add
      setQuantity(1);
    }
  };

  // Format description with fallback
  const getDescription = () => {
    return testKit?.description || getDefaultDescription();
  };

  // Group non-featured parameters for "View More" section
  const getNonFeaturedParameters = () => {
    const featuredIds = new Set(featuredParameters.map(p => p.id));
    const nonFeatured = parameters.filter(p => !featuredIds.has(p.id));
    return groupParametersByType(nonFeatured);
  };

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            {/* Breadcrumb skeleton */}
            <div className="flex space-x-2 mb-8">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-4"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
              <div className="h-4 bg-gray-300 rounded w-4"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Image skeleton */}
              <div className="bg-gray-300 rounded-lg h-96"></div>
              
              {/* Content skeleton */}
              <div className="space-y-6">
                <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                <div className="h-6 bg-gray-300 rounded w-24"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
                <div className="h-32 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20.05a7.962 7.962 0 01-8-7.95c0-1.093.39-2.988 1.09-4.95L12 1l6.91 6.15C19.61 9.062 20 10.957 20 12.05A7.962 7.962 0 0112 20.05z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Test Kit Not Found</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link
              to="/shop"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse All Test Kits
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Not found state
  if (!testKit) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Test Kit Not Found</h3>
            <p className="text-gray-500 mb-6">The requested test kit could not be found.</p>
            <Link
              to="/shop"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse All Test Kits
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const stockStatus = getStockStatus(testKit.quantity);
  const buttonProps = getAddToCartButtonProps(testKit, quantity);
  const imageUrl = getTestKitImageUrl(testKit);
  const itemQuantity = getItemQuantity(testKit.id);
  const inCart = isInCart(testKit.id);

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
            </li>
            <li>
              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link to="/shop" className="text-gray-500 hover:text-gray-700">
                Shop
              </Link>
            </li>
            <li>
              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 font-medium">{testKit.name}</span>
            </li>
          </ol>
        </nav>

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

        {/* Main Product Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          
          {/* Product Image */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={imageError ? '/images/test-kit-placeholder.jpg' : imageUrl}
                alt={testKit.name}
                onError={handleImageError}
                className="w-full h-96 object-cover object-center"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            
            {/* Title and Price */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {testKit.name}
              </h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-4xl font-bold text-blue-600">
                  {formatPrice(testKit.price)}
                </span>
                <span className="text-sm text-gray-500">CAD</span>
              </div>
            </div>

            {/* Top 6 Parameters - Above Description */}
            {featuredParameters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Parameters Tested</h3>
                <div className="flex flex-wrap gap-3">
                  {featuredParameters.map((parameter) => (
                    <span
                      key={parameter.id}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      {parameter.display_name || parameter.parameter_name}
                    </span>
                  ))}
                </div>
                
                {/* View All Parameters Button */}
                {parameters.length > featuredParameters.length && (
                  <button
                    onClick={() => setShowAllParameters(true)}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All {parameters.length} Parameters
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {getDescription()}
              </p>
            </div>

            {/* Quantity and Add to Cart */}
            {stockStatus.text !== 'Out of Stock' && (
              <div className="space-y-4">
                <QuantitySelector
                  quantity={quantity}
                  maxQuantity={testKit.quantity}
                  onQuantityChange={setQuantity}
                  disabled={cartLoading[testKit.id]}
                  size="large"
                />

                <button
                  onClick={onAddToCart}
                  disabled={buttonProps.disabled}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 ${buttonProps.className}`}
                >
                  {buttonProps.showSpinner && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {buttonProps.text}
                </button>

                {inCart && (
                  <p className="text-green-600 text-sm text-center">
                    You have {itemQuantity} of this item in your cart
                  </p>
                )}
              </div>
            )}

            {/* Out of Stock Message */}
            {stockStatus.text === 'Out of Stock' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Currently Out of Stock
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      This test kit is temporarily unavailable. Please check back soon or browse our other available test kits.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">What's Included</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Professional laboratory testing kit
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Detailed water quality report
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Step-by-step sampling instructions
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Results within 5-7 business days
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Parameters Drawer */}
        {showAllParameters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div 
              className="w-full max-w-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      All Parameters ({parameters.length})
                    </h2>
                    <button
                      onClick={() => setShowAllParameters(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete list of parameters tested in {testKit.name}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortParametersAlphabetically(parameters).map((parameter) => (
                      <div key={parameter.id} className="text-sm text-gray-700">
                        {parameter.display_name || parameter.parameter_name}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAllParameters(false)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                  Price: {formatPrice(testKit.price * selectedKit.quantity)}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleLoginRedirect(`/shop/${slug}`)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors duration-200"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleSignupRedirect(`/shop/${slug}`)}
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
    </PageLayout>
  );
}