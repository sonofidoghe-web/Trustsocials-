// netlify/functions/facebook-products.js
//
// Fetches the full SMvaults catalog, keeps ONLY the Facebook category
// (and its subcategories), converts each product's USD price to NGN
// using a live exchange rate, then adds a 50% markup.
//
// Setup:
// 1. Put this file at: netlify/functions/facebook-products.js
// 2. In Netlify: Site settings -> Environment variables -> add
//      SMVAULTS_API_KEY = 730d9ab3d0e33dfaa998c10b9e5551315G1UceiaDpEwLYlfM0hRBgjC4y86OvFW
//    (never hardcode the key in this file or in any frontend code)
// 3. Deploy. Your frontend calls: /.netlify/functions/facebook-products

const MARKUP_MULTIPLIER = 1.5; // +50%

exports.handler = async function (event) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const SMVAULTS_API_KEY = process.env.SMVAULTS_API_KEY;

  try {
    if (!SMVAULTS_API_KEY) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Missing SMVAULTS_API_KEY environment variable' })
      };
    }

    // 1. Live USD -> NGN exchange rate
    const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
    const rateData = await rateRes.json();
    const usdToNgn = rateData && rateData.rates && rateData.rates.NGN;

    if (!usdToNgn) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Could not fetch USD to NGN exchange rate' })
      };
    }

    // 2. Full SMvaults catalog
    const productsUrl = `https://smvaults.com/api/products.php?api_key=${SMVAULTS_API_KEY}`;
    const smRes = await fetch(productsUrl);
    const smData = await smRes.json();

    if (smData.status !== 'success' || !Array.isArray(smData.categories)) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Unexpected response from SMvaults' })
      };
    }

    // 3. Find the top-level FACEBOOK category
    const facebookCategory = smData.categories.find(
      c => Number(c.parent_id) === 0 && c.name && c.name.toUpperCase() === 'FACEBOOK'
    );

    if (!facebookCategory) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, exchangeRate: usdToNgn, products: [] })
      };
    }

    const facebookId = Number(facebookCategory.id);

    // 4. Facebook category itself + every subcategory under it
    const facebookCategories = smData.categories.filter(
      c => Number(c.parent_id) === facebookId || Number(c.id) === facebookId
    );

    // 5. Flatten products, convert price (USD -> NGN), apply markup
    const products = [];
    facebookCategories.forEach(cat => {
      (cat.products || []).forEach(p => {
        const usdPrice = parseFloat(p.price) || 0;
        const ngnPrice = Math.round(usdPrice * usdToNgn * MARKUP_MULTIPLIER);

        products.push({
          id: `sm_${p.id}`,          // prefixed so it never collides with a Firestore doc id
          sourceId: p.id,             // the raw SMvaults product id, needed to place an order
          source: 'smvaults',
          title: p.name,
          description: p.description || '',
          price: ngnPrice,
          stock: Number(p.amount) || 0,
          categoryName: cat.name,
          iconUrl: cat.icon || '',
          flag: p.flag || null,
          min: Number(p.min) || 1,
          max: Number(p.max) || 1
        });
      });
    });

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=120' },
      body: JSON.stringify({ success: true, exchangeRate: usdToNgn, products })
    };

  } catch (err) {
    console.error('facebook-products error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Server error fetching Facebook products' })
    };
  }
};
