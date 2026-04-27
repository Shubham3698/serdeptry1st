const mongoose = require("mongoose");

const pincodeSchema = new mongoose.Schema({
  pincode: String,
  isDeliverable: Boolean,
  checkedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PincodeCheck", pincodeSchema);