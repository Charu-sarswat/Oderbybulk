import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { Clock, Play, CheckCircle2, ChevronRight, XCircle, Volume2, AlertCircle, Search, Bike, Copy, ExternalLink, Phone, ShieldCheck, UserCheck, X, Loader2 } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import PageHeader from '../components/PageHeader';
import { restaurantData } from '../../config/restaurantData';

export default function LiveOrders() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeState, setTimeState] = useState(Date.now());
  const [expandedItems, setExpandedItems] = useState({});
  const [completedItems, setCompletedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [expandedAddresses, setExpandedAddresses] = useState({});

  // Borzo API Dispatch State
  const [bookingRiderOrderIds, setBookingRiderOrderIds] = useState({});

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const unhandledOrders = orders.filter(o => o.status === 'received');
  const hasUnhandledOrders = unhandledOrders.length > 0;

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok && Array.isArray(data)) {
          // Show all active kitchen orders that need action
          const active = data.filter(order => 
            order.status !== 'served' && order.status !== 'delivered' && order.status !== 'cancelled'
          );
          setOrders(active);
        } else {
          setOrders([]);
          addToast(data?.message || 'Failed to fetch orders.', 'error');
        }
      } catch (err) {
        console.error(err);
        addToast('Failed to fetch orders.', 'error');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveOrders();

    // Setup live timers
    const timerInterval = setInterval(() => {
      setTimeState(Date.now());
    }, 30000); // refresh every 30s

    return () => clearInterval(timerInterval);
  }, [token, apiUrl, addToast]);

  const notifiedOrdersRef = useRef(new Set());

  useEffect(() => {
    if (socket) {
      // 1. Listen for new orders
      const handleOrderCreated = (newOrder) => {
        const orderId = newOrder.order_number || newOrder.id || newOrder._id;
        
        // Strictly prevent duplicate toast notifications
        if (orderId && !notifiedOrdersRef.current.has(orderId)) {
          notifiedOrdersRef.current.add(orderId);
          addToast(`New order #${newOrder.order_number || orderId} placed!`, 'warning');
          
          // Clear cache entry after 60s
          setTimeout(() => {
            notifiedOrdersRef.current.delete(orderId);
          }, 60000);
        }

        setOrders((prevOrders) => {
          // Prevent duplicates if already received or fetched
          const exists = prevOrders.some(
            (o) => (o.order_number && o.order_number === newOrder.order_number) || (o.id && (o.id === newOrder.id || o.id === newOrder._id)) || (o._id && o._id === newOrder._id)
          );
          if (exists) {
            return prevOrders;
          }

          const formatted = {
            id: orderId,
            _id: newOrder._id || newOrder.id,
            order_number: newOrder.order_number || orderId,
            table_id: newOrder.table_id,
            table_number: newOrder.table_number || newOrder.table_snapshot || 'Takeaway',
            customer_name: newOrder.customer_name || 'Guest',
            customer_phone: newOrder.customer_phone || '',
            order_channel: newOrder.order_channel || 'dine_in',
            service_type: newOrder.service_type || 'FOOD',
            scheduled_time: newOrder.scheduled_time,
            total_amount: newOrder.total_amount,
            status: newOrder.status || 'received',
            payment_status: newOrder.payment_status || 'pending',
            payment_method: newOrder.payment_method || 'upi',
            notes: newOrder.notes || '',
            created_at: newOrder.created_at || new Date().toISOString(),
            items: newOrder.items || [],
            delivery_address: newOrder.delivery_address || '',
            delivery_job_id: newOrder.delivery_job_id,
            delivery_status: newOrder.delivery_status,
            delivery_rider_name: newOrder.delivery_rider_name,
            delivery_rider_phone: newOrder.delivery_rider_phone,
            delivery_otp: newOrder.delivery_otp,
            delivery_tracking_url: newOrder.delivery_tracking_url
          };

          return [formatted, ...prevOrders];
        });
      };

      // 2. Sync order status updates from server/other staff
      const handleOrderStatusChange = (updatedOrder) => {
        setOrders((prevOrders) => {
          const updateId = updatedOrder.order_number || updatedOrder.id || updatedOrder._id;

          // If status is changed to served, delivered, or cancelled, remove from kitchen view
          if (updatedOrder.status === 'served' || updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled') {
            return prevOrders.filter(
              (order) => order.order_number !== updateId && order.id !== updateId && order._id !== updateId
            );
          }
          
          const exists = prevOrders.some(
            (order) => (order.order_number && order.order_number === updateId) || order.id === updateId || order._id === updateId
          );

          if (!exists) {
            // It's a new active order being synced! Add it to the list
            const formatted = {
              id: updateId,
              _id: updatedOrder._id || updateId,
              order_number: updatedOrder.order_number || updateId,
              table_number: updatedOrder.table_number || updatedOrder.table_snapshot || 'Takeaway',
              customer_name: updatedOrder.customer_name || 'Guest',
              customer_phone: updatedOrder.customer_phone || '',
              order_channel: updatedOrder.order_channel || 'dine_in',
              service_type: updatedOrder.service_type || 'FOOD',
              scheduled_time: updatedOrder.scheduled_time,
              total_amount: updatedOrder.total_amount,
              status: updatedOrder.status || 'received',
              payment_status: updatedOrder.payment_status || 'pending',
              payment_method: updatedOrder.payment_method || 'upi',
              notes: updatedOrder.notes || '',
              created_at: updatedOrder.created_at || new Date().toISOString(),
              items: updatedOrder.items || [],
              delivery_address: updatedOrder.delivery_address || '',
              delivery_job_id: updatedOrder.delivery_job_id,
              delivery_status: updatedOrder.delivery_status,
              delivery_rider_name: updatedOrder.delivery_rider_name,
              delivery_rider_phone: updatedOrder.delivery_rider_phone,
              delivery_otp: updatedOrder.delivery_otp,
              delivery_tracking_url: updatedOrder.delivery_tracking_url
            };
            return [formatted, ...prevOrders];
          }

          // Otherwise, update properties
          return prevOrders.map((order) => {
            const isMatch = (order.order_number && order.order_number === updateId) || order.id === updateId || order._id === updateId;
            if (!isMatch) return order;

            return { 
              ...order, 
              status: updatedOrder.status || order.status, 
              payment_status: updatedOrder.payment_status || order.payment_status,
              payment_method: updatedOrder.payment_method || order.payment_method,
              notes: updatedOrder.notes !== undefined ? updatedOrder.notes : order.notes,
              items: updatedOrder.items && updatedOrder.items.length > 0 ? updatedOrder.items : order.items,
              delivery_job_id: updatedOrder.delivery_job_id || order.delivery_job_id,
              delivery_status: updatedOrder.delivery_status || order.delivery_status,
              delivery_rider_name: updatedOrder.delivery_rider_name || order.delivery_rider_name,
              delivery_rider_phone: updatedOrder.delivery_rider_phone || order.delivery_rider_phone,
              delivery_otp: updatedOrder.delivery_otp || order.delivery_otp,
              delivery_tracking_url: updatedOrder.delivery_tracking_url || order.delivery_tracking_url
            };
          });
        });
      };

      socket.on('order_created', handleOrderCreated);
      socket.on('order_list_update', handleOrderStatusChange);
      socket.on('order_status_change', handleOrderStatusChange);

      return () => {
        socket.off('order_created', handleOrderCreated);
        socket.off('order_list_update', handleOrderStatusChange);
        socket.off('order_status_change', handleOrderStatusChange);
      };
    }
  }, [socket, addToast]);

  // Interval for updating elapsed time counters
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedOrder = await response.json();

      // Update local state instantly
      setOrders((prevOrders) => {
        if (nextStatus === 'served' || nextStatus === 'cancelled') {
          return prevOrders.filter(order => (order.id !== orderId && order.order_number !== orderId && order._id !== orderId));
        }
        return prevOrders.map(order => 
          (order.id === orderId || order.order_number === orderId || order._id === orderId)
            ? { 
                ...order, 
                status: nextStatus, 
                updated_at: updatedOrder.updated_at,
                delivery_job_id: updatedOrder.delivery_job_id !== undefined ? updatedOrder.delivery_job_id : order.delivery_job_id,
                delivery_status: updatedOrder.delivery_status !== undefined ? updatedOrder.delivery_status : order.delivery_status,
                delivery_rider_name: updatedOrder.delivery_rider_name !== undefined ? updatedOrder.delivery_rider_name : order.delivery_rider_name,
                delivery_rider_phone: updatedOrder.delivery_rider_phone !== undefined ? updatedOrder.delivery_rider_phone : order.delivery_rider_phone,
                delivery_otp: updatedOrder.delivery_otp !== undefined ? updatedOrder.delivery_otp : order.delivery_otp,
                delivery_tracking_url: updatedOrder.delivery_tracking_url !== undefined ? updatedOrder.delivery_tracking_url : order.delivery_tracking_url
              } 
            : order
        );
      });

      addToast(`Order #${orderId} marked as ${nextStatus}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Error updating order state.', 'error');
    }
  };

  const handleRequestBorzoRider = async (order) => {
    const orderId = order.id || order.order_number || order._id;
    setBookingRiderOrderIds(prev => ({ ...prev, [orderId]: true }));
    addToast(`🛵 Requesting Borzo bike rider for #${order.order_number || orderId}...`, 'info');
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/book-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Borzo rider booking failed');
      }

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
            delivery_otp: data.order?.delivery_otp || o.delivery_otp
          };
        }
        return o;
      }));

      addToast(`✅ Borzo Rider Requested: ${data.order?.delivery_rider_name || 'Bike Rider'}!`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setBookingRiderOrderIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleCancelBorzoRider = async (order) => {
    const orderId = order.id || order.order_number || order._id;
    if (!window.confirm(`Are you sure you want to cancel the Borzo delivery booking for order #${order.order_number || orderId}?`)) {
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/cancel-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to cancel Borzo rider');

      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.order_number === orderId || o._id === orderId) {
          return {
            ...o,
            delivery_job_id: null,
            delivery_status: null,
            delivery_rider_name: null,
            delivery_rider_phone: null,
            delivery_tracking_url: null
          };
        }
        return o;
      }));

      addToast(`Borzo delivery for #${order.order_number || orderId} cancelled.`, 'info');
    } catch (err) {
      console.error(err);
      addToast(err.message, 'error');
    }
  };

  const calculateMinutesAgo = (createdAtString) => {
    let elapsedMs = timeState - new Date(createdAtString).getTime();
    const diffMins = Math.floor(elapsedMs / 60000);
    
    // Auto-normalize timezone offset differences (e.g. server in UTC, client in IST with 330 mins offset)
    if (diffMins > 310 && diffMins < 350) {
      elapsedMs -= 330 * 60 * 1000;
    }
    
    const elapsedMins = Math.floor(elapsedMs / 60000);
    return elapsedMins <= 0 ? 'Just now' : `${elapsedMins}m ago`;
  };

  if (loading) {
    return <SkeletonLoader type="list" />;
  }

  const filteredOrders = orders.filter(order => {
    const tableNum = order.table_number || '';
    const customer = order.customer_name || '';
    const query = searchQuery.toLowerCase();
    const matchesQuery = order.id.toString().includes(query) || 
                         tableNum.toLowerCase().includes(query) ||
                         customer.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || order.order_channel === channelFilter;
    const matchesService = serviceFilter === 'ALL' || (order.service_type || 'FOOD') === serviceFilter;
    return matchesQuery && matchesStatus && matchesChannel && matchesService;
  });

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Top Controls */}
      <PageHeader
        title="Kitchen Screen"
        description="Live updates of incoming kitchen orders."
        icon={Clock}
      />

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#F15A25] flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Active Tickets</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{orders.length}</div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Play className="w-5 h-5 fill-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">In Preparation</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">
              {orders.filter(o => o.status === 'preparing').length}
            </div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#F15A25] flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Ready to Serve</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">
              {orders.filter(o => o.status === 'ready').length}
            </div>
          </div>
        </div>
      </div>

      {/* Single Unified Edge-to-Edge Table Panel Card Container */}
      <div className="bg-[white] rounded-3xl border border-[#141B20] shadow-xs overflow-hidden">
        {/* Control Bar Header with Padding */}
        <div className="p-4 sm:p-5 border-b border-[#141B20]">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#141B20] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active kitchen tickets by ticket #, table, or customer..."
                className="w-full bg-[white]/30 border border-[#141B20] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#141B20] placeholder-gray-400 focus:outline-none focus:border-[white] focus:ring-1 focus:ring-[white]/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs font-semibold text-[#141B20] focus:outline-none focus:border-[white] w-full md:w-auto cursor-pointer"
            >
              <option value="ALL">All Active Statuses</option>
              <option value="hold">On Hold</option>
              <option value="received">Received / New</option>
              <option value="preparing">In Preparation</option>
              <option value="ready">Ready to Serve</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs font-semibold text-[#141B20] focus:outline-none focus:border-[white] w-full md:w-auto cursor-pointer"
            >
              <option value="ALL">All Order Types</option>
              <option value="dine_in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Home Delivery</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs font-semibold text-[#141B20] focus:outline-none focus:border-[white] w-full md:w-auto cursor-pointer"
            >
              <option value="ALL">All Services</option>
              <option value="FOOD">Food</option>
              <option value="INSTAMART">InstaMart</option>
              <option value="DINE_IN">Dine-in</option>
              <option value="MESS_TIFFIN">Mess & Tiffin</option>
              <option value="CATERING">Catering</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 border border-[#141B20] rounded-2xl p-8 max-w-lg mx-auto my-6">
            <CheckCircle2 className="w-16 h-16 text-[#F15A25] mx-auto mb-4" />
            <h3 className="font-serif font-bold text-xl text-[#141B20] mb-1">Kitchen Queue Clear</h3>
            <p className="text-sm text-[#141B20]">No active customer tickets matching current filters.</p>
          </div>
        ) : (
          /* Orders Tabular Kitchen View */
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-[white] border-b border-[#141B20] text-[10px] font-black uppercase text-[#141B20] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6 w-48">Order Ticket</th>
                  <th className="py-3.5 px-4 sm:px-6 w-48">Seating / Mode</th>
                  <th className="py-3.5 px-4 sm:px-6 w-40">Wait Time</th>
                  <th className="py-3.5 px-4 sm:px-6 min-w-[360px]">Dishes Checklist</th>
                  <th className="py-3.5 px-4 sm:px-6 w-56">Kitchen Notes</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141B20] text-xs text-[#141B20] font-semibold">
                {filteredOrders.map((order) => {
                  const minutesElapsed = Math.floor((timeState - new Date(order.created_at).getTime()) / 60000);
                  const isDelayed = minutesElapsed > 15;

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-[white] transition-colors ${
                        order.status === 'hold' ? 'bg-orange-50/40 border-l-4 border-orange-400' : isDelayed ? 'bg-[white]' : ''
                      }`}
                    >
                      {/* Ticket ID */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-bold text-[#141B20] block whitespace-nowrap">#{order.order_number || order.id} [{order.service_type || 'FOOD'}]</span>
                        {order.status === 'hold' && (
                          <span className="bg-orange-100 text-orange-800 text-[8px] font-black px-1.5 py-0.5 rounded mt-1 inline-block uppercase border border-orange-200 block w-max animate-pulse">
                            ⏸️ On Hold
                          </span>
                        )}
                        {order.scheduled_time && (
                          <span className="bg-[white] text-[#F15A25] text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase border border-[#F15A25] block w-max">
                            📅 {new Date(order.scheduled_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                        {isDelayed && order.status !== 'hold' && (
                          <span className="bg-[white] text-[#F15A25] text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase border border-[#F15A25] block w-max">
                            Urgent / Delay
                          </span>
                        )}
                      </td>

                      {/* Seating Table & Details */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-bold text-[#141B20] block">
                          {order.order_channel === 'dine_in' ? '🍽️ Dine-In' : order.order_channel === 'delivery' ? '🚗 Delivery' : '🛍️ Takeaway'}
                        </span>
                        {order.delivery_address && (
                          <div className="mt-1.5">
                            {expandedAddresses[order.id] ? (
                              <div className="text-[10px] text-[#141B20] bg-[white] border border-[#F15A25] rounded p-1.5 font-semibold max-w-[200px] break-words relative">
                                <span>📍 {order.delivery_address}</span>
                                <button
                                  onClick={() => setExpandedAddresses(prev => ({ ...prev, [order.id]: false }))}
                                  className="text-[8px] text-[#141B20] block mt-1 hover:underline text-left cursor-pointer font-bold"
                                >
                                  Hide Address
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setExpandedAddresses(prev => ({ ...prev, [order.id]: true }))}
                                className="text-[9px] text-[#141B20] bg-[white] border border-[#F15A25] hover:bg-[white] rounded px-1.5 py-0.5 font-semibold cursor-pointer flex items-center gap-1 transition-all"
                                title="Click to show address"
                              >
                                <span>📍 Show Address</span>
                              </button>
                            )}
                          </div>
                        )}
                        {/* Customer Info */}
                        <span className="text-[10px] text-[#141B20] block mt-1 font-semibold">
                          👤 {order.customer_name || 'Guest'}
                          {order.customer_phone && <span className="text-[#141B20] block font-normal">{order.customer_phone}</span>}
                        </span>
                        {/* Payment Info */}
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-1.5 border ${
                          order.payment_status === 'paid' 
                            ? 'bg-[white] text-[#F15A25] border-[#F15A25]' 
                            : 'bg-[white] text-[#F15A25] border-[#F15A25]'
                        }`}>
                          💳 {order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'card' ? 'Card' : order.payment_method === 'cod' ? 'COD' : 'UPI'} ({order.payment_status})
                        </span>
                      </td>

                      {/* Wait Time */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-semibold block text-[#141B20] whitespace-nowrap">
                          {calculateMinutesAgo(order.created_at)}
                        </span>
                        <span className="text-[10px] text-[#141B20] block mt-0.5 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </span>
                      </td>

                      {/* Dishes Horizontal Chips */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-lg">
                          {order.items?.map((item, index) => {
                            const itemKey = `${order.id}-${index}`;
                            const isDone = completedItems[itemKey];

                            return (
                              <div key={index} className="flex flex-col items-start gap-0.5">
                                <button
                                  onClick={() => setCompletedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                                    isDone 
                                      ? 'bg-[white] text-[#F15A25] border-[#F15A25] line-through opacity-55' 
                                      : 'bg-neutral-50 hover:bg-neutral-100 text-[#141B20] border-[#141B20] shadow-sm'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-[white]' : 'bg-[white]'}`} />
                                  <span>{item.quantity}x {item.name}</span>
                                  {item.selected_variant && (
                                    <span className="text-[#141B20] font-normal">({item.selected_variant.name})</span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-[#141B20] font-normal">
                        {order.notes ? (
                          <div className="bg-[white] border border-[#F15A25] p-2 rounded-xl text-[#F15A25] text-[11px]">
                            📝 {order.notes}
                          </div>
                        ) : (
                          <span className="text-[#141B20]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          {/* Row 1: Primary Action Button + Cancel Button on Right */}
                          <div className="flex items-center gap-1.5">
                            {order.status === 'hold' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-sm shrink-0"
                              >
                                Release & Prepare
                              </button>
                            )}

                            {order.status === 'received' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                className="bg-[#141B20] hover:bg-[#141B20]/90 text-[white] font-black py-1.5 px-3.5 rounded-xl text-xs transition-colors cursor-pointer shadow-sm shrink-0"
                              >
                                Start Preparing
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                className="bg-[#F15A25] hover:brightness-110 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition-colors cursor-pointer shadow-sm shrink-0 border-0"
                              >
                                Mark Ready
                              </button>
                            )}

                            {order.status === 'ready' && (
                              order.order_channel === 'delivery' ? (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                  className="bg-[#F15A25] hover:brightness-110 text-white font-black py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-sm uppercase tracking-wider shrink-0 flex items-center gap-1 border-0"
                                >
                                  <Bike className="w-3.5 h-3.5" />
                                  <span>Out For Delivery</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'served')}
                                  className="bg-[#F15A25] hover:brightness-110 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-sm uppercase tracking-wider shrink-0 border-0"
                                >
                                  Complete / Served
                                </button>
                              )
                            )}

                            {order.status === 'out_for_delivery' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="bg-[#F15A25] hover:brightness-110 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-sm uppercase tracking-wider shrink-0 border-0"
                              >
                                Mark Delivered
                              </button>
                            )}

                            {/* Cancel Button - available before food is out for delivery */}
                            {order.status !== 'out_for_delivery' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Cancel order #${order.id}?`)) {
                                    updateOrderStatus(order.id, 'cancelled');
                                  }
                                }}
                                className="bg-[white] hover:bg-[white] text-[#141B20] hover:text-[#F15A25] border border-[#141B20] hover:border-[#F15A25] p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Cancel Order"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Row 2: Delivery Link Button (Below Row 1) */}
                          {order.order_channel === 'delivery' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Link
                              to={`/admin/deliveries?order=${order.order_number || order.id}`}
                              className={`w-full max-w-[150px] py-1 px-2.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1 ${
                                order.delivery_job_id
                                  ? 'bg-[white] hover:bg-[white] text-[#F15A25] border border-[#F15A25]'
                                  : 'bg-[#141B20] hover:bg-[#141B20] text-[white]'
                              }`}
                              title="Open Delivery Management Page"
                            >
                              <Bike className="w-3 h-3" />
                              <span>{order.delivery_job_id ? 'Delivery Active ➔' : 'Book Delivery ➔'}</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
