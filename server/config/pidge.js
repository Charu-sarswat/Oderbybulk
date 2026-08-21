/**
 * Pidge Delivery API Integration Client
 * Official API Documentation: https://api-docs.pidge.in/
 *
 * Correct Endpoints (from official Postman collection):
 *   Login:         POST /v1.0/store/channel/vendor/login
 *   Create Order:  POST /v1.0/store/channel/vendor/order
 *   Get Order:     GET  /v1.0/store/channel/vendor/order/:id
 *   Cancel Order:  POST /v1.0/store/channel/vendor/:id/cancel
 *   Fulfill:       POST /v1.0/store/channel/vendor/order/fulfill
 *   Smart Fulfill: POST /v1.0/store/channel/vendor/order/fulfill/smart
 */

const PIDGE_API_BASE_URL = process.env.PIDGE_API_BASE_URL || 'https://api.pidge.in';
const PIDGE_ENV = process.env.PIDGE_ENV || 'staging';

// In-memory token cache
let cachedAuthToken = null;

/**
 * Format phone number to 10-digit Indian format (Pidge expects 10 digits, not 91-prefixed)
 * @param {string} phone
 * @returns {string}
 */
const formatPidgePhone = (phone) => {
  if (!phone) return '9876543210';
  const digits = String(phone).replace(/\D/g, '');
  // Strip 91 prefix if present, return 10-digit number
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits.padStart(10, '0');
};

/**
 * Mask sensitive credentials for backend logging
 * @param {Object} obj
 * @returns {Object}
 */
const sanitizeForLog = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = ['token', 'password', 'authorization', 'bearer', 'secret', 'key'];

  const sanitizeRec = (item) => {
    if (!item || typeof item !== 'object') return;
    for (const key of Object.keys(item)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        item[key] = '***MASKED***';
      } else if (typeof item[key] === 'object') {
        sanitizeRec(item[key]);
      }
    }
  };

  sanitizeRec(clone);
  return clone;
};

/**
 * Get valid Pidge Auth Bearer Token
 * Official endpoint: POST /v1.0/store/channel/vendor/login
 * Response: { data: { token: "Bearer xxxx", status: "SUCCESS" } }
 * @param {boolean} forceRefresh
 * @returns {Promise<string|null>}
 */
const getPidgeAuthToken = async (forceRefresh = false) => {
  if (!forceRefresh && cachedAuthToken) {
    return cachedAuthToken;
  }

  const username = process.env.PIDGE_USERNAME;
  const password = process.env.PIDGE_PASSWORD;

  if (!username || !password) {
    console.warn('[Pidge API] ⚠️ PIDGE_USERNAME / PIDGE_PASSWORD not configured.');
    return null;
  }

  try {
    console.log('[Pidge API] 🔑 Authenticating with Pidge...');
    const response = await fetch(`${PIDGE_API_BASE_URL}/v1.0/store/channel/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    console.log('[Pidge API] Auth Response:', sanitizeForLog(data));

    // Response: { data: { token: "Bearer xxxx", status: "SUCCESS", message: "success Login" } }
    const rawToken = data?.data?.token || data?.token;
    if (rawToken) {
      // Token may already include "Bearer " prefix per docs
      cachedAuthToken = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
      console.log('[Pidge API] ✅ Authentication successful.');
      return cachedAuthToken;
    } else {
      console.error('[Pidge API] ❌ Authentication failed:', data?.message || JSON.stringify(data));
      return null;
    }
  } catch (err) {
    console.error('[Pidge API] ❌ Network error during auth:', err.message);
    return null;
  }
};

/**
 * Execute HTTP Request to Pidge API with auto token injection and 401 retry
 */
const pidgeApiRequest = async (endpoint, method = 'GET', body = null, isRetry = false) => {
  let token = await getPidgeAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const url = `${PIDGE_API_BASE_URL}${endpoint}`;
  console.log(`[Pidge API] 🚀 ${method} ${url}`);
  if (body) {
    console.log(`[Pidge API] Request Payload:`, JSON.stringify(sanitizeForLog(body)));
  }

  try {
    const opts = { method, headers };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      opts.body = JSON.stringify(body);
    }

    const response = await fetch(url, opts);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    console.log(`[Pidge API] Response Status ${response.status}:`, JSON.stringify(sanitizeForLog(data)));

    // Auto-refresh token on 401
    if (response.status === 401 && !isRetry) {
      console.warn('[Pidge API] ⚠️ 401 Unauthorized — refreshing token and retrying...');
      cachedAuthToken = null;
      await getPidgeAuthToken(true);
      return pidgeApiRequest(endpoint, method, body, true);
    }

    return { status: response.status, ok: response.ok, data };
  } catch (err) {
    console.error(`[Pidge API] ❌ Exception during ${method} ${url}:`, err.message);
    return { status: 500, ok: false, error: err.message };
  }
};

/**
 * Create a Pidge Delivery Order
 * Official endpoint: POST /v1.0/store/channel/vendor/order
 *
 * Payload schema (from official docs):
 * {
 *   sender_detail: {
 *     address: { address_line_1, city, state, pincode, latitude?, longitude? },
 *     name, mobile (10-digit)
 *   },
 *   poc_detail: { name, mobile },
 *   trips: [{
 *     receiver_detail: {
 *       address: { address_line_1, city, state, pincode, latitude?, longitude? },
 *       name, mobile (10-digit)
 *     },
 *     source_order_id,
 *     cod_amount,
 *     bill_amount,
 *     products?: [{ name, price, quantity }]
 *   }]
 * }
 *
 * Response: { data: { "<source_order_id>": "<pidge_id>" } }
 *
 * @param {Object} order - Database order object
 * @returns {Promise<Object>}
 */
const createPidgeDeliveryOrder = async (order) => {
  const sourceOrderId = String(order.order_number || order._id);

  const storeName = process.env.PIDGE_STORE_NAME || 'Order By Bulk';
  const storePhone = formatPidgePhone(process.env.PIDGE_STORE_PHONE || '7207836300');
  const storeAddress = process.env.PIDGE_STORE_ADDRESS || '4-1-833, MPM Mall, Abids Road, Hyderabad';
  const storeCity = process.env.PIDGE_STORE_CITY || 'Hyderabad';
  const storeState = process.env.PIDGE_STORE_STATE || 'Telangana';
  const storePincode = process.env.PIDGE_STORE_PINCODE || '500001';
  const storeLat = Number(process.env.PIDGE_STORE_LAT || 17.3886372);
  const storeLng = Number(process.env.PIDGE_STORE_LNG || 78.4770015);

  const customerName = order.customer_name || 'Guest Customer';
  const customerPhone = formatPidgePhone(order.customer_phone || '9876543210');
  // Parse delivery address for city/state/pincode fields
  const deliveryAddressLine = (order.delivery_address || '').trim();

  const productsList = (order.items || []).map(i => ({
    name: i.name,
    quantity: Number(i.quantity),
    price: Number(i.price)
  }));

  const payload = {
    sender_detail: {
      address: {
        address_line_1: storeAddress,
        city: storeCity,
        state: storeState,
        pincode: storePincode,
        latitude: storeLat,
        longitude: storeLng
      },
      name: storeName,
      mobile: storePhone
    },
    poc_detail: {
      name: storeName,
      mobile: storePhone
    },
    trips: [
      {
        receiver_detail: {
          address: {
            address_line_1: deliveryAddressLine || 'Hyderabad',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001',
            ...(order.latitude && order.longitude ? {
              latitude: Number(order.latitude),
              longitude: Number(order.longitude)
            } : {})
          },
          name: customerName,
          mobile: customerPhone
        },
        source_order_id: sourceOrderId,
        bill_amount: Number(order.total_amount || 0),
        cod_amount: (order.payment_method === 'cod' && order.payment_status !== 'paid')
          ? Number(order.total_amount || 0)
          : 0,
        ...(productsList.length > 0 ? { products: productsList } : {}),
        order_category: 'food'
      }
    ]
  };

  const res = await pidgeApiRequest('/v1.0/store/channel/vendor/order', 'POST', payload);

  if (res.ok && res.data) {
    // Response format: { data: { "<source_order_id>": "<pidge_id>" } }
    const dataObj = res.data?.data || res.data;
    let pidgeId = null;

    if (dataObj && typeof dataObj === 'object') {
      // Try source_order_id key first (official format)
      if (dataObj[sourceOrderId]) {
        pidgeId = dataObj[sourceOrderId];
      } else {
        // Fallback: take first string value
        const values = Object.values(dataObj);
        const firstStr = values.find(v => typeof v === 'string');
        if (firstStr) pidgeId = firstStr;
      }
    }

    if (!pidgeId) {
      pidgeId = dataObj?.id || dataObj?.pidge_id || `PIDGE-${sourceOrderId}`;
    }

    console.log(`[Pidge API] ✅ Order created. Pidge ID: ${pidgeId}`);
    return {
      success: true,
      pidge_id: pidgeId,
      source_order_id: sourceOrderId,
      data: res.data
    };
  } else {
    const errorMsg = res.data?.error?.message || res.data?.message || res.error || 'Pidge rejected order creation';
    console.error(`[Pidge API] ❌ Order creation failed: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      data: res.data
    };
  }
};

/**
 * Step 1 of fulfillment: Get available delivery partners and their quote tokens
 * Official endpoint: GET /v1.0/store/channel/vendor/order/fulfillment/services?ids=<pidge_id>
 *
 * Response format:
 * {
 *   "data": {
 *     "items": [
 *       {
 *         "network_id": "-1",
 *         "network_name": "pidge",
 *         "service": "pidge",
 *         "pickup_now": true,
 *         "quote": { "price": 70.8, "distance": ..., "eta": {...}, "price_breakup": {...} },
 *         "error": null,
 *         "token": "eyJhbGciO.....UjOw"   <-- JWT required for fulfill
 *       },
 *       { "network_id": "26", "network_name": "zomato", "service": "zomato", ..., "token": "..." }
 *     ]
 *   }
 * }
 *
 * @param {string} pidgeOrderId
 * @returns {Promise<Object>} { success, items, selected, error }
 */
const getPidgeServiceability = async (pidgeOrderId) => {
  console.log(`[Pidge API] 🔍 Fetching available delivery partners for order ${pidgeOrderId}...`);

  const res = await pidgeApiRequest(
    `/v1.0/store/channel/vendor/order/fulfillment/services?ids=${encodeURIComponent(pidgeOrderId)}`,
    'GET'
  );

  // Log RAW response (NOT sanitized) so we can see the actual structure
  console.log(`[Pidge API] Serviceability RAW response (status=${res.status}):`, JSON.stringify(res.data));

  if (!res.ok) {
    const errorMsg = res.data?.error?.message || res.data?.message || res.error || 'Failed to get serviceability';
    if ((res.data?.message || '').toLowerCase().includes('insufficient balance') ||
        (res.data?.statusCode === 400 && res.data?.message?.toLowerCase().includes('wallet'))) {
      return { success: false, insufficientBalance: true, error: 'Pidge wallet has insufficient balance' };
    }
    return { success: false, error: errorMsg };
  }

  // Handle both { data: { items: [...] } } and { data: [...] } shapes
  let items = res.data?.data?.items
    || res.data?.data
    || res.data?.items
    || [];

  // If data is an array directly
  if (Array.isArray(res.data?.data)) items = res.data.data;
  if (Array.isArray(res.data)) items = res.data;

  console.log(`[Pidge API] Total partners in response: ${items.length}`);

  if (items.length === 0) {
    return { success: false, noPartner: true, error: 'No delivery partner available in your area' };
  }

  // Log each item in full detail for diagnosis
  items.forEach((item, i) => {
    const hasToken = 'token' in item;
    const tokenType = typeof item.token;
    const tokenPreview = item.token ? String(item.token).substring(0, 20) + '...' : '(none)';
    console.log(`[Pidge API] Partner ${i + 1}: name=${item.network_name}, service=${item.service}, network_id=${item.network_id}, price=₹${item.quote?.price ?? 'N/A'}, pickup_now=${item.pickup_now}, error=${JSON.stringify(item.error)}, hasToken=${hasToken}, tokenType=${tokenType}, tokenPreview=${tokenPreview}`);
  });

  // Select best partner:
  // 1. Prefer items with no error AND a token (ideal 3PL flow)
  // 2. Fall back to items with no error but no token (may be captive or token-free networks)
  // 3. Last resort: first item regardless (let Pidge reject if invalid)
  let available = items.filter(item => !item.error && item.token);

  if (available.length === 0) {
    // Try items with no error but possibly no token
    available = items.filter(item => !item.error);
    if (available.length > 0) {
      console.log(`[Pidge API] ⚠️ No items with tokens found — trying ${available.length} items without token check`);
    }
  }

  if (available.length === 0) {
    // All items have errors - report them
    const errors = items.map(i => `${i.network_name || i.service}: ${JSON.stringify(i.error)}`).join(' | ');
    console.error(`[Pidge API] ❌ All partners unavailable: ${errors}`);
    return { success: false, noPartner: true, error: `No eligible delivery partner: ${errors}` };
  }

  // Sort by price ascending, pick cheapest (0-price captive first if available)
  available.sort((a, b) => (a.quote?.price ?? 999) - (b.quote?.price ?? 999));
  const selected = available[0];

  console.log(`[Pidge API] ✅ Selected partner: ${selected.network_name} (service=${selected.service}), price=₹${selected.quote?.price ?? 'N/A'}, network_id=${selected.network_id}, hasToken=${!!selected.token}`);

  return {
    success: true,
    items,
    selected: {
      network_id: selected.network_id,
      network_name: selected.network_name,
      service: selected.service,
      pickup_now: selected.pickup_now !== undefined ? selected.pickup_now : true,
      token: selected.token || null,
      price: selected.quote?.price,
      eta_pickup_min: selected.quote?.eta?.pickup_min
    }
  };
};

/**
 * Step 2 of fulfillment: Fulfill (allocate) a Pidge Order using the serviceability token
 * Official endpoint: POST /v1.0/store/channel/vendor/order/fulfill
 *
 * Flow:
 *   1. GET /v1.0/store/channel/vendor/order/fulfillment/services?ids=<pidge_id>
 *      → Get available partners with JWT tokens (time-bound quotations)
 *   2. POST /v1.0/store/channel/vendor/order/fulfill
 *      → With: ids, service, pickup_now, token (JWT), network_id
 *
 * For captive (self) allocation: token and network_id are NOT required.
 * For all 3PL partners: token from serviceability is REQUIRED ("quotation").
 *
 * @param {string} pidgeOrderId
 * @returns {Promise<Object>}
 */
const fulfillPidgeOrder = async (pidgeOrderId) => {
  let smartAllocationIdStr = process.env.PIDGE_SMART_ALLOCATION_ID;
  let smartAllocationId = null;

  if (smartAllocationIdStr) {
    const parsed = Number(smartAllocationIdStr);
    if (isNaN(parsed)) {
      console.warn(`[Pidge API] ⚠️ PIDGE_SMART_ALLOCATION_ID ("${smartAllocationIdStr}") is not a valid number. Smart Fulfill strictly requires a numeric ID. Falling back to manual allocation.`);
    } else {
      smartAllocationId = parsed;
    }
  }

  // Flow A: Smart Allocation (if configured)
  if (smartAllocationId) {
    console.log(`[Pidge API] 🚀 Using Smart Allocation (ID: ${smartAllocationId}) for order ${pidgeOrderId}...`);
    
    const payload = {
      ids: [pidgeOrderId],
      smart_allocation_id: smartAllocationId
    };

    const res = await pidgeApiRequest('/v1.0/store/channel/vendor/order/fulfill/smart', 'POST', payload);
    console.log(`[Pidge API] Smart Fulfillment response:`, JSON.stringify(sanitizeForLog(res.data)));

    if (res.ok) {
      console.log(`[Pidge API] ✅ Order ${pidgeOrderId} smart fulfillment succeeded. Fetching assigned partner...`);
      
      // Wait a moment for allocation to complete in Pidge's system before fetching status
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await getPidgeOrderStatus(pidgeOrderId);
      
      return {
        success: true,
        pidge_id: pidgeOrderId,
        status: statusRes.success ? (statusRes.status || 'MANIFESTED') : 'MANIFESTED',
        partner_name: statusRes.success ? statusRes.partnerName : 'Smart Allocation',
        service: 'smart_allocation',
        price: null, // Smart allocation might determine price later
        data: res.data
      };
    } else {
      const errorMsg = res.data?.error?.message || res.data?.message || res.error || 'Pidge smart allocation failed';
      const errorCode = res.data?.error?.code || '';
      console.error(`[Pidge API] ❌ Smart Fulfill failed [${errorCode}]: ${errorMsg}`);
      
      if (errorMsg.toLowerCase().includes('insufficient balance') || errorMsg.toLowerCase().includes('wallet')) {
        return { success: false, insufficientBalance: true, error: 'Pidge wallet has insufficient balance', data: res.data };
      }
      
      return { success: false, error: errorMsg, errorCode, data: res.data };
    }
  }

  // Flow B: Manual Allocation using Quotes (if Smart Allocation is NOT configured)
  console.log(`[Pidge API] ℹ️ Smart allocation not configured. Falling back to manual quote-based allocation.`);
  
  // Step 1: Get serviceability / available quotations
  const svcResult = await getPidgeServiceability(pidgeOrderId);

  if (!svcResult.success) {
    if (svcResult.insufficientBalance) {
      return { success: false, insufficientBalance: true, error: svcResult.error };
    }
    if (svcResult.noPartner) {
      return { success: false, noPartner: true, error: svcResult.error };
    }
    return { success: false, error: svcResult.error };
  }

  const { selected } = svcResult;

  // Step 2: Build fulfill payload with the quotation token
  // For "captive" (self-fleet) service: no token or network_id needed
  // For any 3PL (pidge, zomato, wefast, porter, etc.): token is REQUIRED
  const isCaptive = selected.service === 'captive';
  const fulfillPayload = {
    ids: [pidgeOrderId],
    service: selected.service,
    pickup_now: selected.pickup_now !== undefined ? selected.pickup_now : true,
    ...(!isCaptive && selected.token ? { token: selected.token } : {}),
    ...(!isCaptive && selected.network_id ? { network_id: String(selected.network_id) } : {})
  };

  console.log(`[Pidge API] 🚀 Manual Fulfillment request:`, JSON.stringify(sanitizeForLog(fulfillPayload)));

  const res = await pidgeApiRequest('/v1.0/store/channel/vendor/order/fulfill', 'POST', fulfillPayload);

  console.log(`[Pidge API] Manual Fulfillment response:`, JSON.stringify(sanitizeForLog(res.data)));

  if (res.ok) {
    console.log(`[Pidge API] ✅ Order ${pidgeOrderId} manually fulfilled — partner: ${selected.network_name}`);
    return {
      success: true,
      pidge_id: pidgeOrderId,
      status: 'MANIFESTED',
      partner_name: selected.network_name,
      service: selected.service,
      price: selected.price,
      data: res.data
    };
  } else {
    const errorMsg = res.data?.error?.message || res.data?.message || res.error || 'Pidge allocation failed';
    const errorCode = res.data?.error?.code || '';

    if (errorMsg.toLowerCase().includes('no eligible') || errorMsg.toLowerCase().includes('no partner') ||
        errorCode === 'order.action.fulfill.not-allowed') {
      console.warn(`[Pidge API] ⚠️ No delivery partner available: ${errorMsg}`);
      return { success: false, noPartner: true, error: 'No delivery partner available', data: res.data };
    }

    if (errorMsg.toLowerCase().includes('insufficient balance') || errorMsg.toLowerCase().includes('wallet')) {
      return { success: false, insufficientBalance: true, error: 'Pidge wallet has insufficient balance', data: res.data };
    }

    console.error(`[Pidge API] ❌ Manual Fulfill failed [${errorCode}]: ${errorMsg}`);
    return { success: false, error: errorMsg, errorCode, data: res.data };
  }
};

/**
 * Fetch Pidge Order Status and Rider/Fulfillment Details
 * Official endpoint: GET /v1.0/store/channel/vendor/order/:id
 *
 * Response includes:
 *   data.status: "pending" | "fulfilled" | "completed" | "cancelled"
 *   data.fulfillment.status: "CREATED" | "OUT_FOR_PICKUP" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED" etc.
 *   data.fulfillment.rider: { id, name, mobile }
 *   data.fulfillment.channel: { name, order_id }
 *   data.fulfillment.track_code
 *
 * @param {string} pidgeOrderId
 * @returns {Promise<Object>}
 */
const getPidgeOrderStatus = async (pidgeOrderId) => {
  const res = await pidgeApiRequest(`/v1.0/store/channel/vendor/order/${pidgeOrderId}`, 'GET');

  if (res.ok && res.data) {
    const oData = res.data?.data || res.data;
    const fulfillment = oData?.fulfillment || {};
    const rider = fulfillment?.rider || {};
    const channel = fulfillment?.channel || {};

    const partnerName = channel?.name || 'Pidge Partner';
    const riderName = rider?.name || null;
    const riderPhone = rider?.mobile || null;
    // Tracking URL constructed from track_code or pidge_id
    const trackCode = fulfillment?.track_code || null;
    const trackingUrl = trackCode
      ? `https://pidge.in/track/${trackCode}`
      : `https://pidge.in/track/${pidgeOrderId}`;
    const fulfillmentStatus = fulfillment?.status || null;
    const parentStatus = oData?.status || 'pending';

    return {
      success: true,
      pidge_id: pidgeOrderId,
      status: fulfillmentStatus,
      parent_status: parentStatus,
      partner_name: partnerName,
      rider_name: riderName,
      rider_phone: riderPhone,
      tracking_url: trackingUrl,
      raw: oData
    };
  } else {
    return {
      success: false,
      error: res.data?.error?.message || res.data?.message || res.error || 'Failed to fetch Pidge order status'
    };
  }
};

/**
 * Cancel a Pidge Delivery Order
 * Official endpoint: POST /v1.0/store/channel/vendor/:id/cancel
 * Can only cancel when status is PENDING or FULFILLED.
 * Response: { data: "Order Cancelled" }
 *
 * @param {string} pidgeOrderId
 * @returns {Promise<Object>}
 */
const cancelPidgeDeliveryOrder = async (pidgeOrderId) => {
  if (!pidgeOrderId) {
    return { success: false, error: 'No Pidge Order ID provided' };
  }

  // Official: POST /v1.0/store/channel/vendor/:id/cancel  (no body needed)
  const res = await pidgeApiRequest(`/v1.0/store/channel/vendor/${pidgeOrderId}/cancel`, 'POST');

  if (res.ok) {
    console.log(`[Pidge API] ✅ Order ${pidgeOrderId} cancelled.`);
    return {
      success: true,
      pidge_id: pidgeOrderId,
      message: 'Pidge delivery order cancelled successfully'
    };
  } else {
    const errorMsg = res.data?.error?.message || res.data?.message || res.error || 'Failed to cancel Pidge delivery order';
    console.error(`[Pidge API] ❌ Cancel failed: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      data: res.data
    };
  }
};

/**
 * Staging Test: Simulate status update for an order
 * Endpoint: GET /v1.0/store/channel/vendor/order/:id?dummy_status=<status>
 * Only works in staging environment.
 *
 * @param {string} pidgeOrderId
 * @param {string} targetStatus  e.g. "fulfilled|out for pickup", "fulfilled|delivered"
 * @returns {Promise<Object>}
 */
const simulatePidgeStatus = async (pidgeOrderId, targetStatus) => {
  if (PIDGE_ENV !== 'staging') {
    return { success: false, error: 'Status simulation is only allowed in Staging environment' };
  }

  const res = await pidgeApiRequest(
    `/v1.0/store/channel/vendor/order/${pidgeOrderId}?dummy_status=${encodeURIComponent(targetStatus)}`,
    'GET'
  );
  return {
    success: res.ok,
    data: res.data,
    error: res.error
  };
};

/**
 * Map Pidge fulfillment status to local order/delivery statuses
 * Based on official Pidge fulfillment status values from docs:
 *   CREATED, OUT_FOR_PICKUP, REACHED_PICKUP, PICKED_UP, IN_TRANSIT,
 *   OUT_FOR_DELIVERY, REACHED_DELIVERY, DELIVERED, DISPOSED,
 *   UNDELIVERED, RTO_OUT_FOR_DELIVERY, RTO_UNDELIVERED, RTO_DELIVERED,
 *   CANCELLED, LOST, DAMAGED
 *
 * @param {string} pidgeFulfillmentStatus
 * @returns {Object}
 */
const mapPidgeStatusToLocal = (pidgeFulfillmentStatus) => {
  const status = (pidgeFulfillmentStatus || '').toUpperCase().trim();

  switch (status) {
    case 'PENDING':
      return { orderStatus: 'received', deliveryStatus: 'searching', isDelivered: false, isCancelled: false, isFailed: false };

    case 'CREATED':
    case 'MANIFESTED':
      return { orderStatus: 'preparing', deliveryStatus: 'searching', isDelivered: false, isCancelled: false, isFailed: false };

    case 'OUT_FOR_PICKUP':
    case 'REACHED_PICKUP':
      return { orderStatus: 'ready', deliveryStatus: 'rider_assigned', isDelivered: false, isCancelled: false, isFailed: false };

    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return { orderStatus: 'out_for_delivery', deliveryStatus: 'picked_up', isDelivered: false, isCancelled: false, isFailed: false };

    case 'OUT_FOR_DELIVERY':
    case 'REACHED_DELIVERY':
      return { orderStatus: 'out_for_delivery', deliveryStatus: 'out_for_delivery', isDelivered: false, isCancelled: false, isFailed: false };

    case 'DELIVERED':
    case 'COMPLETED':
      return { orderStatus: 'delivered', deliveryStatus: 'delivered', isDelivered: true, isCancelled: false, isFailed: false };

    case 'CANCELLED':
      return { orderStatus: 'cancelled', deliveryStatus: 'cancelled', isDelivered: false, isCancelled: true, isFailed: false };

    case 'UNDELIVERED':
    case 'FAILED':
    case 'LOST':
    case 'DAMAGED':
      return { orderStatus: 'hold', deliveryStatus: 'failed', isDelivered: false, isCancelled: false, isFailed: true };

    case 'DISPOSED':
      return { orderStatus: 'delivered', deliveryStatus: 'disposed', isDelivered: true, isCancelled: false, isFailed: false };

    case 'RTO_OUT_FOR_DELIVERY':
    case 'RTO_UNDELIVERED':
    case 'RTO_DELIVERED':
      return { orderStatus: 'cancelled', deliveryStatus: 'returned', isDelivered: false, isCancelled: true, isFailed: false };

    default:
      return { orderStatus: 'preparing', deliveryStatus: status.toLowerCase(), isDelivered: false, isCancelled: false, isFailed: false };
  }
};

module.exports = {
  getPidgeAuthToken,
  createPidgeDeliveryOrder,
  getPidgeServiceability,
  fulfillPidgeOrder,
  getPidgeOrderStatus,
  cancelPidgeDeliveryOrder,
  simulatePidgeStatus,
  mapPidgeStatusToLocal,
  formatPidgePhone,
  sanitizeForLog
};
