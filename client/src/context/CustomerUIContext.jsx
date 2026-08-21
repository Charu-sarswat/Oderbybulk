import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from './ToastContext';

const CustomerUIContext = createContext(null);

export const useCustomerUI = () => {
  return useContext(CustomerUIContext);
};

export const CustomerUIProvider = ({ children }) => {
  const { addToast } = useToast();
  
  // Cart & Drawers State
  const [cart, setCart] = useState([]);
  const [cartService, setCartService] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [tableInfo, setTableInfo] = useState(null);
  const [lastOrderId, setLastOrderId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Cart Functions
  const addToCart = (item, quantity = 1, selectedVariant = null, selectedAddons = [], customNotes = '', service = null) => {
    const itemService = item.service_type || service || 'FOOD';
    if (cart.length > 0 && cartService && cartService !== itemService) {
      return { error: 'MIXED_CART', currentService: cartService, attemptedService: itemService };
    }

    let finalPrice = parseFloat(item.price);
    if (selectedVariant) finalPrice += parseFloat(selectedVariant.price || 0);
    if (selectedAddons && selectedAddons.length > 0) {
      selectedAddons.forEach(a => { finalPrice += parseFloat(a.price || 0); });
    }

    const noteParts = [];
    if (selectedVariant) noteParts.push(`Variant: ${selectedVariant.name}`);
    if (selectedAddons && selectedAddons.length > 0) {
      noteParts.push(`Addons: ${selectedAddons.map(a => a.name).join(', ')}`);
    }
    if (customNotes) noteParts.push(customNotes);

    const fullNotes = noteParts.join(' | ');

    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.menu_item_id === item.id && c.notes === fullNotes);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, {
        menu_item_id: item.id,
        id: item.id,
        name: item.name,
        price: finalPrice,
        quantity,
        notes: fullNotes,
        image_url: item.image_url
      }];
    });

    setCartService(itemService);
    addToast(`Added "${item.name}" to cart!`, 'success');
    return { success: true };
  };

  const updateCartQuantity = (menuItemId, notes, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => {
        const nextCart = prev.filter(c => !(c.menu_item_id === menuItemId && c.notes === notes));
        if (nextCart.length === 0) setCartService(null);
        return nextCart;
      });
    } else {
      setCart(prev => prev.map(c => 
        c.menu_item_id === menuItemId && c.notes === notes 
          ? { ...c, quantity: newQuantity } 
          : c
      ));
    }
  };

  const removeFromCart = (menuItemId, notes) => {
    setCart(prev => {
      const nextCart = prev.filter(c => !(c.menu_item_id === menuItemId && c.notes === notes));
      if (nextCart.length === 0) setCartService(null);
      return nextCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartService(null);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    setCart,
    cartService,
    setCartService,
    isCartOpen,
    setIsCartOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    tableInfo,
    setTableInfo,
    lastOrderId,
    setLastOrderId,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartItemCount,
    apiUrl
  };

  return (
    <CustomerUIContext.Provider value={value}>
      {children}
    </CustomerUIContext.Provider>
  );
};
