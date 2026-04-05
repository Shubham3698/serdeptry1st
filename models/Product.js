const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    id: String,           // Jaise: tr-1, st-1
    pageType: String,     // Kis page ka data hai (trendingData, stickerData etc.)
    category: String,
    title: String,
    shortDesc: String,
    longDesc: String,
    finalPrice: Number,
    originalPrice: Number,
    discount: Number,
    rating: { type: Number, default: 4.5 },
    stock: { type: Number, default: 10 },
    src: String,
    subImages: [String],
    tags: [String],
    badge: String,

    // 🔥 NAYE FIELDS (Dameeto Wishlist Feature ke liye)
    // Kitne logon ne wishlist kiya uska total number
    wishlistCount: { 
        type: Number, 
        default: 0 
    },
    // Kaun-kaun se users ne wishlist kiya (unka email ya ID store karne ke liye)
    wishlistedBy: [
        { 
            type: String // User ka email store karenge yahan
        }
    ],

}, { timestamps: true });

// Exports the model
module.exports = mongoose.models.Product || mongoose.model("Product", ProductSchema);