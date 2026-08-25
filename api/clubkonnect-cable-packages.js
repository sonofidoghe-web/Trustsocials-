export default async function handler(req, res) {
  // ========== CORS - Allow both GitHub Pages and Vercel ==========
  const allowedOrigins = [
    "https://sonofidoghe-web.github.io",
    "https://trustsocials.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle browser CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({
        error: "Missing ClubKonnect credentials"
      });
    }

    const provider = String(req.query.provider || "").toLowerCase();

    if (!provider) {
      return res.status(400).json({
        error: "Provider is required"
      });
    }

    const url =
      `https://www.nellobytesystems.com/APICableTVPackagesV2.asp` +
      `?UserID=${encodeURIComponent(USER_ID)}` +
      `&APIKey=${encodeURIComponent(API_KEY)}`;

    const response = await fetch(url);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Invalid response from ClubKonnect",
        raw: text.slice(0, 500)
      });
    }

    // ClubKonnect provider names
    const providerKeyMap = {
      dstv: "DStv",
      gotv: "GOtv",
      startimes: "Startimes",
      startime: "Startimes"
    };

    const key = providerKeyMap[provider] || provider;

    let packages = [];

    if (
      data?.TV_ID?.[key] &&
      Array.isArray(data.TV_ID[key])
    ) {
      packages = data.TV_ID[key][0]?.PRODUCT || [];
    }

    // Normalize response for frontend
    const normalized = packages
      .map((pkg) => ({
        code: pkg.PACKAGE_ID || "",
        name: pkg.PACKAGE_NAME || "Unknown Package",
        amount: Number(pkg.PACKAGE_AMOUNT || 0)
      }))
      .filter(
        (pkg) =>
          pkg.code &&
          pkg.amount > 0
      );

    return res.status(200).json({
      packages: normalized
    });

  } catch (error) {
    console.error("ClubKonnect Cable Packages Error:", error);

    return res.status(500).json({
      error: error.message || "Failed to load cable packages"
    });
  }
}
