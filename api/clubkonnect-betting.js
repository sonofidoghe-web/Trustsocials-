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

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle browser CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;

    const {
      BettingCompany,
      CustomerID,
      Amount,
      RequestID
    } = req.body || {};

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({
        error: "API credentials not configured"
      });
    }

    if (!BettingCompany || !CustomerID || !Amount || !RequestID) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const url =
      `https://www.nellobytesystems.com/APIBettingV1.asp` +
      `?UserID=${encodeURIComponent(USER_ID)}` +
      `&APIKey=${encodeURIComponent(API_KEY)}` +
      `&BettingCompany=${encodeURIComponent(BettingCompany)}` +
      `&CustomerID=${encodeURIComponent(CustomerID)}` +
      `&Amount=${encodeURIComponent(Amount)}` +
      `&RequestID=${encodeURIComponent(RequestID)}`;

    const response = await fetch(url);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        statuscode: "502",
        status: "FAILED",
        error: "Invalid response from ClubKonnect",
        raw: text.slice(0, 500)
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("ClubKonnect Betting Error:", error);

    return res.status(500).json({
      statuscode: "500",
      status: "FAILED",
      error: error.message || "Betting request failed"
    });
  }
}
