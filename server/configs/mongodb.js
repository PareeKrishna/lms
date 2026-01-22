import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const mongoUri = `${process.env.MONGODB_URI}/lms`;
    
    logger.info("Attempting to connect to MongoDB", {
      database: "lms",
      uri: mongoUri.replace(/\/\/.*@/, "//***:***@"), // Mask credentials in logs
    });

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info("MongoDB connected successfully", {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      });
    });

    mongoose.connection.on('error', (error) => {
      logger.error("MongoDB connection error", error, {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn("MongoDB disconnected", {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      });
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed due to application termination");
      process.exit(0);
    });

    await mongoose.connect(mongoUri);
    
    logger.debug("MongoDB connection established", {
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB", error, {
      database: "lms",
    });
    throw error;
  }
};

export default connectDB;