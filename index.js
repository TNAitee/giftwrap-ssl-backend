require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Environment variables from Render dashboard
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; // keep false for sandbox
const PORT = process.env.PORT || 5000;

// ✅ Base URL of your Render deployment
const BASE_URL =
  process.env.BASE_URL || "https://giftwrap-ssl-backend.onrender.com";

// ----- PAYMENT INITIALIZATION -----
app.post("/order", async (req, res) => {
  try {
    const { total, receiver, address, phone, userEmail, userId, orderItems } =
      req.body;
    if (!total) return res.status(400).send({ error: "total is required" });

    const data = {
      total_amount: total,
      currency: "BDT",
      tran_id: "REF" + Date.now(),
      success_url: `${BASE_URL}/success`,
      fail_url: `${BASE_URL}/fail`,
      cancel_url: `${BASE_URL}/cancel`,
      ipn_url: `${BASE_URL}/ipn`,
      shipping_method: "Courier",
      product_name: "GiftWrap Order",
      product_category: "Gifts",
      product_profile: "general",
      cus_name: receiver || "Guest",
      cus_email: userEmail || "guest@example.com",
      cus_add1: address || "",
      cus_city: "Dhaka",
      cus_postcode: "1200",
      cus_country: "Bangladesh",
      cus_phone: phone || "",
      ship_name: receiver || "Guest",
      ship_add1: address || "",
      ship_city: "Dhaka",
      ship_postcode: "1200",
      ship_country: "Bangladesh",
      value_a: JSON.stringify({ userId, orderItems, receiver, address, phone }),
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);
    const GatewayPageURL = apiResponse?.GatewayPageURL;

    if (!GatewayPageURL)
      return res.status(500).send({ error: "No gateway URL returned" });

    return res.send({ url: GatewayPageURL });
  } catch (err) {
    console.error("Payment init error:", err);
    return res.status(500).send({
      error: "Payment initialization failed",
      details: err?.message,
    });
  }
});

// ----- HELPER: HTML WITH APP REDIRECT -----
function redirectToApp(res, status) {
  // Updated deep link to match your HomeScreen
  const deepLink = `giftwrap://homepage?payment=${status}`;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Payment ${status}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        background: #fafafa;
      }
      .box {
        text-align: center;
        padding: 30px;
        border: 1px solid #eee;
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.05);
      }
      h2 { margin-bottom: 10px; color: #222; }
      p { color: #555; }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>Payment ${status.toUpperCase()}</h2>
      <p>Redirecting back to GiftWrap app...</p>
    </div>
    <script>
      setTimeout(() => {
        window.location = "${deepLink}";
      }, 1000);
    </script>
  </body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}

// ----- SUCCESS / FAIL / CANCEL -----
app.get("/success", (req, res) => {
  console.log("✅ Payment Success (GET):", req.query);
  redirectToApp(res, "success");
});

app.post("/success", (req, res) => {
  console.log("✅ Payment Success (POST):", req.body);
  redirectToApp(res, "success");
});

app.get("/fail", (req, res) => {
  console.log("❌ Payment Failed:", req.query);
  redirectToApp(res, "fail");
});

app.post("/fail", (req, res) => {
  console.log("❌ Payment Failed (POST):", req.body);
  redirectToApp(res, "fail");
});

app.get("/cancel", (req, res) => {
  console.log("⚠️ Payment Cancelled:", req.query);
  redirectToApp(res, "cancel");
});

app.post("/cancel", (req, res) => {
  console.log("⚠️ Payment Cancelled (POST):", req.body);
  redirectToApp(res, "cancel");
});

// ----- BASE ENDPOINT -----
app.get("/", (req, res) => {
  res.send("🚀 SSLCommerz backend with deep link redirect is working!");
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
