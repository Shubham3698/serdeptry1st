require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const app = express();

// =====================
// Proxy Trust (Required for Render/Vercel)
// =====================
app.set("trust proxy", 1);

// =====================
// MongoDB Connection
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected: Dameeto DB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// =====================
// Middlewares
// =====================

// 🔥 CORS Update: Isme apna final frontend URL zaroor dalo
app.use(cors({
  origin: [
    "http://localhost:5173",           // Local Frontend
    "http://localhost:5174",           // Alternative Local
    "https://dameeto1st.vercel.app",   // Main Website
    "https://admintry-mu.vercel.app",  // 👈 Ye hai aapka Naya Admin Panel Link
    "http://127.0.0.1:3000"            // Local Admin testing
  ], 
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// Routes Import
// =====================
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const ordersRouter = require("./routes/orders");
const customerOrderRoutes = require("./routes/customerOrderRoutes");
const productRoutes = require("./routes/productRoutes"); 
const paymentRoutes = require("./routes/paymentRoutes");

// =====================
// Routes Use
// =====================
app.use("/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/orders", ordersRouter);
app.use("/api/customer-orders", customerOrderRoutes); 
app.use("/api/payment", paymentRoutes);      
app.use("/api/products", productRoutes); 

// =====================
// Test Route (Deployment Check)
// =====================
app.get("/api/test", (req, res) => {
  res.json({ 
    success: true,
    message: "Dameeto API is Live 🚀",
    timestamp: new Date()
  });
});

// =====================
// 404 Handler
// =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested Route Not Found",
  });
});

// =====================
// Global Error Handler
// =====================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error Log:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong on the server",
  });
});

// =====================
// Start Server
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;