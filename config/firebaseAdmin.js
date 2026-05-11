const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // Seedha file utha li

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin Connected via JSON File");
  } catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
  }
}

module.exports = admin;