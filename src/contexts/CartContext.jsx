// contexts/CartContext.jsx - Fixed to use centralized auth

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthToken } from '../hooks/useAuthToken';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use centralized auth instead of direct supabase calls
  const { makeAuthenticatedRequest, validateUserAuth, isAuthenticated, user } = useAuthToken();

  // Remove this problematic pattern:
  // const { data: { user } } = await supabase.auth.getUser(); // Not synced with context

  const getOrCreateUserCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }

    try {
      // Use centralized user validation
      const currentUser = validateUserAuth();
      
      // Use centralized authenticated request
      const response = await makeAuthenticatedRequest('/.netlify/functions/get-cart', {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser.id })
      });

      if (!response.ok) {
        throw new Error(`Failed to get cart: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.cart_items) {
        setCartItems(data.cart_items);
      } else {
        setCartItems([]);
      }
      
    } catch (error) {
      console.error('Error getting user cart:', error);
      setError(error.message);
      
      // Handle auth errors
      if (error.message.includes('Authentication')) {
        setCartItems([]);
      }
    }
  }, [isAuthenticated, makeAuthenticatedRequest, validateUserAuth]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!isAuthenticated) {
      setError('Please log in to add items to cart');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentUser = validateUserAuth();

      const response = await makeAuthenticatedRequest('/.netlify/functions/add-to-cart', {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          product_id: product.id,
          quantity: quantity,
          price: product.price
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add to cart: ${response.status}`);
      }

      // Refresh cart after adding
      await getOrCreateUserCart();
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, validateUserAuth, makeAuthenticatedRequest, getOrCreateUserCart]);

  const removeFromCart = useCallback(async (productId) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentUser = validateUserAuth();

      const response = await makeAuthenticatedRequest('/.netlify/functions/remove-from-cart', {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          product_id: productId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove from cart: ${response.status}`);
      }

      // Optimistically update cart
      setCartItems(prev => prev.filter(item => item.product_id !== productId));
      
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError(error.message);
      
      // Refresh cart on error to ensure consistency
      await getOrCreateUserCart();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, validateUserAuth, makeAuthenticatedRequest, getOrCreateUserCart]);

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    if (!isAuthenticated) {
      return;
    }

    if (newQuantity <= 0) {
      return removeFromCart(productId);
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentUser = validateUserAuth();

      const response = await makeAuthenticatedRequest('/.netlify/functions/update-cart-quantity', {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          product_id: productId,
          quantity: newQuantity
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update quantity: ${response.status}`);
      }

      // Optimistically update cart
      setCartItems(prev => 
        prev.map(item => 
          item.product_id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError(error.message);
      
      // Refresh cart on error
      await getOrCreateUserCart();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, validateUserAuth, makeAuthenticatedRequest, getOrCreateUserCart, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentUser = validateUserAuth();

      const response = await makeAuthenticatedRequest('/.netlify/functions/clear-cart', {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser.id })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cart: ${response.status}`);
      }

      setCartItems([]);
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, validateUserAuth, makeAuthenticatedRequest]);

  // Load cart when user authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      getOrCreateUserCart();
    } else {
      // Clear cart when user logs out
      setCartItems([]);
      setError(null);
    }
  }, [isAuthenticated, user, getOrCreateUserCart]);

  // Calculate cart totals
  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  const cartItemCount = cartItems.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const value = {
    cartItems,
    cartTotal,
    cartItemCount,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart: getOrCreateUserCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};