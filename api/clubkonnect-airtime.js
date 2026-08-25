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

  // Handle browser preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { MobileNetwork, Amount, MobileNumber, RequestID } = req.body || {};

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({
      error: "API credentials not configured"
    });
  }

  if (!MobileNetwork || !Amount || !MobileNumber) {
    return res.status(400).json({
      error: "MobileNetwork, Amount and MobileNumber are required"
    });
  }

  try {
    const url =
      `https://www.nellobytesystems.com/APIAirtimeV1.asp` +
      `?UserID=${encodeURIComponent(UserID)}` +
      `&APIKey=${encodeURIComponent(APIKey)}` +
      `&MobileNetwork=${encodeURIComponent(MobileNetwork)}` +
      `&Amount=${encodeURIComponent(Amount)}` +
      `&MobileNumber=${encodeURIComponent(MobileNumber)}` +
      `&RequestID=${encodeURIComponent(RequestID || Date.now())}`;

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
    console.error("ClubKonnect Airtime Error:", error);

    return res.status(500).json({
      error: error.message || "Airtime request failed"
    });
  }
}
