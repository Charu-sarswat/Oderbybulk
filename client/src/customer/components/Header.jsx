import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { 
  UserCircle, Utensils, ChefHat, Trophy, Instagram, Calendar, 
  MapPin, Clock, Phone, ExternalLink, ShoppingCart, History, LogOut, X
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useCustomerUI } from '../../context/CustomerUIContext';
import { restaurantData } from '../../config/restaurantData';
import WhatsAppIcon from './WhatsAppIcon';
const logoBanner = '/lok.png';

export default function Header() {
  const { pathname } = useLocation();
  const { tableId } = useParams();
  const { customerUser, customerLogout } = useCustomerAuth();
  const { cartItemCount, setIsCartOpen, setIsHistoryOpen, tableInfo } = useCustomerUI();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleWhatsAppChat = () => {
    const text = encodeURIComponent(`Hello Order By Bulk! I would like to place an order / ask a query.`);
    window.open(`https://wa.me/${restaurantData.whatsappNumber}?text=${text}`, '_blank');
  };

  const confirmLogoutAction = () => {
    customerLogout();
    setShowConfirmLogout(false);
  };

  // Determine path/header types
  const isMenuPage = pathname.includes('/menu');

  if (isMenuPage) {
    return (
      <header className="sticky top-0 z-40 bg-white text-[#141B20] border-b border-[#141B20]/10 font-sans">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-3">
          
          <Link to={tableId ? `/table/${tableId}` : "/"} className="flex items-center gap-3">
            <img 
              src={logoBanner} 
              alt="Order By Bulk" 
              className="h-8 sm:h-11 w-auto object-contain"
            />
            {tableInfo && (
              <span className="hidden xs:inline-flex items-center bg-[#141B20]/5 border border-[#141B20]/20 text-[#141B20] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Table {tableInfo.table_number}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            {/* History Link */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="Order History"
            >
              <History className="w-5 h-5" />
            </button>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#141B20] text-white text-[10px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Profile / Log In */}
            {customerUser ? (
              <div className="flex items-center gap-1">
                <Link to="/account" className="hidden sm:flex items-center gap-1 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-semibold text-[#F15A25] transition-all shadow-md">
                  <UserCircle className="w-4 h-4 text-[#F15A25]" />
                  <span>{customerUser.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={() => setShowConfirmLogout(true)}
                  className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <Link to="/account" className="flex items-center gap-1 bg-white hover:bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#F15A25] transition-all shadow-md">
                <UserCircle className="w-4 h-4 text-[#F15A25]" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        {showConfirmLogout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[white] rounded-3xl p-6 max-w-sm w-full border border-[white]/20 shadow-2xl text-center space-y-5">
              <div className="w-12 h-12 bg-[#141B20]/5 text-[#141B20] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <LogOut className="w-6 h-6 text-[#141B20]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-black text-lg text-[#141B20] leading-tight">Confirm Log Out</h3>
                <p className="text-xs text-[#141B20] font-medium leading-relaxed">Are you sure you want to log out of your Order By Bulk account?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmLogout(false)}
                  className="flex-1 py-3 bg-[#F15A25]/10 hover:bg-[#F15A25] text-[#141B20] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#F15A25]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogoutAction}
                  className="flex-1 py-3 bg-[#F15A25] hover:brightness-110 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  const isLanding = pathname === '/' || (pathname.startsWith('/table/') && !pathname.includes('/menu'));
  return (
    <header className={`${isLanding ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-40 px-4 py-2 sm:px-6 sm:py-3.5 bg-white/95 backdrop-blur-xl border-b border-[#141B20]/10 font-sans`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Brand Logo Banner */}
        <Link to={tableId ? `/table/${tableId}` : "/"} className="flex items-center gap-3">
          <img 
            src={logoBanner} 
            alt="Order By Bulk" 
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </Link>

        {/* Center Navigation Links (Only shown on Landing page) */}
        {!isMenuPage && pathname === '/' && (
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm lg:text-base font-bold text-[#141B20]/80">
            <a href="#hero" className="hover:text-[#F15A25] transition-colors">Home</a>
            <a href="#products" className="hover:text-[#F15A25] transition-colors">Bestsellers</a>
            <a href="#reels" className="hover:text-[#F15A25] transition-colors">Insta Reels</a>
            <a href="#catering" className="hover:text-[#F15A25] transition-colors">Party & Catering</a>
            <a href="#contact" className="hover:text-[#F15A25] transition-colors">Contact & Map</a>
          </nav>
        )}

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 sm:gap-4">


          {customerUser ? (
            <Link to="/account" className="flex items-center gap-1.5 bg-[#F15A25] hover:brightness-110 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md">
              <UserCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">{customerUser.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link to="/account" className="flex items-center gap-1.5 bg-[#F15A25] hover:brightness-110 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md">
              <UserCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[white] rounded-3xl p-6 max-w-sm w-full border border-[white]/20 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 bg-[#141B20]/5 text-[#141B20] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-6 h-6 text-[#141B20]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-black text-lg text-[#141B20] leading-tight">Confirm Log Out</h3>
              <p className="text-xs text-[#141B20] font-medium leading-relaxed">Are you sure you want to log out of your Order By Bulk account?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="flex-1 py-3 bg-[#F15A25]/10 hover:bg-[#F15A25] text-[#141B20] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#F15A25]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogoutAction}
                className="flex-1 py-3 bg-[#F15A25] hover:brightness-110 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
