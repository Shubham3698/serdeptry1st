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
// 🔥 UPDATED Middlewares (CORS FIX)
// =====================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "https://dameeto1st.vercel.app",
  "https://admintry-mu.vercel.app",
  "https://dameeto.in",
  "https://serdeptry1st.onrender.com",
  "https://www.dameeto.in",
  "https://english1stcomm.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // 2. Allow Chrome Extensions
    if (origin.startsWith("chrome-extension://")) {
      return callback(null, true);
    }

    // 3. Allow whitelisted domains OR any Vercel preview branch
    const isVercelPreview = origin.endsWith(".vercel.app");
    if (allowedOrigins.includes(origin) || isVercelPreview) {
      return callback(null, true);
    }

    // ❌ Block everything else
    console.log("❌ CORS Blocked for Origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204
}));

// Extra Pre-flight handling for complex requests
app.options("*", cors());

app.use(logger("dev"));

// 🔥 413 Error Fix (Original limits kept intact)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

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
const gameRoutes = require("./routes/gameRoutes");
const freeGiftRoutes = require("./routes/freeGiftRoutes");
const pincodeRoute = require("./routes/pincode");
const wishlistRoutes = require("./routes/wishlistRoutes");

const englishUsersRouter = require("./routes/englishUsers");
const englishPostRoutes = require("./routes/englishPostRoutes");
const engPaymentRoutes = require("./routes/engPaymentRoutes");
const wordRoutes = require("./routes/wordRoutes");

// =====================
// Routes Use
// =====================
app.use("/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/orders", ordersRouter);
app.use("/api/customer-orders", customerOrderRoutes); 
app.use("/api/payment", paymentRoutes);      
app.use("/api/products", productRoutes); 
app.use("/api", gameRoutes);
app.use("/api/free-gifts", freeGiftRoutes);
app.use("/api", pincodeRoute);
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/english-community/users", englishUsersRouter);
app.use("/api/english-posts", englishPostRoutes);
app.use("/api/eng-payment", engPaymentRoutes);
app.use("/api/words", wordRoutes);

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