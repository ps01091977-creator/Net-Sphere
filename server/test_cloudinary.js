require("dotenv").config();

console.log("Loaded process.env.CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("Loaded process.env.CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "Yes (length: " + process.env.CLOUDINARY_API_SECRET.length + ")" : "No");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const config = cloudinary.config();
console.log("Cloudinary Config keys returned by config():", Object.keys(config));
console.log("Cloudinary cloud_name:", config.cloud_name);
console.log("Cloudinary api_key:", config.api_key);
console.log("Cloudinary api_secret:", config.api_secret ? "Yes" : "No");
