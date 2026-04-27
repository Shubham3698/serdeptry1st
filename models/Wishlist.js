const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
  // ❌ Purana: userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  // ✅ Naya: Isse Email aur ID dono chalenge
  userId: { 
    type: String, 
    required: true,
    index: true // Searching fast karne ke liye index add kar diya
  },
  productId: { 
    type: String, 
    required: true 
  },
  productData: { 
    type: Object, 
    required: true 
  }
}, { timestamps: true });

// Taaki ek user ek product ko do baar add na kar sake
WishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);