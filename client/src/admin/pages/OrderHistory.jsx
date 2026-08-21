import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { restaurantConfig } from '../../config/restaurant';
import { exportToCSV } from '../../utils/csvExporter';
import { 
  FileText, Search, Eye, Printer, X, Plus, Edit,
  Utensils, User, CreditCard, ShoppingBag, CheckCircle2, 
  AlertTriangle, Filter, Send, Download, IndianRupee, TrendingUp, Calendar
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';


export default function OrderHistory() {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const { socket } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | received | preparing | ready | served | cancelled
  const [payFilter, setPayFilter] = useState('ALL'); // ALL | paid | pending
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // KPI Date Range Filter State
  const [kpiPeriod, setKpiPeriod] = useState('all'); // 'today' | 'yesterday' | '7days' | '30days' | 'all' | 'custom'
  const [kpiStartDate, setKpiStartDate] = useState('');
  const [kpiEndDate, setKpiEndDate] = useState('');

  // Admin Create Order Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // States for Editing Order Items
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editItemsList, setEditItemsList] = useState([]);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // Create Order Form State
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customTableNumber, setCustomTableNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('counter');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Custom states for order channel, delivery address & scheduling
  const [orderChannel, setOrderChannel] = useState('dine_in');
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderTimeType, setOrderTimeType] = useState('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (orderChannel === 'delivery') {
      if (paymentMethod !== 'online' && paymentMethod !== 'cod') {
        setPaymentMethod('online');
      }
    } else {
      if (paymentMethod === 'cod') {
        setPaymentMethod('counter');
      }
    }
  }, [orderChannel, paymentMethod]);

  // Cart for new order
  const [cart, setCart] = useState([]); // [{ item_id, name, price, quantity, notes, stock_quantity }]
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCatFilter, setMenuCatFilter] = useState('ALL');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      addToast('Error loading orders.', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreateOrderDependencies = async () => {
    try {
      // Fetch Tables
      const tRes = await fetch(`${apiUrl}/api/tables`);
      const tData = await tRes.json();
      if (tRes.ok) setTables(tData);

      // Fetch Categories
      const cRes = await fetch(`${apiUrl}/api/menu/categories`);
      const cData = await cRes.json();
      if (cRes.ok) setCategories(cData);

      // Fetch Menu Items
      const mRes = await fetch(`${apiUrl}/api/menu/items`);
      const mData = await mRes.json();
      if (mRes.ok) setMenuItems(mData);

      // Fetch Customers
      const custRes = await fetch(`${apiUrl}/api/orders/reports/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const custData = await custRes.json();
      if (custRes.ok && custData.registered) setCustomers(custData.registered);

      // Fetch Delivery Setting
      const setRes = await fetch(`${apiUrl}/api/settings`);
      const setData = await setRes.json();
      if (setRes.ok && setData.is_delivery_enabled !== undefined) {
        setIsDeliveryEnabled(Boolean(setData.is_delivery_enabled));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  // Real-time synchronization via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder) => {
      setOrders(prev => {
        const orderId = newOrder.order_number || newOrder.id || newOrder._id;
        const exists = prev.some(o => (o.order_number && o.order_number === orderId) || o.id === orderId || o._id === orderId);
        if (exists) return prev;
        
        const formatted = {
          id: orderId,
          _id: newOrder._id || orderId,
          order_number: newOrder.order_number || orderId,
          table_number: newOrder.table_number || newOrder.table_snapshot || 'Takeaway',
          table_snapshot: newOrder.table_snapshot || newOrder.table_number || 'Takeaway',
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
        return [formatted, ...prev];
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      const updateId = updatedOrder.order_number || updatedOrder.id || updatedOrder._id;
      setOrders(prev => prev.map(order => {
        const isMatch = (order.order_number && order.order_number === updateId) || order.id === updateId || order._id === updateId;
        if (!isMatch) return order;
        return {
          ...order,
          ...updatedOrder,
          status: updatedOrder.status || order.status,
          payment_status: updatedOrder.payment_status !== undefined ? updatedOrder.payment_status : order.payment_status,
          payment_method: updatedOrder.payment_method || order.payment_method,
          total_amount: updatedOrder.total_amount !== undefined ? updatedOrder.total_amount : order.total_amount,
          items: updatedOrder.items && updatedOrder.items.length > 0 ? updatedOrder.items : order.items
        };
      }));

      setSelectedOrder(prev => {
        if (!prev) return prev;
        const isMatch = (prev.order_number && prev.order_number === updateId) || prev.id === updateId || prev._id === updateId;
        if (!isMatch) return prev;
        return {
          ...prev,
          ...updatedOrder,
          status: updatedOrder.status || prev.status,
          payment_status: updatedOrder.payment_status !== undefined ? updatedOrder.payment_status : prev.payment_status,
          payment_method: updatedOrder.payment_method || prev.payment_method,
          total_amount: updatedOrder.total_amount !== undefined ? updatedOrder.total_amount : prev.total_amount,
          items: updatedOrder.items && updatedOrder.items.length > 0 ? updatedOrder.items : prev.items
        };
      });
    };

    socket.on('order_created', handleOrderCreated);
    socket.on('order_status_change', handleOrderUpdated);
    socket.on('order_status_updated', handleOrderUpdated);
    socket.on('order_list_update', handleOrderUpdated);

    return () => {
      socket.off('order_created', handleOrderCreated);
      socket.off('order_status_change', handleOrderUpdated);
      socket.off('order_status_updated', handleOrderUpdated);
      socket.off('order_list_update', handleOrderUpdated);
    };
  }, [socket]);

  const handleOpenCreateModal = () => {
    fetchCreateOrderDependencies();
    setEditingOrderId(null);
    setCart([]);
    setSelectedTableId('');
    setCustomTableNumber('');
    setSelectedCustomerId('');
    setGuestName('');
    setGuestPhone('');
    setPaymentMethod('counter');
    setPaymentStatus('paid');
    setOrderNotes('');
    setOrderChannel('dine_in');
    setDeliveryAddress('');
    setOrderTimeType('now');
    setScheduledDate('');
    setScheduledTime('');
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (order) => {
    fetchCreateOrderDependencies();
    setEditingOrderId(order.id);
    setCart(order.items.map(item => ({
      item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ''
    })));
    setSelectedTableId(order.table_id || '');
    setCustomTableNumber(order.table_snapshot || '');
    setSelectedCustomerId(order.customer_id || '');
    setGuestName(order.customer_name || '');
    setGuestPhone(order.customer_phone || '');
    setPaymentMethod(order.payment_method || 'counter');
    setPaymentStatus(order.payment_status || 'paid');
    setOrderNotes(order.notes || '');
    setOrderChannel(order.order_channel || 'dine_in');
    setDeliveryAddress(order.delivery_address || '');
    if (order.scheduled_time) {
      setOrderTimeType('scheduled');
      const d = new Date(order.scheduled_time);
      const dateStr = d.toISOString().split('T')[0];
      const timeStr = d.toTimeString().split(' ')[0].substring(0, 5);
      setScheduledDate(dateStr);
      setScheduledTime(timeStr);
    } else {
      setOrderTimeType('now');
      setScheduledDate('');
      setScheduledTime('');
    }
    setCreateModalOpen(true);
  };

  // Cart operations
  const handleAddToCart = (item) => {
    const existing = cart.find(c => c.item_id === item.id);
    if (existing) {
      if (existing.quantity >= (item.stock_quantity || 99)) {
        addToast(`Cannot add more. Max stock available is ${item.stock_quantity}`, 'warning');
        return;
      }
      setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if ((item.stock_quantity || 0) <= 0) {
        addToast(`Item "${item.name}" is currently out of stock`, 'warning');
        return;
      }
      setCart([...cart, {
        item_id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: 1,
        notes: '',
        stock_quantity: item.stock_quantity || 50
      }]);
    }
  };

  const handleUpdateCartQty = (itemId, delta) => {
    setCart(cart.map(c => {
      if (c.item_id === itemId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const handleUpdateItemNotes = (itemId, notes) => {
    setCart(cart.map(c => c.item_id === itemId ? { ...c, notes } : c));
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCreateOrderSubmit = async (e, customStatus = 'received') => {
    if (e) e.preventDefault();

    if (editingOrderId) {
      if (cart.length === 0) {
        addToast('Order must contain at least one dish.', 'warning');
        return;
      }
      try {
        const payload = {
          items: cart.map(c => ({
            menu_item_id: c.item_id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            notes: c.notes || null
          })),
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes: orderNotes,
          customer_name: guestName || undefined,
          customer_phone: guestPhone || undefined,
          delivery_address: deliveryAddress || undefined
        };
        if (customStatus && customStatus !== 'received') {
          payload.status = customStatus;
        }

        const res = await fetch(`${apiUrl}/api/orders/${editingOrderId}/items`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          addToast(customStatus === 'served' ? `Order #${editingOrderId} marked as Completed!` : `Order #${editingOrderId} updated successfully!`, 'success');
          setCreateModalOpen(false);
          setEditingOrderId(null);
          fetchOrders();
        } else {
          addToast(data.message || 'Failed to update order', 'error');
        }
      } catch (err) {
        console.error(err);
        addToast('Error saving order updates.', 'error');
      }
      return;
    }

    if (cart.length === 0) {
      addToast('Please add at least one dish to the order.', 'warning');
      return;
    }

    let customerName = guestName;
    let customerPhone = guestPhone;

    if (selectedCustomerId) {
      const found = customers.find(c => c.id === selectedCustomerId);
      if (found) {
        customerName = found.name;
        customerPhone = found.phone;
      }
    }

    if (orderChannel !== 'dine_in') {
      if (!customerName || !customerName.trim()) {
        addToast('Customer Name is compulsory', 'warning');
        return;
      }

      if (!customerPhone || customerPhone.trim().length < 10) {
        addToast('Customer Phone Number is compulsory and must be at least 10 digits', 'warning');
        return;
      }
    } else {
      if (customerPhone && customerPhone.trim().length > 0 && customerPhone.trim().length < 10) {
        addToast('Customer Phone Number must be at least 10 digits if provided', 'warning');
        return;
      }
    }

    if (orderChannel === 'delivery' && !deliveryAddress.trim()) {
      addToast('Please enter delivery address', 'warning');
      return;
    }

    if (orderTimeType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      addToast('Please pick a valid Date and Time for scheduled order', 'warning');
      return;
    }

    const payload = {
      admin_created: true,
      table_id: null,
      table_number_override: orderChannel === 'dine_in' ? 'Dine-In' : orderChannel === 'delivery' ? 'Delivery' : 'Takeaway',
      customer_id: selectedCustomerId || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      notes: orderNotes || null,
      order_channel: orderChannel,
      delivery_address: orderChannel === 'delivery' ? deliveryAddress.trim() : '',
      scheduled_time: orderTimeType === 'scheduled' && scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00` : null,
      status: customStatus,
      items: cart.map(c => ({
        menu_item_id: c.item_id,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
        notes: c.notes || null
      }))
    };

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        addToast(`Order #${data.id} created successfully!`, 'success');
        setCreateModalOpen(false);
        fetchOrders();
      } else {
        addToast(data.message || 'Failed to create order', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error placing order.', 'error');
    }
  };

  const handleStartEditItems = () => {
    setEditItemsList(selectedOrder.items.map(item => ({
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ''
    })));
    setIsEditingItems(true);
  };

  const handleUpdateEditItemQty = (menuItemId, change) => {
    setEditItemsList(prev => prev.map(item => {
      if (item.menu_item_id === menuItemId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleUpdateEditItemNotes = (menuItemId, notes) => {
    setEditItemsList(prev => prev.map(item => {
      if (item.menu_item_id === menuItemId) {
        return { ...item, notes };
      }
      return item;
    }));
  };

  const handleRemoveEditItem = (menuItemId) => {
    setEditItemsList(prev => prev.filter(item => item.menu_item_id !== menuItemId));
  };

  const handleAddDishToEditList = (dish) => {
    const existing = editItemsList.find(i => i.menu_item_id === dish.id);
    if (existing) {
      setEditItemsList(editItemsList.map(i => i.menu_item_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setEditItemsList([...editItemsList, {
        menu_item_id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        notes: ''
      }]);
    }
    setEditSearchQuery('');
  };

  const handleSaveEditedItems = async () => {
    if (editItemsList.length === 0) {
      addToast('Order must contain at least one item', 'warning');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/orders/${selectedOrder.id}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: editItemsList })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Order items updated successfully!', 'success');
        setIsEditingItems(false);
        setSelectedOrder(prev => ({
          ...prev,
          items: data.order.items,
          total_amount: data.order.total_amount
        }));
        fetchOrders();
      } else {
        addToast(data.message || 'Failed to update order items', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error saving order updates.', 'error');
    }
  };

  const handleUpdateOrderField = async (orderId, fields) => {
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fields)
      });
      const data = await response.json();
      if (response.ok) {
        addToast(data.message || 'Order updated successfully', 'success');
        setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, ...fields } : prev);
        fetchOrders();
      } else {
        addToast(data.message || 'Failed to update order', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to update order', 'error');
    }
  };


  const handlePrint = (orderToPrint = null) => {
    const order = orderToPrint || selectedOrder;
    if (!order) return;

    const subtotal = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const totalAmount = parseFloat(order.total_amount || 0);
    const deliveryFee = totalAmount > subtotal ? (totalAmount - subtotal) : 0;

    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Invoice #${order.order_number || order.id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body {
              font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
              padding: 10px;
              max-width: 320px;
              margin: 0 auto;
              color: #141B20;
              font-size: 11px;
              line-height: 1.3;
            }
            * {
              color: #141B20 !important;
              font-weight: bold !important;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .header-title { font-size: 18px; margin: 0 0 1px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 10px; margin: 0 0 1px 0; line-height: 1.2; }
            .site-link { font-size: 10px; text-decoration: underline !important; color: #141B20 !important; margin-bottom: 2px; display: inline-block; cursor: pointer !important; -webkit-user-select: text; user-select: text; }
            .divider { border-top: 2px solid #141B20; margin: 6px 0; }
            .double-divider { border-top: 2px solid #141B20; border-bottom: 2px solid #141B20; padding: 2px 0; margin: 6px 0; }
            .meta-table, .items-table, .summary-table { width: 100%; border-collapse: collapse; }
            .meta-table td { padding: 1px 0; font-size: 11px; vertical-align: top; }
            .items-table th { border-bottom: 2px solid #141B20; padding: 3px 0; font-size: 10px; }
            .items-table td { padding: 3px 0; font-size: 11px; vertical-align: top; }
            .summary-table td { padding: 2px 0; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 class="header-title">${restaurantConfig.name}</h2>
            <p class="subtitle">${restaurantConfig.gmbAddress}</p>
            <p class="subtitle">Phone: ${restaurantConfig.formattedPhone || restaurantConfig.supportPhone}</p>
            <div>
              <a href="https://bombaychowpati.com" class="site-link" target="_blank" rel="noopener noreferrer" onclick="window.open('https://bombaychowpati.com', '_blank'); return true;">https://bombaychowpati.com</a>
            </div>
            <p class="bold" style="font-size: 12px; margin: 5px 0 1px 0; letter-spacing: 1px; text-transform: uppercase; border: 1.5px solid #141B20; padding: 2px 0; display: block;">RECEIPT</p>
          </div>

          <div class="divider"></div>

          <table class="meta-table">
            <tr>
              <td class="bold" style="width: 45%; text-align: left;">Invoice No:</td>
              <td class="text-right">#${order.order_number || order.id}</td>
            </tr>
            <tr>
              <td class="bold" style="text-align: left;">Date & Time:</td>
              <td class="text-right">${new Date(order.created_at).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td class="bold" style="text-align: left;">Service Mode:</td>
              <td class="text-right" style="text-transform: uppercase;">${order.order_channel === 'dine_in' ? 'Dine-In' : order.order_channel === 'delivery' ? 'Delivery' : 'Takeaway'}</td>
            </tr>
            <tr>
              <td class="bold" style="text-align: left;">Payment Method:</td>
              <td class="text-right" style="text-transform: uppercase;">${order.payment_method}</td>
            </tr>
            ${order.customer_name ? `
            <tr>
              <td class="bold" style="text-align: left;">Customer:</td>
              <td class="text-right">${order.customer_name}</td>
            </tr>
            ` : ''}
            ${order.delivery_address ? `
            <tr>
              <td class="bold" style="text-align: left;">Address:</td>
              <td class="text-right">${order.delivery_address}</td>
            </tr>
            ` : ''}
            ${order.scheduled_time ? `
            <tr>
              <td class="bold" style="text-align: left;">Scheduled:</td>
              <td class="text-right">${new Date(order.scheduled_time).toLocaleString('en-IN')}</td>
            </tr>
            ` : ''}
          </table>

          <div class="double-divider" style="font-weight: bold; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
            Order Items
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-left" style="width: 46%;">ITEM</th>
                <th class="text-right" style="width: 16%;">QTY</th>
                <th class="text-right" style="width: 18%;">RATE</th>
                <th class="text-right" style="width: 20%;">AMT</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td class="text-left" style="padding: 3px 0;">
                    <div>${item.name?.toUpperCase()}</div>
                    ${item.notes ? `<div style="font-size: 9px; font-style: italic; color: #141B20; margin-top: 1px;">Note: ${item.notes}</div>` : ''}
                  </td>
                  <td class="text-right" style="padding: 3px 0;">${item.quantity}</td>
                  <td class="text-right" style="padding: 3px 0;">${Number(item.price).toFixed(2)}</td>
                  <td class="text-right" style="padding: 3px 0;">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <table class="summary-table">
            <tr>
              <td style="text-align: left;">Subtotal</td>
              <td class="text-right">${restaurantConfig.currency}${subtotal.toFixed(2)}</td>
            </tr>
            ${deliveryFee > 0 ? `
            <tr>
              <td style="text-align: left;">Delivery Charges</td>
              <td class="text-right">${restaurantConfig.currency}${deliveryFee.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr class="bold" style="font-size: 13px;">
              <td style="text-align: left; padding-top: 4px; border-top: 1.5px solid #141B20;">TOTAL</td>
              <td class="text-right" style="padding-top: 4px; border-top: 1.5px solid #141B20; font-size: 14px;">${restaurantConfig.currency}${totalAmount.toFixed(2)}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div class="text-center" style="margin-top: 10px; font-size: 11px;">
            <p style="margin: 0 0 2px 0;">Thank you for dining with us!</p>
            <p style="font-size: 9px; margin: 0; color: #141B20;">Please visit us again</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  const handlePrintBill = (order) => {
    handlePrint(order);
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCat = menuCatFilter === 'ALL' || item.category_id === menuCatFilter;
    return matchesSearch && matchesCat;
  });

  const handleExportSheet = () => {
    const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Phone', 'Channel', 'Table', 'Status', 'Payment Method', 'Payment Status', 'Total (₹)'];
    const rows = orders.map(o => [
      o.order_number || o.id,
      new Date(o.created_at).toLocaleString('en-IN'),
      o.customer_name || 'Guest',
      o.customer_phone || '',
      o.order_channel || 'dine_in',
      o.table_number || 'Takeaway',
      o.status,
      o.payment_method,
      o.payment_status,
      o.total_amount
    ]);
    exportToCSV('Bombay_Chowpati_Orders_Sheet', headers, rows);
  };



  // Filter orders based on chosen date range for KPIs and Table
  const dateFilteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    if (kpiPeriod === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (kpiPeriod === 'today') {
      return orders.filter(o => new Date(o.created_at) >= startOfToday);
    }

    if (kpiPeriod === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfToday);
      endOfYesterday.setMilliseconds(-1);
      return orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startOfYesterday && d <= endOfYesterday;
      });
    }

    if (kpiPeriod === '7days') {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orders.filter(o => new Date(o.created_at) >= sevenDaysAgo);
    }

    if (kpiPeriod === '30days') {
      const thirtyDaysAgo = new Date(startOfToday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
    }

    if (kpiPeriod === 'custom') {
      if (!kpiStartDate && !kpiEndDate) return orders;
      return orders.filter(o => {
        const d = new Date(o.created_at);
        if (kpiStartDate && d < new Date(`${kpiStartDate}T00:00:00`)) return false;
        if (kpiEndDate && d > new Date(`${kpiEndDate}T23:59:59`)) return false;
        return true;
      });
    }

    return orders;
  }, [orders, kpiPeriod, kpiStartDate, kpiEndDate]);

  const filteredOrders = Array.isArray(dateFilteredOrders) ? dateFilteredOrders.filter((order) => {
    const tableNum = order.table_number || '';
    const customer = order.customer_name || '';
    const searchLow = searchQuery.toLowerCase();
    const orderNum = order.order_number || '';
    
    const matchesSearch = order.id.toString().includes(searchLow) || 
                          orderNum.toLowerCase().includes(searchLow) ||
                          tableNum.toLowerCase().includes(searchLow) ||
                          customer.toLowerCase().includes(searchLow);
                          
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesPayment = payFilter === 'ALL' || order.payment_status === payFilter;
    const matchesService = serviceFilter === 'ALL' || (order.service_type || 'FOOD') === serviceFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesService;
  }) : [];

  // Reset to page 1 when search or filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, payFilter, serviceFilter, kpiPeriod, kpiStartDate, kpiEndDate]);

  if (loading) {
    return <SkeletonLoader type="list" />;
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header with Create Order Button & Export Sheet */}
      <PageHeader 
        title={user?.role === 'staff' ? "Today's Orders" : "Orders & Invoices"}
        description={user?.role === 'staff' ? "Order entries recorded today for Order By Bulk." : "Comprehensive log of all orders placed, with sheet exports and WhatsApp notifications."}
        icon={FileText}
      >
        <button
          onClick={handleExportSheet}
          className="px-4 py-2.5 bg-[white]/10 hover:bg-[white]/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-[white]" />
          <span>Export Sheet (Excel)</span>
        </button>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#141B20] hover:bg-[#141B20] text-[white] font-bold text-xs rounded-xl px-4 py-2.5 shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-[white]/30"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Order</span>
        </button>
      </PageHeader>

      {/* Date Range Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[white] p-3.5 sm:p-4 rounded-2xl border border-[#141B20] shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#141B20]" />
          <span className="text-xs font-bold text-[#141B20]">Date Range Filter:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'today', 'yesterday', '7days', '30days', 'custom'].map((period) => (
            <button
              key={period}
              onClick={() => setKpiPeriod(period)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                kpiPeriod === period
                  ? 'bg-[#141B20] text-[white] shadow-xs'
                  : 'bg-[white] text-[#141B20] hover:bg-[white]'
              }`}
            >
              {period === 'all' ? 'All Time' :
               period === 'today' ? 'Today' :
               period === 'yesterday' ? 'Yesterday' :
               period === '7days' ? 'Last 7 Days' :
               period === '30days' ? 'Last 30 Days' : 'Custom'}
            </button>
          ))}

          {kpiPeriod === 'custom' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#141B20]">
              <input
                type="date"
                value={kpiStartDate}
                onChange={(e) => setKpiStartDate(e.target.value)}
                className="text-xs p-1 border border-[#141B20] rounded-lg bg-[white] focus:outline-none"
              />
              <span className="text-xs text-[#141B20]">to</span>
              <input
                type="date"
                value={kpiEndDate}
                onChange={(e) => setKpiEndDate(e.target.value)}
                className="text-xs p-1 border border-[#141B20] rounded-lg bg-[white] focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#F15A25] flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Total Tickets</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">{dateFilteredOrders.length}</div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#F15A25] flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Served Orders</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5">
              {dateFilteredOrders.filter(o => o.status === 'served').length}
            </div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#141B20] flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Total Revenue</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5 truncate">
              ₹{dateFilteredOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(0)}
            </div>
          </div>
        </div>

        <div className="bg-[white] p-4 sm:p-5 rounded-2xl border border-[#141B20] shadow-xs flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[white] border border-[#F15A25] text-[#F15A25] flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-[#141B20] uppercase tracking-wider block leading-tight">Avg Ticket</span>
            <div className="text-lg sm:text-2xl font-black text-[#141B20] font-serif mt-0.5 truncate">
              ₹{dateFilteredOrders.length > 0 ? (dateFilteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) / dateFilteredOrders.length).toFixed(0) : '0'}
            </div>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticket #, table, or customer name..."
                className="w-full bg-[white]/30 border border-[#141B20] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#141B20] placeholder-gray-400 focus:outline-none focus:border-[white] focus:ring-1 focus:ring-[white]/30"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[white] border border-[#141B20] text-[#141B20] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[white] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="received">Received</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
                className="bg-[white] border border-[#141B20] text-[#141B20] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[white] cursor-pointer"
              >
                <option value="ALL">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="bg-[white] border border-[#141B20] text-[#141B20] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[white] cursor-pointer"
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
        </div>

        {/* Audit list edge-to-edge table */}
        {filteredOrders.length === 0 ? (
          <p className="text-[#141B20] text-xs py-16 text-center">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-[white] border-b border-[#141B20] text-[10px] font-black uppercase text-[#141B20] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6 text-center">Ticket #</th>
                  <th className="py-3.5 px-4 sm:px-6">Table / Customer</th>
                  <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Payment</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Total</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141B20] text-xs text-[#141B20] font-semibold">
                {filteredOrders
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((order) => (
                  <tr key={order.id} className="hover:bg-[white]/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!['served', 'delivered', 'cancelled'].includes(order.status)) {
                            handleOpenEditModal(order);
                          } else {
                            setSelectedOrder(order);
                          }
                        }}
                        className="font-bold text-[#141B20] hover:text-[#141B20] hover:underline cursor-pointer transition-colors inline-block"
                        title={!['served', 'delivered', 'cancelled'].includes(order.status) ? "Click to Edit / Complete Order" : "Click to View Details"}
                      >
                        #{order.order_number || order.id} [{order.service_type || 'FOOD'}]
                      </button>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                       <div className="font-semibold text-[#141B20]">
                         {order.order_channel === 'dine_in' ? '🍽️ Dine-In' : order.order_channel === 'delivery' ? '🚗 Delivery' : '🛍️ Takeaway'}
                       </div>
                      {order.delivery_address && (
                        <div className="text-[9px] text-[#141B20] bg-[white] border border-[#F15A25] rounded px-1.5 py-0.5 mt-0.5 max-w-[150px] truncate block w-max" title={order.delivery_address}>
                          📍 {order.delivery_address}
                        </div>
                      )}
                      {order.scheduled_time && (
                        <div className="text-[9px] text-[#F15A25] bg-[white] border border-[#F15A25] rounded px-1.5 py-0.5 mt-0.5 w-max">
                          📅 {new Date(order.scheduled_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                      {order.customer_name && <div className="text-[10px] text-[#141B20] font-normal mt-0.5">👤 {order.customer_name}</div>}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-xs text-[#141B20] font-light">
                      {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                         order.status === 'served' || order.status === 'delivered' ? 'bg-[white] text-[#F15A25]' : 
                         order.status === 'cancelled' ? 'bg-[white] text-[#F15A25]' : 
                         order.status === 'out_for_delivery' ? 'bg-[white] text-[#F15A25]' :
                         order.status === 'hold' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-[white] text-[#F15A25]'
                       }`}>
                         {order.status.replace(/_/g, ' ')}
                       </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        order.payment_status === 'paid' ? 'bg-[white] text-[#F15A25]' : 'bg-[white] text-[#F15A25]'
                      }`}>
                        {order.payment_status} ({order.payment_method})
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-bold text-[#141B20]">
                      {restaurantConfig.currency}{parseFloat(order.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {/* If order is active/uncompleted, opening action opens the interactive Edit Order screen directly */}
                        {!['served', 'delivered', 'cancelled'].includes(order.status) ? (
                          <button
                            onClick={() => handleOpenEditModal(order)}
                            className="p-1.5 bg-[white] text-[#141B20] hover:bg-orange-500/20 hover:text-orange-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit / Complete Order"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 bg-[white] text-[#141B20] hover:bg-[#141B20]/10 hover:text-[#141B20] rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintBill(order)}
                          className="p-1.5 bg-[white] text-[#141B20] hover:bg-gold-500/20 hover:text-gold-700 rounded-lg transition-colors cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer with Padding */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-[#141B20] bg-[white]">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredOrders.length / pageSize)}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Admin Create Order Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[white] rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col slide-up max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[#141B20] bg-[white]">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#141B20] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-gold-500" />
                  {editingOrderId ? `Edit Order #${editingOrderId}` : 'Create New Order (Admin)'}
                </h3>
                <span className="text-xs text-[#141B20]">
                  {editingOrderId ? 'Modify items, quantities, and instructions on this active ticket' : 'Place walk-in or phone order with real-time stock awareness'}
                </span>
              </div>
              <button onClick={() => { setCreateModalOpen(false); setEditingOrderId(null); }} className="p-1 text-[#141B20] hover:bg-[white] rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split into Menu Picker (Left) and Order Details/Cart (Right) */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* Left Column: Menu Catalog Picker */}
              <div className="flex-1 p-5 border-r border-[#141B20] flex flex-col overflow-hidden">
                {/* Search & Category Filter */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center bg-[white] border border-[#141B20] rounded-xl px-3 py-1.5">
                    <Search className="w-3.5 h-3.5 text-[#141B20] mr-2 shrink-0" />
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder="Search menu..."
                      className="w-full bg-transparent text-xs focus:outline-none placeholder:text-[#141B20]"
                    />
                  </div>
                  <select
                    value={menuCatFilter}
                    onChange={(e) => setMenuCatFilter(e.target.value)}
                    className="bg-[white] border border-[#141B20] rounded-xl px-2 py-1.5 text-xs font-semibold"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dish Grid */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[500px]">
                  {filteredMenuItems.length === 0 ? (
                    <p className="text-[#141B20] text-xs py-8 text-center">No menu dishes found.</p>
                  ) : (
                    filteredMenuItems.map(item => {
                      const inCart = cart.find(c => c.item_id === item.id);
                      const isUnlimited = Boolean(item.is_unlimited_stock);
                      const isOutOfStock = !isUnlimited && (item.is_available === false || (item.stock_quantity || 0) <= 0);

                      return (
                        <div key={item.id} className="p-3.5 bg-[white] hover:bg-[white] rounded-2xl border border-[#141B20] shadow-xs flex items-center justify-between transition-all gap-3 hover:border-[#F15A25]">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <img 
                              src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'} 
                              alt="" 
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#141B20] shadow-xs" 
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-sm sm:text-base text-[#141B20] truncate uppercase flex items-center gap-1.5 leading-tight">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.is_veg ? 'bg-[white]' : 'bg-[white]'}`} />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <div className="text-xs text-[#141B20] font-semibold mt-1 flex items-center gap-2">
                                <span className="text-[#141B20] font-black text-sm">{restaurantConfig.currency}{parseFloat(item.price).toFixed(2)}</span>
                                {isOutOfStock && (
                                  <>
                                    <span className="text-[#141B20]">•</span>
                                    <span className="text-[#F15A25] font-bold">Out of stock</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(item)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all shrink-0 shadow-xs active:scale-95 ${
                              isOutOfStock ? 'bg-[white] text-[#141B20] cursor-not-allowed' :
                              inCart ? 'bg-[#141B20] text-[white] border border-[white]/40 font-black' : 'bg-[white] hover:bg-black text-white'
                            }`}
                          >
                            {inCart ? `Added (${inCart.quantity})` : 'Add +'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Order Setup & Cart Summary */}
              <form onSubmit={handleCreateOrderSubmit} className="w-full lg:w-96 p-5 flex flex-col bg-[white] overflow-y-auto">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#141B20] mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-gold-600" /> Order Details
                </h4>

                {/* Order Channel Selector */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-[#141B20]">Order Channel / Dining Type</label>
                      {editingOrderId && (
                        <span className="text-[9px] font-bold text-[#F15A25] bg-[white] px-1.5 py-0.5 rounded">Fixed on edit</span>
                      )}
                    </div>
                    <select
                      disabled={Boolean(editingOrderId)}
                      value={orderChannel}
                      onChange={(e) => {
                        setOrderChannel(e.target.value);
                        if (e.target.value !== 'dine_in') {
                          setSelectedTableId('');
                        }
                      }}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${
                        editingOrderId ? 'bg-[white] border-[#141B20] text-[#141B20] cursor-not-allowed' : 'bg-[white] border-[#141B20] cursor-pointer'
                      }`}
                    >
                      <option value="dine_in">Dine-In (In Restaurant)</option>
                      <option value="takeaway">Takeaway (Self Pickup)</option>
                      {isDeliveryEnabled || editingOrderId ? (
                        <option value="delivery">Delivery (Home Delivery)</option>
                      ) : (
                        <option value="delivery" disabled>Delivery (Paused in Settings)</option>
                      )}
                    </select>
                  </div>

                  {orderChannel === 'delivery' && (
                    <div>
                      <label className="block text-[11px] font-bold text-[#141B20] mb-1">Delivery Address *</label>
                      <textarea
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter complete address for delivery..."
                        rows="2"
                        className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-1.5 text-xs focus:outline-none resize-none font-semibold placeholder:font-normal"
                      />
                    </div>
                  )}

                </div>

                {/* Scheduling Section */}
                <div className="space-y-2 mb-4 border-t border-[#141B20]/60 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#141B20]">Order Timing</label>
                    {editingOrderId && (
                      <span className="text-[9px] font-bold text-[#F15A25] bg-[white] px-1.5 py-0.5 rounded">Fixed on edit</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={Boolean(editingOrderId)}
                      onClick={() => setOrderTimeType('now')}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${
                        editingOrderId
                          ? orderTimeType === 'now'
                            ? 'border-[#141B20] bg-[white] text-[#141B20] cursor-not-allowed font-black'
                            : 'border-[#141B20] bg-[white] text-[#141B20] cursor-not-allowed opacity-60'
                          : orderTimeType === 'now'
                          ? 'border-[#141B20] bg-[#141B20]/5 text-[#141B20] cursor-pointer'
                          : 'border-[#141B20] bg-[white] text-[#141B20] hover:text-[#141B20] cursor-pointer'
                      }`}
                    >
                      Immediate
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(editingOrderId)}
                      onClick={() => setOrderTimeType('scheduled')}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${
                        editingOrderId
                          ? orderTimeType === 'scheduled'
                            ? 'border-[#141B20] bg-[white] text-[#141B20] cursor-not-allowed font-black'
                            : 'border-[#141B20] bg-[white] text-[#141B20] cursor-not-allowed opacity-60'
                          : orderTimeType === 'scheduled'
                          ? 'border-[#141B20] bg-[#141B20]/5 text-[#141B20] cursor-pointer'
                          : 'border-[#141B20] bg-[white] text-[#141B20] hover:text-[#141B20] cursor-pointer'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                  {orderTimeType === 'scheduled' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] text-[#141B20] uppercase font-bold tracking-wider block mb-1">Date *</span>
                        <input
                          type="date"
                          disabled={Boolean(editingOrderId)}
                          required
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className={`w-full text-xs p-1.5 border rounded-xl focus:outline-none ${
                            editingOrderId ? 'bg-[white] border-[#141B20] text-[#141B20] cursor-not-allowed' : 'border-[#141B20]'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[#141B20] uppercase font-bold tracking-wider block mb-1">Time *</span>
                        <input
                          type="time"
                          disabled={Boolean(editingOrderId)}
                          required
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className={`w-full text-xs p-1.5 border rounded-xl focus:outline-none ${
                            editingOrderId ? 'bg-[white] border-[#141B20] text-[#141B20] cursor-not-allowed' : 'border-[#141B20]'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Selection */}
                <div className="space-y-3 mb-4 border-t border-[#141B20]/60 pt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#141B20] mb-1">Customer Account</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">-- Guest / Walk-in Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                      ))}
                    </select>
                  </div>

                  {!selectedCustomerId && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={orderChannel === 'dine_in' ? "Guest Name (Optional)" : "Guest Name"}
                        className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                      />
                      <input
                        type="text"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder={orderChannel === 'dine_in' ? "Phone Number (Optional)" : "Phone Number"}
                        className="w-full bg-[white] border border-[#141B20] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 space-y-2 mb-4 border-t border-[#141B20]/60 pt-3">
                  <div className="text-[11px] font-bold text-[#141B20] mb-2">Selected Items ({cart.length})</div>
                  {cart.length === 0 ? (
                    <p className="text-[#141B20] text-xs py-4 text-center">No dishes added to cart yet.</p>
                  ) : (
                    cart.map(cItem => (
                      <div key={cItem.item_id} className="p-2.5 bg-[white] rounded-xl border border-[#141B20]/80 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-[#141B20]">{cItem.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(cItem.item_id, -1)}
                              className="w-5 h-5 bg-[white] hover:bg-[white] rounded flex items-center justify-center font-bold text-xs cursor-pointer text-[#141B20]"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1 text-[#141B20]">{cItem.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(cItem.item_id, 1)}
                              className="w-5 h-5 bg-[white] hover:bg-[white] rounded flex items-center justify-center font-bold text-xs cursor-pointer text-[#141B20]"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          <input
                            type="text"
                            placeholder="Add item instruction..."
                            value={cItem.notes}
                            onChange={(e) => handleUpdateItemNotes(cItem.item_id, e.target.value)}
                            className="bg-[white] border border-[#141B20] rounded px-2 py-0.5 text-[10px] flex-1 mr-2 focus:outline-none"
                          />
                          <span className="font-bold text-[#141B20]">
                            {restaurantConfig.currency}{(cItem.price * cItem.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Payment Options & Summary */}
                <div className="border-t border-[#141B20]/60 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#141B20] mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-[white] border border-[#141B20] rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer"
                      >
                        {orderChannel === 'delivery' ? (
                          <>
                            <option value="online">Online</option>
                            <option value="cod">Cash on Delivery (COD)</option>
                          </>
                        ) : (
                          <>
                            <option value="counter">Cash / Counter</option>
                            <option value="upi">UPI / QR</option>
                            <option value="card">Card</option>
                            <option value="online">Online</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#141B20] mb-1">Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="w-full bg-[white] border border-[#141B20] rounded-lg px-2 py-1 text-xs font-semibold"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-sm text-[#141B20]">Total Amount</span>
                    <span className="font-serif font-bold text-xl text-gold-600">
                      {restaurantConfig.currency}{calculateCartTotal().toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {editingOrderId ? (
                      <>
                        <button
                          type="button"
                          disabled={cart.length === 0}
                          onClick={() => handleCreateOrderSubmit(null)}
                          className={`${
                            paymentStatus === 'paid' && ['dine_in', 'takeaway'].includes(orderChannel)
                              ? 'col-span-1 bg-[white] hover:bg-black'
                              : 'col-span-2 bg-gold-500 hover:bg-gold-600'
                          } py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer disabled:bg-[white] disabled:cursor-not-allowed`}
                        >
                          Save Changes
                        </button>

                        {paymentStatus === 'paid' && ['dine_in', 'takeaway'].includes(orderChannel) && (
                          <button
                            type="button"
                            disabled={cart.length === 0}
                            onClick={() => handleCreateOrderSubmit(null, 'served')}
                            className="col-span-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer bg-[white] hover:bg-[white] disabled:bg-[white] disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Complete</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={cart.length === 0}
                          onClick={() => handleCreateOrderSubmit(null, 'hold')}
                          className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer bg-orange-600 hover:bg-orange-700 disabled:bg-[white] disabled:cursor-not-allowed`}
                        >
                          Hold Order
                        </button>
                        <button
                          type="button"
                          disabled={cart.length === 0}
                          onClick={() => handleCreateOrderSubmit(null, 'received')}
                          className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xs transition-colors cursor-pointer bg-gold-500 hover:bg-gold-600 disabled:bg-[white] disabled:cursor-not-allowed`}
                        >
                          Place & Print
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[white] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col slide-up">
            <div className="flex justify-between items-center p-5 border-b border-[#141B20]">
              <h3 className="font-serif font-bold text-xl text-[#141B20] flex items-center gap-2">
                Order #{selectedOrder.order_number || selectedOrder.id}
            </h3>
            <button onClick={() => { setSelectedOrder(null); setIsEditingItems(false); }} className="p-1 text-[#141B20] hover:bg-[white] rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-xs text-[#141B20] font-bold tracking-wider uppercase mb-1">Details</div>
                  <div className="font-semibold text-sm text-[#141B20]">
                    {selectedOrder.order_channel === 'dine_in' ? '🍽️ Dine-In' : selectedOrder.order_channel === 'delivery' ? '🚗 Delivery' : '🛍️ Takeaway'}
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="text-[11px] text-[#F15A25] bg-[white] border border-[#F15A25] rounded px-2 py-1 mt-1.5 font-medium max-w-[250px] break-words">
                      📍 Address: {selectedOrder.delivery_address}
                    </div>
                  )}
                  {selectedOrder.scheduled_time && (
                    <div className="text-[11px] text-[#F15A25] bg-[white] border border-[#F15A25] rounded px-2 py-1 mt-1.5 font-medium">
                      📅 Scheduled: {new Date(selectedOrder.scheduled_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                    </div>
                  )}
                  <div className="text-xs text-[#141B20] mt-1">{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</div>
                  {(selectedOrder.customer_name || selectedOrder.customer_phone) && (
                    <div className="mt-2 text-xs text-[#141B20] bg-[white] p-2 rounded-lg border border-[#141B20]">
                      {selectedOrder.customer_name && <div className="font-semibold">👤 {selectedOrder.customer_name}</div>}
                      {selectedOrder.customer_phone && <div className="text-[10px] text-[#141B20]">📞 {selectedOrder.customer_phone}</div>}
                    </div>
                  )}

                  {/* Borzo Delivery Partner details if applicable */}
                  {selectedOrder.order_channel === 'delivery' && selectedOrder.delivery_job_id && (
                    <div className="mt-3 text-xs border rounded-xl p-3 max-w-[280px] space-y-1.5 bg-gradient-to-br from-amber-50/70 to-emerald-50/50 border-[#F15A25] shadow-2xs">
                      <div className="font-black text-[10px] uppercase tracking-wider flex items-center justify-between text-[#141B20]">
                        <span>🛵 Borzo 2-Wheeler</span>
                        <span className="text-[8px] font-mono font-normal text-[#141B20]">Ref: {selectedOrder.delivery_job_id}</span>
                      </div>
                      
                      <div className="font-bold text-[#141B20] text-[11px]">
                        Courier: <span className="font-semibold">{selectedOrder.delivery_rider_name || 'Borzo Bike Rider'}</span>
                      </div>
                      
                      {selectedOrder.delivery_rider_phone && (
                        <div className="text-[10px] text-[#141B20] font-bold">
                          <a href={`tel:${selectedOrder.delivery_rider_phone}`} className="hover:underline flex items-center gap-1">
                            📞 {selectedOrder.delivery_rider_phone}
                          </a>
                        </div>
                      )}
                      
                      <div className="text-[9px] uppercase tracking-wider font-black text-[#F15A25] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[white] animate-pulse"></span>
                        Status: {selectedOrder.delivery_status || 'Assigned'}
                      </div>

                      {(selectedOrder.pickup_otp || selectedOrder.delivery_otp) && (
                        <div className="text-[10px] bg-[white]/95 border border-[#F15A25] rounded p-1.5 space-y-1">
                          {selectedOrder.pickup_otp && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#F15A25] font-bold">🏬 Pickup OTP (Give to Rider):</span>
                              <span className="font-mono font-black text-[#F15A25] bg-[white] px-1.5 py-0.2 rounded border border-[#F15A25]">
                                {selectedOrder.pickup_otp}
                              </span>
                            </div>
                          )}
                          {selectedOrder.delivery_otp && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#F15A25] font-bold">🏠 Drop OTP (Customer Code):</span>
                              <span className="font-mono font-black text-[#F15A25] bg-[white] px-1.5 py-0.2 rounded border border-[#F15A25]">
                                {selectedOrder.delivery_otp}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Always show Both Pickup & Drop Tracking Links for Admin */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#F15A25] text-[9px] font-bold">
                        <a
                          href={selectedOrder.pickup_tracking_url || `https://borzodelivery.com/in/track/${selectedOrder.delivery_job_id.toString().replace(/^BRZ-/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[white] hover:bg-[white] text-[#F15A25] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                          title="Always track rider arrival to restaurant (Pickup)"
                        >
                          <span>🏬 Pickup Track</span>
                          <span className="text-[8px]">↗</span>
                        </a>
                        <a
                          href={selectedOrder.delivery_tracking_url || `https://borzodelivery.com/in/track/${selectedOrder.delivery_job_id.toString().replace(/^BRZ-/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[white] hover:bg-[white] text-[#F15A25] py-1.5 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                          title="Always track rider delivering to customer (Drop)"
                        >
                          <span>🏠 Drop Track</span>
                          <span className="text-[8px]">↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right space-y-3">
                  <div>
                    <label className="block text-[10px] text-[#141B20] font-bold tracking-wider uppercase mb-1">Status</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateOrderField(selectedOrder.id, { status: e.target.value })}
                      className="bg-[white] border border-[#141B20] text-[#141B20] text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                    >
                      <option value="hold">On Hold</option>
                      <option value="received">Received</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">{selectedOrder.order_channel === 'delivery' ? 'Ready for Pickup' : selectedOrder.order_channel === 'takeaway' ? 'Ready for Takeaway' : 'Ready to Serve'}</option>

                      {/* Delivery Specific Statuses */}
                      {selectedOrder.order_channel === 'delivery' && (
                        <>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered (Completed)</option>
                        </>
                      )}

                      {/* Dine-In Specific Status */}
                      {selectedOrder.order_channel === 'dine_in' && (
                        <option value="served">Served (Completed)</option>
                      )}

                      {/* Takeaway Specific Status */}
                      {selectedOrder.order_channel === 'takeaway' && (
                        <option value="served">Picked Up (Completed)</option>
                      )}

                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#141B20] font-bold tracking-wider uppercase mb-1">Payment</label>
                    <select
                      value={selectedOrder.payment_status}
                      onChange={(e) => handleUpdateOrderField(selectedOrder.id, { payment_status: e.target.value })}
                      className="bg-[white] border border-[#141B20] text-[#141B20] text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                    <div className="text-[9px] text-[#141B20] mt-1 uppercase font-bold tracking-wider">Method: {selectedOrder.payment_method}</div>
                  </div>
                </div>
              </div>

              {isEditingItems ? (
                <div className="space-y-4">
                  <div className="text-xs text-[#141B20] font-bold tracking-wider uppercase border-b border-[#141B20] pb-2">Edit Order Items</div>
                  
                  {/* Search bar to add new items */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#141B20] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search and add a dish..."
                      value={editSearchQuery}
                      onChange={(e) => setEditSearchQuery(e.target.value)}
                      className="w-full bg-[white]/30 border border-[#141B20] rounded-xl pl-9 pr-4 py-2 text-xs text-[#141B20] placeholder-gray-400 focus:outline-none focus:border-[white]"
                    />
                    
                    {editSearchQuery.trim() && (
                      <div className="absolute left-0 right-0 z-30 mt-1 max-h-40 overflow-y-auto bg-[white] border border-[#141B20] rounded-xl shadow-lg divide-y divide-gray-50">
                        {menuItems
                          .filter(item => item.name.toLowerCase().includes(editSearchQuery.toLowerCase()))
                          .map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleAddDishToEditList(item)}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#141B20] hover:bg-[white] flex justify-between cursor-pointer"
                            >
                              <span>{item.name}</span>
                              <span className="text-gold-600">{restaurantConfig.currency}{item.price.toFixed(2)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* List of current items to edit */}
                  <div className="space-y-3.5 max-h-[30vh] overflow-y-auto pr-1">
                    {editItemsList.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[white] border border-[#141B20] rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#141B20]">{item.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateEditItemQty(item.menu_item_id, -1)}
                              className="w-5 h-5 bg-[white] hover:bg-[white] border border-[#141B20] rounded flex items-center justify-center font-bold text-xs cursor-pointer text-[#141B20]"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1 text-[#141B20]">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateEditItemQty(item.menu_item_id, 1)}
                              className="w-5 h-5 bg-[white] hover:bg-[white] border border-[#141B20] rounded flex items-center justify-center font-bold text-xs cursor-pointer text-[#141B20]"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditItem(item.menu_item_id)}
                              className="p-1 text-[#F15A25] hover:bg-[white] rounded ml-2 cursor-pointer"
                              title="Delete Item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          <input
                            type="text"
                            placeholder="Instruction/note..."
                            value={item.notes}
                            onChange={(e) => handleUpdateEditItemNotes(item.menu_item_id, e.target.value)}
                            className="bg-[white] border border-[#141B20] rounded px-2.5 py-1 text-[10px] flex-1 mr-4 focus:outline-none focus:border-[white]"
                          />
                          <span className="font-bold text-[#141B20] shrink-0">
                            {restaurantConfig.currency}{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#141B20] flex justify-between items-center font-bold">
                    <span className="text-[#141B20] text-xs">New Total</span>
                    <span className="text-lg text-gold-600">
                      {restaurantConfig.currency}
                      {editItemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingItems(false)}
                      className="flex-1 py-2 bg-[white] hover:bg-[white] text-[#141B20] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedItems}
                      className="flex-1 py-2 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#141B20] pb-2">
                      <div className="text-xs text-[#141B20] font-bold tracking-wider uppercase">Items</div>
                      {/* Only allow editing if status is not served, delivered, or cancelled */}
                      {!['served', 'delivered', 'cancelled'].includes(selectedOrder.status) && (
                        <button
                          type="button"
                          onClick={handleStartEditItems}
                          className="text-[10px] font-black text-[#141B20] hover:underline cursor-pointer flex items-center gap-1 font-sans"
                        >
                          ✏️ Edit Items
                        </button>
                      )}
                    </div>
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-semibold text-[#141B20]">{item.quantity}x {item.name}</div>
                          {item.notes && <div className="text-xs text-[#F15A25] mt-0.5">Note: {item.notes}</div>}
                        </div>
                        <div className="text-sm font-bold text-[#141B20]">
                          {restaurantConfig.currency}{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-[#141B20] flex justify-between items-center">
                    <span className="font-bold text-[#141B20]">Total</span>
                    <span className="font-bold text-xl text-gold-600">
                      {restaurantConfig.currency}{parseFloat(selectedOrder.total_amount).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-[#141B20] bg-[white] flex gap-3">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-[white] hover:bg-[white] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>


            </div>
          </div>
        </div>
      )}
    </div>
  );
}
