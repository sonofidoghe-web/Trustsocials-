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

  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({
      error: "API credentials not configured"
    });
  }

  try {
    const url =
      `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp` +
      `?UserID=${encodeURIComponent(UserID)}` +
      `&APIKey=${encodeURIComponent(APIKey)}`;

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

    return res.status(200).json(data);

  } catch (error) {
    console.error("ClubKonnect plans error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
