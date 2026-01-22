import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

const connectCloudinary = async () => {
  try {
    logger.debug("Configuring Cloudinary", {
      cloudName: process.env.CLOUDINARY_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_SECRET_KEY,
    });

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY,
    });

    // Test connection by getting account details
    try {
      const result = await cloudinary.api.ping();
      logger.info("Cloudinary connection verified", {
        cloudName: process.env.CLOUDINARY_NAME,
        status: result.status,
      });
    } catch (pingError) {
      logger.warn("Cloudinary ping failed, but configuration may still be valid", pingError, {
        cloudName: process.env.CLOUDINARY_NAME,
      });
    }
  } catch (error) {
    logger.error("Failed to configure Cloudinary", error);
    throw error;
  }
};

export default connectCloudinary;