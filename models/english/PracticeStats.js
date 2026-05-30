    // models/PracticeStats.js
    const mongoose = require("mongoose");

    const practiceStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    totalPracticed: { type: Number, default: 0 },
    totalMistakes: { type: Number, default: 0 }
    }, { timestamps: true });

    module.exports = mongoose.model("PracticeStats", practiceStatsSchema);