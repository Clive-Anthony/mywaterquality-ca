// src/contexts/CartContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { 
  getCartItems, 
  addToCart as addToCartAPI, 
  updateCartItemQuantity as updateQuantityAPI,
  removeFromCart as removeFromCartAPI,
  getCartSummary,
  clearCart as clearCartAPI
} from '../lib/cartClient';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartSummary, setCartSummary] = useState({ totalItems: 0, totalPrice: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load cart items when user changes
  useEffect(() => {
    if (user) {
      loadCartItems();
    } else {
      // Clear cart when user logs out
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
    }
  }, [user]);

  // Load cart items from database
  const loadCartItems = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { items, error: itemsError } = await getCartItems();
      
      if (itemsError) {
        throw itemsError;
      }

      setCartItems(items);

      // Update summary
      const { totalItems, totalPrice, error: summaryError } = await getCartSummary();
      
      if (summaryError) {
        console.warn('Error getting cart summary:', summaryError);
      } else {
        setCartSummary({ totalItems, totalPrice });
      }

    } catch (error) {
      console.error('Error loading cart items:', error);
      setError(error.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (testKitId, quantity = 1) => {
    if (!user) {
      throw new Error('Please log in to add items to your cart');
    }

    setError(null);

    try {
      const { success, error: addError } = await addToCartAPI(testKitId, quantity);
      
      if (!success) {
        throw addError;
      }

      // Reload cart items to reflect changes
      await loadCartItems();
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message || 'Failed to add item to cart');
      return { success: false, error };
    }
  };

  // Update cart item quantity
  const updateCartItemQuantity = async (itemId, quantity) => {
    if (!user) {
      throw new Error('Please log in to update cart items');
    }

    setError(null);

    try {
      const { success, error: updateError } = await updateQuantityAPI(itemId, quantity);
      
      if (!success) {
        throw updateError;
      }

      // Reload cart items to reflect changes
      await loadCartItems();
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating cart item:', error);
      setError(error.message || 'Failed to update cart item');
      return { success: false, error };
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    if (!user) {
      throw new Error('Please log in to remove cart items');
    }

    setError(null);

    try {
      const { success, error: removeError } = await removeFromCartAPI(itemId);
      
      if (!success) {
        throw removeError;
      }

      // Reload cart items to reflect changes
      await loadCartItems();
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError(error.message || 'Failed to remove item from cart');
      return { success: false, error };
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!user) {
      throw new Error('Please log in to clear cart');
    }

    setError(null);

    try {
      const { success, error: clearError } = await clearCartAPI();
      
      if (!success) {
        throw clearError;
      }

      // Update local state
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError(error.message || 'Failed to clear cart');
      return { success: false, error };
    }
  };

  // Get item quantity in cart
  const getItemQuantity = (testKitId) => {
    const item = cartItems.find(item => item.test_kit_id === testKitId);
    return item ? item.quantity : 0;
  };

  // Check if item is in cart
  const isInCart = (testKitId) => {
    return cartItems.some(item => item.test_kit_id === testKitId);
  };

  // Refresh cart data
  const refreshCart = async () => {
    if (user) {
      await loadCartItems();
    }
  };

  const value = {
    // State
    cartItems,
    cartSummary,
    loading,
    error,
    
    // Actions
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    
    // Helpers
    getItemQuantity,
    isInCart,
    
    // Clear error function
    clearError: () => setError(null)
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;