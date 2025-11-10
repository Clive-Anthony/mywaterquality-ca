// src/hooks/useCartActions.js - WITH CONFLICT HANDLING
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { storeReturnPath } from '../utils/returnPath';

export const useCartActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getItemQuantity, isInCart } = useCart();
  
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);

  /**
   * Handle adding item to cart with all necessary checks
   * @param {Object} testKit - Test kit object
   * @param {number} quantity - Quantity to add
   * @returns {Promise<boolean>} Success status
   */
  const handleAddToCart = async (testKit, quantity = 1) => {
    // Check if user is authenticated
    if (!user) {
      setSelectedKit({ ...testKit, quantity });
      setShowLoginPrompt(true);
      return false;
    }

    // Check stock
    if (testKit.quantity <= 0) {
      setError('This item is out of stock');
      return false;
    }

    if (quantity > testKit.quantity) {
      setError(`Only ${testKit.quantity} items available in stock`);
      return false;
    }

    setLoading(prev => ({ ...prev, [testKit.id]: true }));
    setError(null);

    try {
      const result = await addToCart(testKit, quantity);
      
      if (!result.success) {
        // Check if it's a conflict error
        if (result.conflictType) {
          setConflictInfo({
            type: result.conflictType,
            message: result.error,
            product: testKit
          });
          setShowConflictModal(true);
          return false;
        } else {
          throw new Error(result.error);
        }
      }

      const quantityText = quantity === 1 ? '' : `${quantity} x `;
      setSuccessMessage(`${quantityText}${testKit.name} added to cart!`);
      
      // Add small delay to ensure cart state updates before showing dropdown
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showCartDropdown'));
      }, 100);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error?.message || 'Failed to add item to cart');
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [testKit.id]: false }));
    }
  };

  /**
   * Handle login redirect from auth prompt
   * @param {string} returnPath - Path to return to after login
   */
  const handleLoginRedirect = (returnPath = '/shop') => {
    setShowLoginPrompt(false);
    storeReturnPath(returnPath);
    navigate('/login', { 
      state: { 
        message: 'Please log in to add items to your cart'
      }
    });
  };

  /**
   * Handle signup redirect from auth prompt
   * @param {string} returnPath - Path to return to after signup
   */
  const handleSignupRedirect = (returnPath = '/shop') => {
    setShowLoginPrompt(false);
    storeReturnPath(returnPath);
    navigate('/signup', { 
      state: { 
        message: 'Create an account to start shopping'
      }
    });
  };

  /**
   * Close login prompt
   */
  const closeLoginPrompt = () => {
    setShowLoginPrompt(false);
    setSelectedKit(null);
  };

  /**
   * Close conflict modal
   */
  const closeConflictModal = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Clear success message
   */
  const clearSuccessMessage = () => {
    setSuccessMessage(null);
  };

  /**
   * Get add to cart button properties based on state
   * @param {Object} testKit - Test kit object
   * @param {number} selectedQuantity - Selected quantity
   * @returns {Object} Button properties
   */
  const getAddToCartButtonProps = (testKit, selectedQuantity = 1) => {
    const inStock = testKit.quantity > 0;
    const itemQuantity = getItemQuantity(testKit.id);
    const isAdding = loading[testKit.id];
    const inCart = isInCart(testKit.id);

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
        className: 'bg-blue-400 text-white cursor-not-allowed',
        showSpinner: true
      };
    }

    if (inCart) {
      const quantityText = selectedQuantity === 1 ? '' : `${selectedQuantity} `;
      return {
        text: `Add ${quantityText}More (${itemQuantity} in cart)`,
        disabled: false,
        className: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
      };
    }

    const quantityText = selectedQuantity === 1 ? '' : `${selectedQuantity} `;
    return {
      text: user ? `Add ${quantityText}to Cart` : 'Login to Add to Cart',
      disabled: false,
      className: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    };
  };

  /**
   * Check if item is currently being added to cart
   * @param {string} testKitId - Test kit ID
   * @returns {boolean} Loading state
   */
  const isAddingToCart = (testKitId) => {
    return Boolean(loading[testKitId]);
  };

  return {
    // Actions
    handleAddToCart,
    handleLoginRedirect,
    handleSignupRedirect,
    closeLoginPrompt,
    closeConflictModal,
    clearError,
    clearSuccessMessage,
    
    // State
    loading,
    error,
    successMessage,
    showLoginPrompt,
    selectedKit,
    showConflictModal,
    conflictInfo,
    
    // Utilities
    getAddToCartButtonProps,
    isAddingToCart,
    
    // Cart utilities (re-exported for convenience)
    getItemQuantity,
    isInCart
  };
};