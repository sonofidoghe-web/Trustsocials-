// main.ts
//
// Trust Social - Deno eSIM API Proxy
//
// Routes:
// POST /esim/countries
// POST /esim/plans
// POST /esim/buy
//
// The Pdsboost API key stays on the Deno server.
// NEVER put the private API key inside esim.html.

const PDSBOOST_URL =
  Deno.env.get("PDSBOOST_API_URL") ||
  "https://pdsboost.com/api/store-v2";

const PDSBOOST_KEY =
  Deno.env.get("PDSBOOST_API_KEY") ||
  Deno.env.get("PDSBOOST_PRIVATE_API_KEY") ||
  "";

const PORT = Number(Deno.env.get("PORT") || 8000);

// --------------------------------------------------
// CORS
// --------------------------------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

// --------------------------------------------------
// JSON RESPONSE
// --------------------------------------------------

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

// --------------------------------------------------
// ERROR RESPONSE
// --------------------------------------------------

function errorResponse(message: string, status = 400, extra: unknown = null) {
  return json(
    {
      success: false,
      error: message,
      ...(extra ? { details: extra } : {}),
    },
    status,
  );
}

// --------------------------------------------------
// PROVIDER REQUEST
// --------------------------------------------------

async function pdsboostRequest(action: string, extra: Record<string, unknown> = {}) {
  if (!PDSBOOST_KEY) {
    throw new Error(
      "PDSBOOST_API_KEY is not configured in Deno environment variables.",
    );
  }

  const body = {
    key: PDSBOOST_KEY,
    action,
    ...extra,
  };

  const response = await fetch(PDSBOOST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      success: false,
      error: text || "Provider returned an invalid response.",
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Provider returned HTTP ${response.status}`,
    );
  }

  return data;
}

// --------------------------------------------------
// NORMALIZE PROVIDER RESPONSE
// --------------------------------------------------

function extractArray(data: any, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

// --------------------------------------------------
// COUNTRIES
// --------------------------------------------------

async function getCountries() {
  const data = await pdsboostRequest("esim_countries");

  const countries = extractArray(data, [
    "countries",
    "data",
    "results",
    "items",
  ]);

  return json({
    success: true,
    countries,
    data: countries,
    provider: data,
  });
}

// --------------------------------------------------
// PLANS
// --------------------------------------------------

async function getPlans(request: Request) {
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const country =
    body?.country ||
    body?.countryCode ||
    body?.code ||
    "";

  if (!country) {
    return errorResponse("Country is required.");
  }

  const data = await pdsboostRequest("esim_plans", {
    country,
  });

  const plans = extractArray(data, [
    "plans",
    "data",
    "results",
    "items",
  ]);

  return json({
    success: true,
    country,
    plans,
    data: plans,
    provider: data,
  });
}

// --------------------------------------------------
// BUY eSIM
// --------------------------------------------------

async function buyEsim(request: Request) {
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request.");
  }

  const packageId =
    body?.package ||
    body?.packageId ||
    body?.plan ||
    body?.planId ||
    body?.code ||
    "";

  if (!packageId) {
    return errorResponse("eSIM package is required.");
  }

  const data = await pdsboostRequest("esim_buy", {
    package: packageId,
  });

  /*
    Pdsboost response is passed back to esim.html.

    This keeps the frontend flexible because the provider
    may return different fields depending on the package.
  */

  return json({
    success: true,

    order:
      data?.order ??
      data?.order_id ??
      data?.orderId ??
      "",

    order_id:
      data?.order_id ??
      data?.orderId ??
      data?.order ??
      "",

    qr:
      data?.qr ??
      data?.qr_code ??
      data?.qrcode ??
      data?.qrCode ??
      "",

    lpa:
      data?.lpa ??
      data?.LPA ??
      data?.activation_code ??
      "",

    iccid:
      data?.iccid ??
      data?.ICCID ??
      "",

    package: packageId,

    message:
      data?.message ||
      "eSIM purchase completed.",

    provider: data,
  });
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

function healthCheck() {
  return json({
    success: true,
    service: "Trust Social eSIM API",
    status: "online",
    routes: [
      "POST /esim/countries",
      "POST /esim/plans",
      "POST /esim/buy",
    ],
  });
}

// --------------------------------------------------
// SERVER
// --------------------------------------------------

Deno.serve(
  {
    port: PORT,
  },
  async (request) => {
    const url = new URL(request.url);

    // OPTIONS / CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Health
    if (request.method === "GET" && url.pathname === "/") {
      return healthCheck();
    }

    // Countries
    if (
      request.method === "POST" &&
      url.pathname === "/esim/countries"
    ) {
      try {
        return await getCountries();
      } catch (error) {
        console.error("Countries error:", error);

        return errorResponse(
          error instanceof Error
            ? error.message
            : "Failed to load eSIM countries.",
          502,
        );
      }
    }

    // Plans
    if (
      request.method === "POST" &&
      url.pathname === "/esim/plans"
    ) {
      try {
        return await getPlans(request);
      } catch (error) {
        console.error("Plans error:", error);

        return errorResponse(
          error instanceof Error
            ? error.message
            : "Failed to load eSIM plans.",
          502,
        );
      }
    }

    // Buy
    if (
      request.method === "POST" &&
      url.pathname === "/esim/buy"
    ) {
      try {
        return await buyEsim(request);
      } catch (error) {
        console.error("Buy eSIM error:", error);

        return errorResponse(
          error instanceof Error
            ? error.message
            : "eSIM purchase failed.",
          502,
        );
      }
    }

    return errorResponse("Route not found.", 404);
  },
);
