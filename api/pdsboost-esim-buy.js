export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { package: pkg } = req.body;
    if (!pkg) return res.status(400).json({ error: "Package is required" });

    const response = await fetch("https://pdsboost.com/api/store-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: process.env.PDSBOOST_API_KEY,
        action: "esim_buy",
        package: pkg
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
