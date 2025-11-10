// src/contexts/CartContext.jsx - WITH PARTNER VALIDATION
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { validateAddToCart, getCartPartnerInfo } from '../utils/cartValidation';

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
  const [cartPartnerInfo, setCartPartnerInfo] = useState(null);
  
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Get or create user cart - simplified version that handles loading states
  const getOrCreateUserCart = useCallback(async () => {
    // Don't try to load cart if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated || !user) {
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      setCartPartnerInfo(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
      } else {
        // Create new cart
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

      // Get cart items with consistent ordering
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
        .order('created_at', { ascending: true });

      if (itemsError) {
        throw itemsError;
      }

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
      setCartPartnerInfo(null);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  // Update cart partner info when cart items change
  useEffect(() => {
    const updatePartnerInfo = async () => {
      if (cartItems.length > 0) {
        const partnerInfo = getCartPartnerInfo(cartItems);
        
        if (partnerInfo?.partnerId) {
          try {
            // Fetch full partner details
            const { data: partner, error } = await supabase
              .from('partners')
              .select('partner_name, partner_slug')
              .eq('partner_id', partnerInfo.partnerId)
              .single();

            if (!error && partner) {
              setCartPartnerInfo({
                partnerId: partnerInfo.partnerId,
                partnerName: partner.partner_name,
                partnerSlug: partner.partner_slug
              });
            } else {
              setCartPartnerInfo(partnerInfo);
            }
          } catch (err) {
            console.error('Error fetching partner details:', err);
            setCartPartnerInfo(partnerInfo);
          }
        } else {
          setCartPartnerInfo(null);
        }
      } else {
        setCartPartnerInfo(null);
      }
    };

    updatePartnerInfo();
  }, [cartItems]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (authLoading || !isAuthenticated || !user) {
      setError('Please log in to add items to cart');
      return { success: false, error: 'Please log in to add items to cart' };
    }

    try {
      // VALIDATE BEFORE ADDING - Check for partner conflicts
      const validation = validateAddToCart(cartItems, product.partner_id || null);
      
      if (!validation.allowed) {
        setError(validation.reason);
        return { 
          success: false, 
          error: validation.reason,
          conflictType: validation.conflictType
        };
      }

      setLoading(true);
      setError(null);
      
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
      } else {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([{ user_id: user.id }])
          .select('cart_id')
          .single();
        
        if (createError) throw createError;
        cartId = newCart.cart_id;
      }

      // Check if item already exists
      const { data: existingItems, error: existingError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('test_kit_id', product.id);

      if (existingError) {
        throw existingError;
      }

      const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

      if (existingItem) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', existingItem.item_id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Add new item to cart WITH partner_id
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            cart_id: cartId,
            test_kit_id: product.id,
            quantity: quantity,
            partner_id: product.partner_id || null
          }]);

        if (insertError) {
          throw insertError;
        }
      }

      // Refresh cart
      await getOrCreateUserCart();
      
      return { success: true };
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, authLoading, getOrCreateUserCart, cartItems]);

  const removeFromCart = useCallback(async (itemId) => {
    if (authLoading || !isAuthenticated || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
  }, [user, isAuthenticated, authLoading, getOrCreateUserCart, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (authLoading || !isAuthenticated || !user) {
      setCartItems([]);
      setCartSummary({ totalItems: 0, totalPrice: 0 });
      setCartPartnerInfo(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
      setCartPartnerInfo(null);
      
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
      setCartPartnerInfo(null);
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
    cartPartnerInfo,
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