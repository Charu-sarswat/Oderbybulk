import React, { useState, useEffect } from 'react';
import { Save, Truck, Sparkles, Settings as SettingsIcon, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../components/PageHeader';
import SkeletonLoader from '../components/SkeletonLoader';

export default function Settings() {
  const { addToast } = useToast();
  const { token } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [deliveryFee, setDeliveryFee] = useState(45);
  const [freeThreshold, setFreeThreshold] = useState(399);
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true);
  const [deliveryDisabledNotice, setDeliveryDisabledNotice] = useState('Home Delivery is temporarily paused. Please choose Takeaway (Self Pickup) or Dine-In!');
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [storeOpeningTime, setStoreOpeningTime] = useState('11:30');
  const [storeClosingTime, setStoreClosingTime] = useState('23:30');
  const [storeClosedMessage, setStoreClosedMessage] = useState('We are currently closed for orders. Please visit during regular hours (11:30 AM - 11:30 PM)!');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.delivery_fee !== undefined) setDeliveryFee(data.delivery_fee);
          if (data.free_delivery_threshold !== undefined) setFreeThreshold(data.free_delivery_threshold);
          if (data.is_delivery_enabled !== undefined) setIsDeliveryEnabled(Boolean(data.is_delivery_enabled));
          if (data.delivery_disabled_notice !== undefined) setDeliveryDisabledNotice(data.delivery_disabled_notice);
          if (data.is_store_open !== undefined) setIsStoreOpen(Boolean(data.is_store_open));
          if (data.store_opening_time !== undefined) setStoreOpeningTime(data.store_opening_time);
          if (data.store_closing_time !== undefined) setStoreClosingTime(data.store_closing_time);
          if (data.store_closed_message !== undefined) setStoreClosedMessage(data.store_closed_message);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        addToast('Failed to load settings from server.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [apiUrl, addToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          delivery_fee: Number(deliveryFee),
          free_delivery_threshold: Number(freeThreshold),
          is_delivery_enabled: isDeliveryEnabled,
          delivery_disabled_notice: deliveryDisabledNotice,
          is_store_open: isStoreOpen,
          store_opening_time: storeOpeningTime,
          store_closing_time: storeClosingTime,
          store_closed_message: storeClosedMessage
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('System settings updated successfully!', 'success');
      } else {
        addToast(data.message || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="card" />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="System Configuration"
        description="Manage global delivery rules, shipping thresholds, and courier integrations."
        icon={SettingsIcon}
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[white] rounded-3xl p-6 border border-[#141B20] shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#141B20]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[white] border border-[#A97E16] text-[#A97E16] flex items-center justify-center font-bold shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-[#141B20] tracking-wide">Home Delivery & Shipping Configuration</h3>
                  <p className="text-[10px] text-[#141B20] font-medium">Toggle home delivery on/off and define pricing guidelines</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                isDeliveryEnabled ? 'bg-[white] text-[#A97E16] border border-[#A97E16]' : 'bg-[white] text-[#A97E16] border border-[#A97E16]'
              }`}>
                {isDeliveryEnabled ? '🟢 Delivery Active' : '🔴 Delivery Paused'}
              </span>
            </div>

            <div className="space-y-5">
              {/* Home Delivery Active Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[white] border border-[#141B20]/80">
                <div>
                  <label className="block text-xs font-bold text-[#141B20]">Home Delivery Service</label>
                  <p className="text-[10px] text-[#141B20] mt-0.5">When disabled, customers can only choose Dine-In or Takeaway (Self Pickup).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeliveryEnabled(!isDeliveryEnabled)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isDeliveryEnabled ? 'bg-[white]' : 'bg-[white]'
                  }`}
                >
                  <div className={`bg-[white] w-6 h-6 rounded-full shadow-md transform transition-transform ${
                    isDeliveryEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {!isDeliveryEnabled && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-[#141B20]">Delivery Disabled Announcement Notice</label>
                  <textarea
                    rows="2"
                    value={deliveryDisabledNotice}
                    onChange={(e) => setDeliveryDisabledNotice(e.target.value)}
                    className="w-full bg-[white] border border-[#141B20] rounded-xl px-4 py-2 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-semibold"
                    placeholder="Notice shown to customers when Home Delivery is paused..."
                  />
                  <span className="text-[10px] text-[#141B20] block font-medium">Customers selecting delivery will see this explanation banner.</span>
                </div>
              )}
              {/* Delivery Fee Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#141B20]">Flat Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full bg-[white] border border-[#141B20] rounded-xl px-4 py-2.5 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-bold"
                  placeholder="e.g. 45"
                />
                <span className="text-[10px] text-[#141B20] block font-medium">This amount will be added to the customer's cart for Home Delivery.</span>
              </div>

              {/* Free Delivery Threshold Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-[#141B20]">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  className="w-full bg-[white] border border-[#141B20] rounded-xl px-4 py-2.5 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-bold"
                  placeholder="e.g. 399"
                />
                <span className="text-[10px] text-[#141B20] block font-medium">Orders with a subtotal greater than or equal to this amount qualify for free delivery.</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#141B20] hover:bg-[#141B20] text-[white] font-bold text-xs rounded-xl px-5 py-2.5 shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-[white]/30 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-[white] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Settings</span>
              </button>
            </div>
          </div>

          {/* Store Operation & Orders Restriction Card */}
          <div className="bg-[white] rounded-3xl p-6 border border-[#141B20] shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#141B20]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[white] border border-[#A97E16] text-[#141B20] flex items-center justify-center font-bold shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-[#141B20] tracking-wide">Store Status & Order Acceptance</h3>
                  <p className="text-[10px] text-[#141B20] font-medium">Control whether customer side ordering is active or locked</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                isStoreOpen ? 'bg-[white] text-[#A97E16] border border-[#A97E16]' : 'bg-[white] text-[#A97E16] border border-[#A97E16]'
              }`}>
                {isStoreOpen ? '🟢 Accepting Orders' : '🔴 Closed / Restricted'}
              </span>
            </div>

            <div className="space-y-5">
              {/* Store Open Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[white] border border-[#141B20]/80">
                <div>
                  <label className="block text-xs font-bold text-[#141B20]">Store Ordering Active</label>
                  <p className="text-[10px] text-[#141B20] mt-0.5">When disabled, customer online orders are blocked with your custom notice.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStoreOpen(!isStoreOpen)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isStoreOpen ? 'bg-[white]' : 'bg-[white]'
                  }`}
                >
                  <div className={`bg-[white] w-6 h-6 rounded-full shadow-md transform transition-transform ${
                    isStoreOpen ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Store Opening & Closing Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[white] border border-[#141B20]/80">
                <div>
                  <label className="block text-xs font-bold text-[#141B20] mb-1">Store Opening Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={storeOpeningTime}
                    onChange={(e) => setStoreOpeningTime(e.target.value)}
                    className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-bold"
                  />
                  <span className="text-[10px] text-[#141B20] mt-1 block">Default: 11:30 (11:30 AM)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141B20] mb-1">Store Closing Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={storeClosingTime}
                    onChange={(e) => setStoreClosingTime(e.target.value)}
                    className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-bold"
                  />
                  <span className="text-[10px] text-[#141B20] mt-1 block">Default: 23:30 (11:30 PM)</span>
                </div>
              </div>

              {/* Store Closed Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#141B20]">Store Closed Announcement Notice</label>
                <textarea
                  rows="2"
                  value={storeClosedMessage}
                  onChange={(e) => setStoreClosedMessage(e.target.value)}
                  className="w-full bg-[white] border border-[#141B20] rounded-xl px-4 py-2 text-xs text-[#141B20] focus:outline-none focus:border-[#141B20] font-semibold"
                  placeholder="Message shown to customers when ordering is disabled..."
                />
                <span className="text-[10px] text-[#141B20] block font-medium">This banner will appear in the customer cart when the store is closed or outside operating hours.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#141B20] hover:bg-[#141B20] text-[white] font-bold text-xs rounded-xl px-5 py-2.5 shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-[white]/30 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Update Store Status</span>
              </button>
            </div>
          </div>

          {/* Pricing Preview / Simulator Card */}
          <div className="bg-[white] rounded-3xl p-6 border border-[#141B20] shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-[#141B20] tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[white]" />
              Customer Checkout Preview
            </h4>
            <div className="bg-[white] rounded-2xl p-4 space-y-2 border border-[#A97E16]/50">
              <div className="flex justify-between text-xs text-[#141B20] font-medium">
                <span>Subtotal less than ₹{freeThreshold}</span>
                <span className="font-semibold text-[#141B20]">Subtotal + ₹{deliveryFee} Delivery Fee</span>
              </div>
              <div className="flex justify-between text-xs text-[#141B20] font-medium border-t border-[#141B20]/50 pt-2">
                <span>Subtotal of ₹{freeThreshold} or more</span>
                <span className="font-extrabold text-[#A97E16] uppercase text-[10px]">Free Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Status Sidebar */}
        <div className="space-y-6">
          <div className="bg-[white] rounded-3xl p-6 border border-[#141B20] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#141B20]">
              <Truck className="w-5 h-5 text-[white]" />
              <h3 className="font-black text-xs text-[#141B20] uppercase tracking-wider">Couriers & Partners</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[white] border border-[#A97E16] rounded-2xl space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#141B20]">🛵 Borzo Express 2-Wheeler</span>
                  <span className="bg-[white] text-[#A97E16] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Active & Connected
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-[#141B20] font-medium leading-none">Pickup Hub</p>
                  <p className="text-[10px] text-[#141B20] font-mono mt-1 font-bold truncate">4-1-833, MPM Mall, Abids Road, Hyderabad</p>
                </div>
                <p className="text-[9px] text-[#141B20] leading-normal font-medium pt-1">
                  Borzo Business API v1.8 is active. Fast point-to-point bike dispatches are automatically triggered when kitchen prepares the order.
                </p>
              </div>

              <div className="p-4 bg-[white] border border-[#141B20]/60 rounded-2xl space-y-1.5 opacity-70">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-[#141B20]">Shadowfax Hyperlocal</span>
                  <span className="bg-[white] text-[#141B20] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Backup Provider
                  </span>
                </div>
                <p className="text-[9px] text-[#141B20] font-medium">Configured as alternate fallback provider.</p>
              </div>
            </div>
          </div>

          <div className="bg-[white] border border-[#A97E16] rounded-3xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[white] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-[11px] text-[#A97E16]">Credential Security</h5>
              <p className="text-[10px] text-[#A97E16] leading-relaxed font-medium">
                To guarantee optimal safety, API credentials and partner setup constants are maintained securely inside system configuration files.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
