import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import SkeletonLoader from '../components/SkeletonLoader';
import {
  Bike, ExternalLink, Phone, CheckCircle2,
  Clock, RefreshCw, Search, ArrowUpRight,
  Loader2, ShieldCheck, MapPin, IndianRupee, Radio
} from 'lucide-react';

export default function DeliveryManagement() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('order') || '');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | unassigned | assigned | out_for_delivery | delivered
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [bookingLoading, setBookingLoading] = useState({});

  useEffect(() => {
    const q = searchParams.get('order');
    if (q) {
      setSearchQuery(q);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/orders?channel=delivery`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const deliveryOrders = Array.isArray(data)
          ? data.filter(o => o.order_channel === 'delivery')
          : [];
        setOrders(deliveryOrders);
      }
    } catch (err) {
      console.error('Failed to fetch delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (updatedOrder) => {
      const orderId = updatedOrder.id || updatedOrder.order_number || updatedOrder._id;
      setOrders(prev => {
        const exists = prev.some(o => (o.order_number && o.order_number === orderId) || o.id === orderId || o._id === orderId);
        if (exists) {
          return prev.map(o => (o.order_number === orderId || o.id === orderId || o._id === orderId) ? { ...o, ...updatedOrder } : o);
        }
        if (updatedOrder.order_channel === 'delivery') {
          return [updatedOrder, ...prev];
        }
        return prev;
      });
    };

    socket.on('order_created', handleOrderUpdate);
    socket.on('order_status_updated', handleOrderUpdate);
    socket.on('order_status_change', handleOrderUpdate);

    return () => {
      socket.off('order_created', handleOrderUpdate);
      socket.off('order_status_updated', handleOrderUpdate);
      socket.off('order_status_change', handleOrderUpdate);
    };
  }, [socket]);

  // 1-Click Request Borzo Rider
  const handleRequestBorzoRider = async (order) => {
    const orderId = order.id || order.order_number || order._id;
    setBookingLoading(prev => ({ ...prev, [orderId]: true }));
    addToast(`🛵 Requesting Borzo bike courier for #${order.order_number}...`, 'info');

    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/book-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ provider: 'borzo' })
      });

      const data = await res.json();
      if (res.ok) {
        addToast(`✅ Borzo Rider Assigned! Reference: ${data.order?.delivery_job_id || 'Assigned'}`, 'success');
        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.order_number === orderId || o._id === orderId) {
            return {
              ...o,
              delivery_job_id: data.order?.delivery_job_id || o.delivery_job_id,
              delivery_status: data.order?.delivery_status || 'assigned',
              delivery_rider_name: data.order?.delivery_rider_name || 'Borzo Rider',
              delivery_rider_phone: data.order?.delivery_rider_phone || '',
              pickup_tracking_url: data.order?.pickup_tracking_url || o.pickup_tracking_url,
              delivery_tracking_url: data.order?.delivery_tracking_url || o.delivery_tracking_url,
              pickup_otp: data.order?.pickup_otp || o.pickup_otp,
              delivery_otp: data.order?.delivery_otp || o.delivery_otp
            };
          }
          return o;
        }));
      } else {
        addToast(`❌ Booking Failed: ${data.message || 'Borzo API rejected request'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error contacting Borzo API', 'error');
    } finally {
      setBookingLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Cancel Borzo Delivery
  const handleCancelBorzoRider = async (order) => {
    const orderId = order.id || order.order_number || order._id;
    if (!window.confirm(`Are you sure you want to cancel the Borzo delivery for #${order.order_number}?`)) return;

    setBookingLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/cancel-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`✅ Borzo delivery dispatch for #${order.order_number} cancelled`, 'info');
        setOrders(prev => prev.map(o => {
          if (o.id === orderId || o.order_number === orderId || o._id === orderId) {
            return {
              ...o,
              delivery_job_id: null,
              delivery_status: null,
              delivery_rider_name: null,
              delivery_rider_phone: null,
              pickup_tracking_url: null,
              delivery_tracking_url: null
            };
          }
          return o;
        }));
      } else {
        addToast(`❌ Cancel failed: ${data.message}`, 'error');
      }
    } catch (err) {
      addToast('Error cancelling rider', 'error');
    } finally {
      setBookingLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchQuery ||
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery) ||
        order.delivery_job_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.delivery_rider_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'unassigned') return !order.delivery_job_id && order.status !== 'delivered' && order.status !== 'cancelled';
      if (statusFilter === 'assigned') return Boolean(order.delivery_job_id) && order.status !== 'out_for_delivery' && order.status !== 'delivered' && order.status !== 'cancelled';
      if (statusFilter === 'out_for_delivery') return order.status === 'out_for_delivery' || (order.delivery_status || '').toLowerCase() === 'active';
      if (statusFilter === 'delivered') return order.status === 'delivered';

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // KPI Metrics
  const totalDeliveries = orders.length;
  const activeOnRoad = orders.filter(o => o.status === 'out_for_delivery' || (o.delivery_status || '').toLowerCase() === 'active').length;
  const pendingDispatch = orders.filter(o => !o.delivery_job_id && o.status !== 'delivered' && o.status !== 'cancelled').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className=" max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title="Delivery Management"
        subtitle="Track hyperlocal deliveries, live rider routes, OTP handovers, and 1-click Borzo dispatches."
        badge="Borzo Business API 1.8"
      >
        <button
          onClick={() => { fetchDeliveries(); addToast('Refreshed deliveries', 'info'); }}
          className="bg-[white] hover:bg-[white] border border-[#141B20] text-[#141B20] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </PageHeader>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#A97E16] text-[#A97E16] flex items-center justify-center font-bold shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Total Deliveries</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{totalDeliveries}</div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#A97E16] text-[#141B20] flex items-center justify-center font-bold shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Active on Road</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{activeOnRoad}</div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#A97E16] text-[#A97E16] flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Pending Dispatch</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{pendingDispatch}</div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#A97E16] text-[#A97E16] flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Delivered</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{deliveredCount}</div>
          </div>
        </div>
      </div>

      {/* Single Unified Edge-to-Edge Table Panel Card Container */}
      <div className="bg-[white] rounded-3xl border border-[#141B20] shadow-xs overflow-hidden">
        {/* Search & Filters Header with Padding */}
        <div className="p-4 sm:p-5 border-b border-[#141B20]">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#141B20] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search order #, customer name, phone, address, Borzo ref ID..."
                className="w-full pl-9 pr-4 py-2 bg-[white]/50 border border-[#141B20] rounded-xl text-xs font-semibold text-[#141B20] placeholder-gray-400 focus:outline-none focus:border-[#141B20]"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {[
                { id: 'ALL', label: `All (${orders.length})` },
                { id: 'unassigned', label: `⏳ Unbooked (${pendingDispatch})` },
                { id: 'assigned', label: `🛵 Assigned (${orders.filter(o => o.delivery_job_id && o.status !== 'out_for_delivery' && o.status !== 'delivered' && o.status !== 'cancelled').length})` },
                { id: 'out_for_delivery', label: `🚀 On The Way (${activeOnRoad})` },
                { id: 'delivered', label: `✅ Delivered (${deliveredCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-[#141B20] text-[white] shadow-xs'
                      : 'bg-[white] text-[#141B20] hover:bg-[white]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clean Deliveries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[white] border-b border-[#141B20] text-[10px] uppercase font-black tracking-wider text-[#141B20]">
                <th className="py-3.5 px-4 sm:px-6">Order Details</th>
                <th className="py-3.5 px-4 sm:px-6">Customer & Address</th>
                <th className="py-3.5 px-4 sm:px-6">Delivery Status</th>
                <th className="py-3.5 px-4 sm:px-6">Borzo Courier</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Security OTPs</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Live Tracking</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141B20] text-xs font-medium text-[#141B20]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8">
                    <SkeletonLoader count={5} />
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-[#141B20]">
                    <Bike className="w-8 h-8 mx-auto mb-2 text-[#141B20]" />
                    <p className="font-bold text-[#141B20] text-sm">No delivery orders found</p>
                    <p className="text-[11px] text-[#141B20] mt-0.5">Orders placed for Home Delivery will appear here.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => {
                  const orderId = order.id || order.order_number || order._id;
                  const isCancelled = order.status === 'cancelled' || order.delivery_status === 'cancelled';
                  const isBooked = Boolean(order.delivery_job_id);
                  const isDelivered = order.status === 'delivered';
                  const isOutForDelivery = order.status === 'out_for_delivery' || ['in_transit', 'picked_up', 'ofp', 'ofd'].includes((order.delivery_status || '').toLowerCase());
                  const hasRiderAssigned = Boolean((order.delivery_rider_name && order.delivery_rider_name !== 'Borzo Bike Rider' && order.delivery_rider_name !== 'Borzo Rider') || ['assigned', 'courier_assigned', 'active'].includes(order.delivery_status));

                  return (
                    <tr key={orderId} className={`transition-colors ${isCancelled ? 'bg-[white] opacity-70' : 'hover:bg-[white]'}`}>
                      {/* 1. Order Number & Time */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-serif font-black text-[#141B20] text-sm">
                          #{order.order_number || orderId}
                        </div>
                        <div className="text-[10px] text-[#141B20] mt-0.5 flex items-center gap-1.5">
                          <span>{new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="font-bold text-[#141B20]">₹{parseFloat(order.total_amount || 0).toFixed(0)}</span>
                          <span className="uppercase text-[9px] px-1 py-0.2 rounded font-black bg-[white] text-[#141B20]">
                            {order.payment_method || 'UPI'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Customer & Address */}
                      <td className="py-3.5 px-4 sm:px-6 max-w-[220px]">
                        <div className="font-bold text-[#141B20] truncate">
                          {order.customer_name || 'Guest'}
                        </div>
                        {order.customer_phone && (
                          <a href={`tel:${order.customer_phone}`} className="text-[10px] text-[#141B20] hover:underline font-semibold block">
                            📞 {order.customer_phone}
                          </a>
                        )}
                        <div className="text-[10px] text-[#141B20] truncate mt-0.5" title={order.delivery_address}>
                          📍 {order.delivery_address || 'No address'}
                        </div>
                      </td>

                      {/* 3. Delivery Status */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[white] text-[#A97E16] border border-[#A97E16]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[white]" />
                            <span>Cancelled</span>
                          </span>
                        ) : isDelivered ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[white] text-[#A97E16] border border-[#A97E16]">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#A97E16]" />
                            <span>Delivered</span>
                          </span>
                        ) : isOutForDelivery ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#141B20] text-[white] border border-[white]/40 animate-pulse">
                            <Bike className="w-2.5 h-2.5" />
                            <span>On The Way</span>
                          </span>
                        ) : isBooked && hasRiderAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[white] text-[#A97E16] border border-[#A97E16]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[white]" />
                            <span>Rider Assigned</span>
                          </span>
                        ) : isBooked ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[white] text-[#A97E16] border border-[#A97E16] animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-[#A97E16]" />
                            <span>Finding Courier</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[white] text-[#141B20] border border-[#141B20]">
                            <Clock className="w-2.5 h-2.5 text-[#141B20]" />
                            <span>Unbooked</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Delivery Courier Details */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {isBooked && !isCancelled ? (
                          order.delivery_rider_name && order.delivery_rider_name !== 'Borzo Bike Rider' && order.delivery_rider_name !== 'Borzo Rider' ? (
                            <div>
                              <div className="font-bold text-[#141B20] text-xs">
                                {order.delivery_rider_name}
                              </div>
                              <div className="text-[10px] text-[#141B20] font-mono">
                                Ref: {order.delivery_job_id}
                              </div>
                              {order.delivery_rider_phone && (
                                <a href={`tel:${order.delivery_rider_phone}`} className="text-[10px] text-[#141B20] hover:underline font-bold block">
                                  📞 {order.delivery_rider_phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="text-[#A97E16] font-bold text-xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[white] animate-ping" />
                                <span>Searching for courier...</span>
                              </div>
                              <div className="text-[10px] text-[#141B20] font-mono mt-0.5">
                                Ref: {order.delivery_job_id}
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] text-[#141B20] italic">{isCancelled ? 'Cancelled' : 'Not booked'}</span>
                        )}
                      </td>

                      {/* 5. Security OTPs */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-center">
                        {isBooked && !isCancelled && (order.pickup_otp || order.delivery_otp) ? (
                          <div className="inline-flex flex-col gap-1 text-[9px]">
                            {order.pickup_otp && (
                              <span className="bg-[white] border border-[#A97E16] px-2 py-0.5 rounded text-[#A97E16] font-bold font-mono">
                                Pickup: <strong className="font-black">{order.pickup_otp}</strong>
                              </span>
                            )}
                            {order.delivery_otp && (
                              <span className="bg-[white] border border-[#A97E16] px-2 py-0.5 rounded text-[#A97E16] font-bold font-mono">
                                Drop: <strong className="font-black">{order.delivery_otp}</strong>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#141B20]">—</span>
                        )}
                      </td>

                      {/* 6. Dual Live Tracking */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-center">
                        {isBooked && !isCancelled ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={order.pickup_tracking_url || `https://borzodelivery.com/in/track/${order.delivery_job_id.toString().replace(/^BRZ-/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[white] hover:bg-[white] text-[#A97E16] font-bold px-2 py-1 rounded-lg text-[9px] flex items-center gap-0.5 transition-colors"
                              title="Track courier riding to restaurant (Pickup)"
                            >
                              <span>🏬 Pickup</span>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </a>
                            <a
                              href={order.delivery_tracking_url || `https://borzodelivery.com/in/track/${order.delivery_job_id.toString().replace(/^BRZ-/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[white] hover:bg-[white] text-[#A97E16] font-bold px-2 py-1 rounded-lg text-[9px] flex items-center gap-0.5 transition-colors"
                              title="Track courier riding to customer (Drop)"
                            >
                              <span>🏠 Drop</span>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#141B20]">—</span>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-right">
                        {isCancelled ? (
                          <span className="text-[10px] text-[#A97E16] font-bold bg-[white] border border-[#A97E16] px-2 py-1 rounded-lg">
                            Cancelled
                          </span>
                        ) : !isBooked ? (
                          <button
                            onClick={() => handleRequestBorzoRider(order)}
                            disabled={bookingLoading[orderId]}
                            className="bg-[#141B20] hover:bg-[#141B20] disabled:opacity-50 text-[white] font-black px-3.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer transition-all shadow-2xs"
                          >
                            {bookingLoading[orderId] ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Booking...</span>
                              </>
                            ) : (
                              <>
                                <Bike className="w-3 h-3" />
                                <span>Book Delivery</span>
                              </>
                            )}
                          </button>
                        ) : !isDelivered ? (
                          <button
                            onClick={() => handleCancelBorzoRider(order)}
                            disabled={bookingLoading[orderId]}
                            className="text-[10px] text-[#A97E16] hover:text-[#A97E16] bg-[white] hover:bg-[white] border border-[#A97E16] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#A97E16] font-bold">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {filteredOrders.length > pageSize && (
          <div className="p-4 border-t border-[#141B20] flex items-center justify-between">
            <span className="text-xs text-[#141B20]">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
