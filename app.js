require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// =====================
// Middlewares
// =====================
app.use(cors());
app.use(express.json());

// =====================
// MongoDB Connection
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

// =====================
// Routes Import
// =====================
const customerOrderRoutes = require("./routes/customerOrderRoutes");

// =====================
// Routes Use
// =====================
app.use("/api/customer-orders", customerOrderRoutes);

// =====================
// Test Route
// =====================
app.get("/", (req, res) => {
  res.send("Server Running 🚀");
});

// =====================
// Server Start
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});