const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('https://backendalmasar.napoltech.com/admin/all-orders?page=1');
    const { orders } = res.data;
    console.log(`Fetched ${orders.length} orders.`);
    
    // Check if any order has latitude or longitude
    const ordersWithGeo = orders.filter(o => o.latitude !== null || o.longitude !== null);
    console.log(`Orders with geo location: ${ordersWithGeo.length}`);
    
    if (ordersWithGeo.length > 0) {
      console.log('Sample order with geo:', JSON.stringify(ordersWithGeo[0], null, 2));
    } else if (orders.length > 0) {
      console.log('Sample order (no geo):', JSON.stringify(orders[0], null, 2));
    }
  } catch (err) {
    console.error('API_ERROR:', err.message);
  }
}
main();
