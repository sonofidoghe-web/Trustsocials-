export default async function handler(req, res) {
  // Allow GitHub Pages to call this Vercel API
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://sonofidoghe-web.github.io"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

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
      CableTV,
      SmartCardNo
    } = req.body || {};

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({
        error: "ClubKonnect credentials not configured"
      });
    }

    if (!CableTV || !SmartCardNo) {
      return res.status(400).json({
        error: "CableTV and SmartCardNo are required"
      });
    }

    const url =
      `https://www.nellobytesystems.com/APIVerifyCableTVV1.asp` +
      `?UserID=${encodeURIComponent(USER_ID)}` +
      `&APIKey=${encodeURIComponent(API_KEY)}` +
      `&CableTV=${encodeURIComponent(CableTV)}` +
      `&SmartCardNo=${encodeURIComponent(SmartCardNo)}`;

    const response = await fetch(url);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        customer_name: "INVALID_SMARTCARDNO",
        error: "Invalid response from ClubKonnect",
        raw: text.slice(0, 500)
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("ClubKonnect Cable Verification Error:", error);

    return res.status(500).json({
      customer_name: "INVALID_SMARTCARDNO",
      error: error.message || "Cable verification failed"
    });
  }
}
