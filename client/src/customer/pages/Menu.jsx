import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Search, 
  X,
  History,
  UserCircle,
  LogOut,
  Plus,
  Minus,
  CheckCircle2,
  Utensils
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useCustomerUI } from '../../context/CustomerUIContext';
import { restaurantConfig } from '../../config/restaurant';
import CartDrawer from '../components/CartDrawer';
import CustomizationModal from '../components/CustomizationModal';
import CustomerLoginModal from '../components/CustomerLoginModal';
import OrderHistoryDrawer from '../components/OrderHistoryDrawer';
import Footer from '../components/Footer';

export default function Menu() {
  useSEO({
    title: 'Online Menu - Order Pure Veg Mumbai Chaat',
    description: 'Browse the complete 100% Pure Veg menu of Order By Bulk. Order Pani Puri, Pav Bhaji, Raj Kachori, Bhel Puri, Dahi Puri and more online. Dine-in, Takeaway or Home Delivery available.',
    canonical: 'https://bombaychowpati.com/menu',
  });
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { customerUser, customerLogout } = useCustomerAuth();
  const { 
    cart, addToCart, updateCartQuantity, removeFromCart, clearCart, cartItemCount,
    isCartOpen, setIsCartOpen, isHistoryOpen, setIsHistoryOpen,
    tableInfo, setTableInfo, lastOrderId, setLastOrderId, apiUrl, cartService
  } = useCustomerUI();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceSort, setPriceSort] = useState('none');
  const [currentService, setCurrentService] = useState('FOOD');

  // Modals
  const [customizationItem, setCustomizationItem] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);


  // Fetch Table Data
  useEffect(() => {
    if (tableId) {
      fetch(`${apiUrl}/api/tables/${tableId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setTableInfo(data))
        .catch(console.error);
    }
  }, [tableId, apiUrl]);

  // Read search query parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
      setIsSearchOpen(true);
    }
    const serviceParam = params.get('service');
    if (serviceParam) {
      setCurrentService(serviceParam);
    }
  }, []);

  const handleAddToCart = (item, quantity = 1, selectedVariant = null, selectedAddons = [], customNotes = '') => {
    const itemService = (item.service_types && item.service_types.length > 0) ? item.service_types[0] : (item.service_type || currentService || 'FOOD');
    const result = addToCart(item, quantity, selectedVariant, selectedAddons, customNotes, itemService);
    if (result && result.error === 'MIXED_CART') {
      if (window.confirm(`Your cart contains ${result.currentService} items. To order from ${result.attemptedService}, please clear your current cart and switch service.`)) {
        clearCart();
        addToCart(item, quantity, selectedVariant, selectedAddons, customNotes, itemService);
      }
    }
  };

  // Fetch Menu Categories and Items
  const fetchMenuData = useCallback(async () => {
    try {
      const catRes = await fetch(`${apiUrl}/api/menu/categories`);
      const catData = await catRes.json();
      if (catRes.ok) setCategories(catData);

      const itemsRes = await fetch(`${apiUrl}/api/menu/items`);
      const itemsData = await itemsRes.json();
      if (itemsRes.ok) setMenuItems(itemsData);
    } catch (err) {
      console.error(err);
      addToast('Failed to load menu data', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, addToast]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  const handleOrderPlaced = (orderId) => {
    setLastOrderId(orderId);
    clearCart();
    setIsCartOpen(false);
    addToast('Order placed successfully!', 'success');
    navigate(`/order/${orderId}`);
  };

  // Filtered Items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // We compute activeCategories below, but we need to derive the actual category first
    // Since we're in a render cycle, we'll just evaluate matchesService first
    const matchesService = item.service_types && item.service_types.length > 0 
      ? item.service_types.includes(currentService) 
      : item.service_type === currentService;
    return matchesSearch && matchesService;
  }).sort((a, b) => {
    if (priceSort === 'low-to-high') return parseFloat(a.price) - parseFloat(b.price);
    if (priceSort === 'high-to-low') return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  const activeCategories = categories.filter(cat => {
    const catId = (cat.id || cat._id).toString();
    return menuItems.some(item => 
      (item.service_types && item.service_types.length > 0 ? item.service_types.includes(currentService) : item.service_type === currentService) && 
      (
        (item.category_id && item.category_id.toString() === catId) ||
        (item.category_ids && item.category_ids.some(id => id && id.toString() === catId))
      )
    );
  });

  // Category Enforcement: 'all' or specific category
  let actualSelectedCategory = selectedCategory;
  if (actualSelectedCategory !== 'all') {
    if (!actualSelectedCategory && activeCategories.length > 0) {
      actualSelectedCategory = 'all';
    } else if (actualSelectedCategory && !activeCategories.find(c => (c.id || c._id).toString() === actualSelectedCategory.toString()) && activeCategories.length > 0) {
      actualSelectedCategory = 'all';
    }
  }

  // Now properly filter items by the category (or 'all')
  const finalFilteredItems = filteredItems.filter(item => {
    if (actualSelectedCategory === 'all') return true;
    if (!actualSelectedCategory) return false;
    return (item.category_id && item.category_id.toString() === actualSelectedCategory.toString()) ||
           (item.category_ids && item.category_ids.some(id => id && id.toString() === actualSelectedCategory.toString()));
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[white]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#141B20] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#141B20] font-bold font-serif text-sm">Loading Order By Bulk Catalog...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="bg-[white] text-[#141B20] font-sans">
  
          {/* Smart Compact Search & Filter Bar */}
          <div className="bg-[white] border-b border-[#141B20]/20 px-3 py-2.5 sticky top-[64px] sm:top-[68px] z-30">
            <div className="max-w-7xl mx-auto flex items-center gap-2">
  
              {/* Fixed Search Button / Expanded Input */}
              <div className="relative flex-shrink-0">
                {isSearchOpen ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#141B20] absolute left-3 top-2.5" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search dishes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-48 sm:w-64 bg-[white] border border-[#141B20]/50 rounded-xl pl-8 pr-3 py-2 text-xs text-[#141B20] placeholder-[#141B20] focus:outline-none focus:border-[#141B20] focus:ring-1 focus:ring-[#141B20]/20 transition-all"
                      />
                  </div>
                  <button
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                    className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#141B20] transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                  <button
                    onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                    className="flex items-center gap-1.5 bg-[#141B20] hover:bg-[#141B20] text-[white] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex-shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[white]/30 flex-shrink-0" />

            {/* Scrollable Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 py-0.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                  actualSelectedCategory === 'all'
                    ? 'bg-[#141B20] text-[white] shadow-md'
                    : 'bg-[white]/10 text-[#141B20] border border-[#141B20]/30 hover:bg-[white]/20'
                }`}
              >
                All
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id || cat._id}
                  onClick={() => setSelectedCategory(cat.id || cat._id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                    actualSelectedCategory === (cat.id || cat._id)
                      ? 'bg-[#141B20] text-[white] shadow-md'
                      : 'bg-[white]/10 text-[#141B20] border border-[#141B20]/30 hover:bg-[white]/20'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Suggestions Dropdown */}
          {isSearchOpen && searchQuery.length > 0 && (
            <div className="max-w-7xl mx-auto mt-2">
              <div className="bg-[white] border border-[white]/30 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                {menuItems
                  .filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 6)
                  .map(item => {
                    const isUnlimited = Boolean(item.is_unlimited_stock);
                    const isOutOfStock = !isUnlimited && (item.is_available === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setSearchQuery(item.name); setIsSearchOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF9EE] transition-colors text-left border-b border-gray-50 last:border-0 cursor-pointer ${
                          isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                          <img src={item.image_url || 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=100'} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#141B20] truncate">{item.name}</p>
                            {isOutOfStock && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded shrink-0">
                                Out of stock
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#141B20] truncate">{item.description}</p>
                        </div>
                        <span className="text-xs font-black text-[#691F1A] flex-shrink-0">₹{parseFloat(item.price).toFixed(0)}</span>
                      </button>
                    );
                  })}
                {menuItems.filter(item =>
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-[#141B20]">No dishes found for "{searchQuery}"</div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-28 w-full">

        {/* Empty State */}
        {finalFilteredItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[white]/10 border border-[white]/30 flex items-center justify-center">
              <Utensils className="w-8 h-8 text-[white]" />
            </div>
            <p className="font-serif font-bold text-lg text-[#141B20]">No dishes found</p>
            <p className="text-xs text-[#141B20] max-w-xs">Try a different category or clear your search.</p>
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {finalFilteredItems.map(item => {
            const inCart = cart.find(c => c.menu_item_id === item.id);
            const cartQty = inCart ? inCart.quantity : 0;
            const isUnlimited = Boolean(item.is_unlimited_stock);
            const isOutOfStock = !isUnlimited && (item.is_available === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));

            return (
              <div
                key={item.id}
                className={`bg-[white] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col group ${
                  isOutOfStock 
                    ? 'opacity-80' 
                    : 'hover:shadow-lg'
                }`}
              >
                {/* Card Top: Opens details/customization sheet */}
                <div 
                  onClick={() => setCustomizationItem(item)}
                  className="cursor-pointer flex-1 flex flex-col justify-start relative"
                >
                  {/* Image */}
                  <div className="relative w-full bg-gray-50 overflow-hidden" style={{ paddingBottom: '62%' }}>
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600'}
                      alt={item.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
                        isOutOfStock ? 'grayscale contrast-75 brightness-95' : 'group-hover:scale-105'
                      }`}
                    />
                    {/* Out of Stock Overlay / Badge */}
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2">
                        <span className="bg-[#141B20] text-[white] font-extrabold text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md backdrop-blur-xs">
                          Out of Stock
                        </span>
                      </div>
                    ) : null}

                    {/* Veg dot & Tags */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-md bg-[white]/95 shadow-sm border border-emerald-500/40 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      </div>
                      {item.is_featured && (
                        <span className="bg-[#141B20] text-[white] text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-0.5">
                          ★ Special
                        </span>
                      )}
                      {item.is_combo && (
                        <span className="bg-[#141B20] text-[white] text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-0.5">
                          Combo
                        </span>
                      )}
                    </div>
                    {/* Cart qty badge */}
                    {cartQty > 0 && (
                      <div className="absolute top-2 right-2 bg-[#141B20] text-[white] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                        {cartQty}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-1">
                    <div>
                      <h3 className={`font-serif font-black text-sm leading-tight transition-colors line-clamp-2 ${
                        isOutOfStock ? 'text-[#141B20]' : 'text-[#141B20] group-hover:text-[#141B20]/70'
                      }`}>
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] text-[#141B20] mt-1 line-clamp-2 leading-relaxed font-light">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price + Action Row (Kept outside click wrapper) */}
                <div className="p-3 pt-0 flex items-center justify-between gap-2">
                  <span className={`font-black text-sm ${isOutOfStock ? 'text-[#141B20] line-through' : 'text-[#141B20]'}`}>
                    {restaurantConfig.currency}{parseFloat(item.price).toFixed(0)}
                  </span>

                  {isOutOfStock ? (
                    <span className="text-[10px] font-bold text-[#141B20] bg-[white] border border-[#141B20]/60 px-2.5 py-1 rounded-lg uppercase tracking-wider select-none">
                      Unavailable
                    </span>
                  ) : cartQty > 0 ? (
                    <div className="flex items-center gap-1 bg-[#141B20] text-[white] rounded-xl px-1.5 py-1 shadow-sm">
                      <button
                        onClick={() => updateCartQuantity(item.id, inCart.notes, cartQty - 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-[white]/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-xs text-[white] min-w-[16px] text-center">{cartQty}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, inCart.notes, cartQty + 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-[white]/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (!cartService || (item.service_types && item.service_types.length > 0 ? item.service_types.includes(cartService) : cartService === item.service_type)) ? (
                    <button
                      onClick={() => {
                        if ((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) {
                          setCustomizationItem(item);
                        } else {
                          handleAddToCart(item, 1);
                        }
                      }}
                      className="flex items-center gap-1 bg-[#141B20] hover:bg-[#141B20]/80 text-[white] font-black py-1.5 px-3 rounded-xl transition-all text-[11px] uppercase tracking-wide cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-fade-in">
          <div 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#141B20] text-[white] p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer hover:bg-[#141B20]/90 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[white] text-[#141B20] font-black flex items-center justify-center shadow-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[white]/80 uppercase font-bold tracking-wider block">
                  {cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'} Selected
                </span>
                <span className="text-base font-black text-[white]">
                  {restaurantConfig.currency}{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}
                </span>
              </div>
            </div>

            <button className="bg-[white] text-[#141B20] font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer">
              View Cart & Pay
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        tableId={tableId}
        tableNumber={tableInfo?.table_number}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        onOrderPlaced={handleOrderPlaced}
        menuItems={menuItems}
        addToCart={handleAddToCart}
        cartService={cartService}
        currentService={currentService}
      />

      <CustomizationModal 
        isOpen={!!customizationItem}
        onClose={() => setCustomizationItem(null)}
        item={customizationItem}
        menuItems={menuItems}
        onAddToCart={handleAddToCart}
      />

      <CustomerLoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <OrderHistoryDrawer 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Rich Brand Footer */}
      <Footer />
    </div>
  );
}
