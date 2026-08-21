/**
 * Borzo (formerly WeFast) Hyperlocal 2-Wheeler Delivery API Integration
 * API Documentation: https://borzodelivery.com/in/business-api/doc
 * Endpoint Base:
 *   Production: https://robot-in.borzodelivery.com/api/business/1.8
 *   Test:       https://robotapitest-in.borzodelivery.com/api/business/1.8
 */

const formatPhone = (phoneStr) => {
  if (!phoneStr) return '919876543210';
  let digits = phoneStr.replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length > 10) {
    return '91' + digits.slice(-10);
  }
  return digits.padStart(12, '9198765432');
};

/**
 * Place a delivery order with Borzo Business API 1.8
 * @param {Object} order - Database order object
 */
const createBorzoDeliveryJob = async (order) => {
  const token = process.env.BORZO_API_TOKEN;
  const isTest = process.env.BORZO_ENV === 'test';
  const apiBase = isTest 
    ? 'https://robotapitest-in.borzodelivery.com/api/business/1.8' 
    : 'https://robot-in.borzodelivery.com/api/business/1.8';

  if (!token) {
    console.error('[Borzo Hyperlocal] ❌ BORZO_API_TOKEN is missing in server .env');
    return {
      success: false,
      error: 'BORZO_API_TOKEN is missing in server configuration.'
    };
  }

  try {
    const pickupPhone = formatPhone('7207836300');
    const customerPhone = formatPhone(order.customer_phone || '9988774455');

    const itemsSummary = (order.items && order.items.length > 0)
      ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
      : 'Food Items';

    const dropAddress = (order.delivery_address || '').trim();

    const orderIdStr = (order.order_number || String(order._id)).slice(0, 32);
    const takingAmount = (order.payment_method === 'cod' && order.payment_status !== 'paid') 
      ? String(Number(order.total_amount || 0).toFixed(2)) 
      : '0.00';

    // Borzo Business API 1.8 POST /create-order payload
    const payload = {
      type: 'standard',
      matter: `Food Delivery: ${itemsSummary} (Order #${orderIdStr})`,
      vehicle_type_id: 8, // 8 = Motorbike (up to 20 kg)
      total_weight_kg: 1,
      is_contact_person_notification_enabled: true, // Borzo sends tracking SMS to the customer
      points: [
        {
          address: '4-1-833, Order By Bulk, MPM Mall, Abids Road, Hanuman Tekdi, Abids, Hyderabad, Telangana 500001',
          latitude: 17.3886372,
          longitude: 78.4770015,
          contact_person: {
            phone: pickupPhone,
            name: 'Order By Bulk'
          },
          client_order_id: orderIdStr,
          checkin_code: order.pickup_otp ? String(order.pickup_otp) : null,
          note: 'Pick up food packet from Order By Bulk counter (MPM Mall, Abids Road)'
        },
        {
          address: dropAddress,
          ...(order.latitude && order.longitude ? {
            latitude: Number(order.latitude),
            longitude: Number(order.longitude)
          } : {}),
          contact_person: {
            phone: customerPhone,
            name: (order.customer_name || 'Customer').slice(0, 350)
          },
          client_order_id: orderIdStr,
          taking_amount: takingAmount,
          checkin_code: order.delivery_otp ? String(order.delivery_otp) : null,
          note: (order.notes || 'Deliver to customer. Food order from Order By Bulk.').slice(0, 500)
        }
      ]
    };

    console.log(`[Borzo Hyperlocal] Calling POST ${apiBase}/create-order for #${orderIdStr}...`);

    const response = await fetch(`${apiBase}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DV-Auth-Token': token
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('[Borzo Hyperlocal] Borzo API Response:', JSON.stringify(data));

    if (data.is_successful && data.order) {
      const pickupPoint = (data.order.points && data.order.points[0]) ? data.order.points[0] : null;
      const dropPoint = (data.order.points && data.order.points[1]) ? data.order.points[1] : null;
      const pickupTrackingUrl = (pickupPoint && pickupPoint.tracking_url) ? pickupPoint.tracking_url : null;
      const deliveryTrackingUrl = (dropPoint && dropPoint.tracking_url) 
        ? dropPoint.tracking_url 
        : `https://borzodelivery.com/in/track/${data.order.order_id}`;

      const courier = data.order.courier || null;
      const courierFullName = courier ? [courier.name, courier.surname].filter(Boolean).join(' ') : null;

      return {
        success: true,
        delivery_id: `BRZ-${data.order.order_id}`,
        borzo_order_id: data.order.order_id,
        order_name: data.order.order_name,
        rider_name: courierFullName,
        rider_phone: courier?.phone || null,
        pickup_tracking_url: pickupTrackingUrl,
        tracking_url: deliveryTrackingUrl,
        delivery_tracking_url: deliveryTrackingUrl,
        status: data.order.status || 'new',
        payment_amount: data.order.payment_amount,
        delivery_fee: data.order.delivery_fee_amount
      };
    } else {
      let errorDetail = '';
      if (data.errors && data.errors.length > 0) {
        errorDetail = data.errors.join(', ');
      }
      if (data.parameter_errors) {
        errorDetail += ' | ' + JSON.stringify(data.parameter_errors);
      }
      if (!errorDetail) {
        errorDetail = data.message || JSON.stringify(data);
      }

      console.error(`[Borzo Hyperlocal] ❌ Borzo API rejected order: ${errorDetail}`);
      return {
        success: false,
        error: errorDetail,
        rawResponse: data
      };
    }
  } catch (err) {
    console.error('[Borzo Hyperlocal] ❌ Network/Execution error creating Borzo delivery job:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Cancel a Borzo delivery order
 * @param {string|number} orderId - Borzo order ID or BRZ- prefix
 */
const cancelBorzoDeliveryJob = async (orderId) => {
  const token = process.env.BORZO_API_TOKEN;
  const isTest = process.env.BORZO_ENV === 'test';
  const apiBase = isTest 
    ? 'https://robotapitest-in.borzodelivery.com/api/business/1.8' 
    : 'https://robot-in.borzodelivery.com/api/business/1.8';

  if (!token) {
    return { success: false, error: 'BORZO_API_TOKEN is missing' };
  }

  try {
    const rawId = String(orderId).replace(/^BRZ-/, '');
    const response = await fetch(`${apiBase}/cancel-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DV-Auth-Token': token
      },
      body: JSON.stringify({ order_id: Number(rawId) })
    });
    const data = await response.json();
    return { success: data.is_successful, data };
  } catch (err) {
    console.error('[Borzo Hyperlocal] ❌ Error cancelling Borzo delivery job:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Retrieve courier information from Borzo API
 * @param {string|number} orderId 
 */
const getBorzoCourierInfo = async (orderId) => {
  const token = process.env.BORZO_API_TOKEN;
  const isTest = process.env.BORZO_ENV === 'test';
  const apiBase = isTest 
    ? 'https://robotapitest-in.borzodelivery.com/api/business/1.8' 
    : 'https://robot-in.borzodelivery.com/api/business/1.8';

  if (!token) return null;

  try {
    const rawId = String(orderId).replace(/^BRZ-/, '');
    const response = await fetch(`${apiBase}/courier?order_id=${encodeURIComponent(rawId)}`, {
      method: 'GET',
      headers: {
        'X-DV-Auth-Token': token
      }
    });
    const data = await response.json();
    if (data.is_successful && data.courier) {
      return data.courier;
    }
    return null;
  } catch (err) {
    console.error('[Borzo Hyperlocal] ❌ Error getting courier info:', err.message);
    return null;
  }
};

/**
 * Retrieve live order status and courier details directly from Borzo API
 * @param {string|number} orderId 
 */
const getBorzoOrderDetails = async (orderId) => {
  const token = process.env.BORZO_API_TOKEN;
  const isTest = process.env.BORZO_ENV === 'test';
  const apiBase = isTest 
    ? 'https://robotapitest-in.borzodelivery.com/api/business/1.8' 
    : 'https://robot-in.borzodelivery.com/api/business/1.8';

  if (!token) return null;

  try {
    const rawId = String(orderId).replace(/^BRZ-/, '');
    const response = await fetch(`${apiBase}/orders?order_id=${encodeURIComponent(rawId)}`, {
      method: 'GET',
      headers: {
        'X-DV-Auth-Token': token
      }
    });
    const data = await response.json();
    console.log(`[Borzo Sync] Order #${rawId} status query response:`, JSON.stringify(data));
    if (data.is_successful) {
      const orderObj = data.order || (Array.isArray(data.orders) && data.orders.length > 0 ? data.orders[0] : null);
      return orderObj;
    }
    return null;
  } catch (err) {
    console.error('[Borzo Sync] Error querying Borzo API:', err.message);
    return null;
  }
};

module.exports = {
  createBorzoDeliveryJob,
  cancelBorzoDeliveryJob,
  getBorzoCourierInfo,
  getBorzoOrderDetails
};
