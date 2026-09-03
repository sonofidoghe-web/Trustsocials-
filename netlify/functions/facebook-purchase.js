// netlify/functions/facebook-purchase.js
//
// Places an order with SMvaults for a single Facebook product.
// The frontend must ONLY call this after confirming the user's wallet
// balance covers the (marked-up) price — this function does not know
// about your Firestore balances, it just talks to the supplier.
//
// Expects a POST body: { "sourceId": "11085", "quantity": 1, "coupon": "" }

exports.handler = async function (event) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const SMVAULTS_API_KEY = process.env.SMVAULTS_API_KEY;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    if (!SMVAULTS_API_KEY) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Missing SMVAULTS_API_KEY environment variable' })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Invalid request body' }) };
    }

    const { sourceId, quantity, coupon } = payload;
    if (!sourceId || !quantity) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Missing sourceId or quantity' }) };
    }

    const form = new URLSearchParams();
    form.append('action', 'buyProduct');
    form.append('id', String(sourceId));
    form.append('amount', String(quantity));
    if (coupon) form.append('coupon', String(coupon));
    form.append('api_key', SMVAULTS_API_KEY);

    const smRes = await fetch('https://smvaults.com/api/buy_product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const smData = await smRes.json();

    if (smData.status !== 'success') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: smData.msg || 'Purchase failed at supplier' })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        transId: smData.trans_id || null,
        data: smData.data || [],
        message: smData.msg || ''
      })
    };

  } catch (err) {
    console.error('facebook-purchase error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: 'Server error placing order' }) };
  }
};

