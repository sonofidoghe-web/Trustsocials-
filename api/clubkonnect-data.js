export default async function handler(req, res) {
  // Allow your GitHub Pages website to call this API
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

  // Handle browser CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const {
    MobileNetwork,
    DataPlan,
    MobileNumber,
    RequestID
  } = req.body;

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({
      error: "API credentials not configured"
    });
  }

  if (!MobileNetwork || !DataPlan || !MobileNumber) {
    return res.status(400).json({
      error: "MobileNetwork, DataPlan and MobileNumber are required"
    });
  }

  try {
    const url =
      `https://www.nellobytesystems.com/APIDatabundleV1.asp` +
      `?UserID=${encodeURIComponent(UserID)}` +
      `&APIKey=${encodeURIComponent(APIKey)}` +
      `&MobileNetwork=${encodeURIComponent(MobileNetwork)}` +
      `&DataPlan=${encodeURIComponent(DataPlan)}` +
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
        raw: text.slice(0, 300)
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("ClubKonnect data error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
