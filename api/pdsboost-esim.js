export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const key = process.env.PDSBOOST_API_KEY;

    if (!key) {
      return res.status(500).json({ error: "PDSBOOST_API_KEY is missing" });
    }

    const { action, country, package: pkg } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: "action is required" });
    }

    const body = { key, action };

    if (action === "esim_plans" && country) {
      body.country = country;
    }

    if (action === "esim_buy" && pkg) {
      body.package = pkg;
    }

    const response = await fetch("https://pdsboost.com/api/store-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Pdsboost error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
