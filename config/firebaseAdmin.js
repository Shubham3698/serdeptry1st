const admin = require("firebase-admin");

let serviceAccount;

// 🛡️ Logic: Pehle Environment Variable check karo (Render ke liye)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Firebase Env Parse Error:", err.message);
  }
} else {
  // 💻 Agar Env Var nahi hai, toh local file dhoondo (Tujhe laptop ke liye)
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (err) {
    // Agar file bhi nahi hai aur Env bhi nahi, toh ye error aayega
    console.warn("⚠️ Firebase Credentials not found (Env or File).");
  }
}

// 🚀 Initialization
if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    // Message thoda dynamic rakhte hain
    const source = process.env.FIREBASE_SERVICE_ACCOUNT ? "Environment Variable" : "JSON File";
    console.log(`✅ Firebase Admin Connected via ${source}`);
  } catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
  }
}

module.exports = admin;