const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Order = require('./models/Order');

async function markOrdersCompleted() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Update all Dine-in & Takeaway orders that are not cancelled
    const dineInAndTakeawayRes = await Order.updateMany(
      { 
        status: { $nin: ['served', 'delivered', 'cancelled'] },
        order_channel: { $in: ['dine_in', 'takeaway'] }
      },
      { 
        $set: { 
          status: 'served', 
          payment_status: 'paid',
          updated_at: new Date()
        } 
      }
    );

    // 2. Update all Delivery orders that are not cancelled
    const deliveryRes = await Order.updateMany(
      { 
        status: { $nin: ['served', 'delivered', 'cancelled'] },
        order_channel: 'delivery'
      },
      { 
        $set: { 
          status: 'delivered', 
          payment_status: 'paid',
          delivery_status: 'delivered',
          updated_at: new Date()
        } 
      }
    );

    // 3. Mark any remaining uncancelled orders with pending payment as paid
    const pendingPaymentRes = await Order.updateMany(
      { 
        status: { $ne: 'cancelled' },
        payment_status: 'pending'
      },
      { 
        $set: { 
          payment_status: 'paid',
          updated_at: new Date()
        } 
      }
    );

    console.log(`Updated ${dineInAndTakeawayRes.modifiedCount} Dine-in/Takeaway orders to 'served' and 'paid'.`);
    console.log(`Updated ${deliveryRes.modifiedCount} Delivery orders to 'delivered' and 'paid'.`);
    console.log(`Updated ${pendingPaymentRes.modifiedCount} remaining pending payments to 'paid'.`);

    process.exit(0);
  } catch (err) {
    console.error('Error updating orders:', err);
    process.exit(1);
  }
}

markOrdersCompleted();
