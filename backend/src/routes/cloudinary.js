/**
 * Cloudinary Routes
 * POST /api/cloudinary/sign-upload
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/cloudinary/sign-upload
 * Generate signed Cloudinary upload parameters
 * Frontend uses these to upload directly to Cloudinary
 */
router.post('/sign-upload', verifyToken, async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const { folder, resourceType } = req.body;

    const allowedFolders = [
      'skillproof/profile-photos',
      'skillproof/company-logos',
      'skillproof/task-assets',
      'skillproof/submissions',
      'skillproof/dispute-evidence',
    ];

    const baseFolder = folder?.split('/').slice(0, 2).join('/');
    if (!allowedFolders.includes(baseFolder)) {
      return res.status(400).json({ error: 'Invalid upload folder' });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    return res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (err) {
    console.error('Error signing upload:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
