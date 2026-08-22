const PDSBOOST_URL = "https://pdsboost.com/api/v2/store-v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

async function callPdsBoost(body) {
  const apiKey = Deno.env.get("PDSBOOST_API_KEY");

  if (!apiKey) {
    throw new Error("PDSBOOST_API_KEY is not configured");
  }

  const res = await fetch(PDSBOOST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: apiKey,
      ...body,
    }),
  });

  const text = await res.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from PdsBoost");
  }

  if (!res.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `PdsBoost returned HTTP ${res.status}`
    );
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return response({
      success: false,
      error: "Only POST requests are allowed",
    }, 405);
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const body = await req.json().catch(() => ({}));

    // ==============================
    // GET eSIM COUNTRIES
    // ==============================
    if (path === "/pdsboost-esim-countries") {
      const data = await callPdsBoost({
        action: "esim_countries",
      });

      return response(data);
    }

    // ==============================
    // GET eSIM PLANS
    // ==============================
    if (path === "/pdsboost-esim-plans") {
      const country = body.country;

      if (!country) {
        return response({
          success: false,
          error: "Country is required",
        }, 400);
      }

      const data = await callPdsBoost({
        action: "esim_plans",
        country,
      });

      return response(data);
    }

    // ==============================
    // BUY eSIM
    // ==============================
    if (path === "/pdsboost-esim-buy") {
      const packageId = body.package;

      if (!packageId) {
        return response({
          success: false,
          error: "Package is required",
        }, 400);
      }

      const data = await callPdsBoost({
        action: "esim_buy",
        package: packageId,
      });

      return response(data);
    }

    return response({
      success: false,
      error: "Endpoint not found",
    }, 404);

  } catch (error) {
    console.error("Deno API error:", error);

    return response({
      success: false,
      error: error.message || "Server error",
    }, 500);
  }
});
