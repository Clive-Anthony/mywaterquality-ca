// src/contexts/CartContext.jsx - FIXED VERSION - Resolves 406 error
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

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
  const [cartSummary, setCartSummary] = useState({ totalItems: 0, totalPrice: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, session, loading: authLoading, isAuthenticated } = useAuth();

  // Debug logging function
  const debugLog = (action, message, data = null) => {
    console.log(`🛒 [${action}] ${message}`, data || '');
  };

  // Get or create user cart - simplified version that handles loading states
  const getOrCreateUserCart = useCallback(async () => {
    // Don't try to load cart if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated || !user) {
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // debugLog('LOAD', 'Getting cart for user', { userId: user.id });

      // Get user's cart
      const { data: existingCarts, error: cartError } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cartError && cartError.code !== 'PGRST116') {
        throw cartError;
      }

      let cart = null;

      if (existingCarts && existingCarts.length > 0) {
        cart = existingCarts[0];
        // debugLog('LOAD', 'Found existing cart', { cartId: cart.cart_id });
      } else {
        // Create new cart
        // debugLog('LOAD', 'Creating new cart');
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (createError) {
          if (createError.code === '23505') {
            // Race condition - cart was created by another request
            const { data: raceCart, error: raceError } = await supabase
              .from('carts')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (raceError) throw raceError;
            cart = raceCart;
          } else {
            throw createError;
          }
        } else {
          cart = newCart;
        }
      }

      // Get cart items - FIXED: Use proper headers for array response with consistent ordering
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          *,
          test_kits (
            id,
            name,
            description,
            price,
            quantity
          )
        `)
        .eq('cart_id', cart.cart_id)
        .order('created_at', { ascending: true }); // Consistent ordering by creation time

      if (itemsError) {
        throw itemsError;
      }

      // debugLog('LOAD', 'Cart items loaded', { itemCount: items?.length || 0 });
      setCartItems(items || []);
      
      // Calculate summary
      const totalItems = (items || []).reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = (items || []).reduce((sum, item) => {
        return sum + (item.quantity * item.test_kits.price);
      }, 0);
      
      setCartSummary({ totalItems, totalPrice });
      
    } catch (error) {
      console.error('Error getting user cart:', error);
      setError(error.message);
      
      // Set empty cart on error
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (authLoading || !isAuthenticated || !user) {
      setError('Please log in to add items to cart');
      return { success: false, error: 'Please log in to add items to cart' };
    }
  
    try {
      setLoading(true);
      setError(null);
      
      // debugLog('ADD', 'Adding to cart', { 
      //   productId: product?.id, 
      //   productName: product?.name,
      //   quantity 
      // });
      
      // Validate product object
      if (!product || !product.id) {
        throw new Error('Invalid product: missing product ID');
      }
      
      // Get current user to ensure we're authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || currentUser.id !== user.id) {
        throw new Error('Authentication required');
      }
  
      // Get or create cart
      const { data: carts } = await supabase
        .from('carts')
        .select('cart_id')
        .eq('user_id', user.id)
        .limit(1);
  
      let cartId;
      if (carts && carts.length > 0) {
        cartId = carts[0].cart_id;
        // debugLog('ADD', 'Using existing cart', { cartId });
      } else {
        debugLog('ADD', 'Creating new cart');
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([{ user_id: user.id }])
          .select('cart_id')
          .single();
        
        if (createError) throw createError;
        cartId = newCart.cart_id;
      }
  
      // FIXED: Check if item already exists - use array response instead of single object
      // debugLog('ADD', 'Checking for existing item', { cartId, testKitId: product.id });
      
      const { data: existingItems, error: existingError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('test_kit_id', product.id);

      if (existingError) {
        debugLog('ADD', 'Error checking existing items', { error: existingError });
        throw existingError;
      }

      // debugLog('ADD', 'Existing items found', { count: existingItems?.length || 0 });

      const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;
  
      if (existingItem) {
        // Update quantity
        // debugLog('ADD', 'Updating existing item', { 
        //   itemId: existingItem.item_id,
        //   oldQuantity: existingItem.quantity,
        //   newQuantity: existingItem.quantity + quantity
        // });

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', existingItem.item_id);
  
        if (updateError) {
          debugLog('ADD', 'Update error', { error: updateError });
          throw updateError;
        }
      } else {
        // Add new item to cart
        // debugLog('ADD', 'Adding new item', { cartId, testKitId: product.id, quantity });

        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            cart_id: cartId,
            test_kit_id: product.id,
            quantity: quantity
          }]);
  
        if (insertError) {
          debugLog('ADD', 'Insert error', { error: insertError });
          throw insertError;
        }
      }
  
      // Refresh cart
      // debugLog('ADD', 'Refreshing cart after add');
      await getOrCreateUserCart();
      
      // debugLog('ADD', 'Item added successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading, getOrCreateUserCart]);

  const updateCartItemQuantity = useCallback(async (itemId, newQuantity) => {
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    if (newQuantity <= 0) {
      return removeFromCart(itemId);
    }

    try {
      setLoading(true);
      setError(null);

      // debugLog('UPDATE', 'Updating item quantity', { itemId, newQuantity });

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('item_id', itemId);

      if (updateError) throw updateError;

      // Refresh cart
      await getOrCreateUserCart();
      
    } catch (error) {
      console.error('Error updating cart item:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading, getOrCreateUserCart]);

  const removeFromCart = useCallback(async (itemId) => {
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // debugLog('REMOVE', 'Removing item', { itemId });

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('item_id', itemId);

      if (deleteError) throw deleteError;

      // Refresh cart
      await getOrCreateUserCart();
      
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading, getOrCreateUserCart]);

  const clearCart = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user) {
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // debugLog('CLEAR', 'Clearing cart');

      // Get user's cart
      const { data: carts } = await supabase
        .from('carts')
        .select('cart_id')
        .eq('user_id', user.id);

      if (carts && carts.length > 0) {
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', carts[0].cart_id);

        if (deleteError) throw deleteError;
      }

      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  // Load cart when user authentication state changes, but only when auth is ready
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      getOrCreateUserCart();
    } else if (!authLoading && !isAuthenticated) {
      // Clear cart when user logs out (only when auth is not loading)
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      setError(null);
    }
  }, [isAuthenticated, user, authLoading, getOrCreateUserCart]);

  const getItemQuantity = useCallback((productId) => {
    const item = cartItems.find(item => item.test_kit_id === productId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const isInCart = useCallback((productId) => {
    return cartItems.some(item => item.test_kit_id === productId);
  }, [cartItems]);

  const value = {
    cartItems,
    cartSummary,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    forceRefreshCart: getOrCreateUserCart,
    getItemQuantity,
    isInCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};