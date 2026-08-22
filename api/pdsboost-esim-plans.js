export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const key = process.env.PDSBOOST_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const { country } = req.body || {};
    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    const response = await fetch("https://pdsboost.com/api/store-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: key,
        action: "esim_plans",
        country: country
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load plans" });
  }
}
