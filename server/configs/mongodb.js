import mongoose from 'mongoose';
import dns from 'dns';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    // Configure DNS servers to use Google DNS (fixes DNS resolution issues)
    // This ensures Node.js uses reliable DNS servers for MongoDB Atlas connections
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    logger.debug("DNS servers configured", { servers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'] });

    // Get and clean the MongoDB URI
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    // Trim any whitespace
    mongoUri = mongoUri.trim();

    // Ensure database name is included
    if (!mongoUri.includes('/lms') && !mongoUri.includes('?')) {
      mongoUri = mongoUri.endsWith('/') ? `${mongoUri}lms` : `${mongoUri}/lms`;
    }

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

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds instead of 30
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      retryWrites: true,
      retryReads: true,
    });

    logger.debug("MongoDB connection established", {
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    let helpfulMessage = "Failed to connect to MongoDB";

    // Provide specific guidance based on error type
    if (error.message && error.message.includes('ECONNREFUSED')) {
      helpfulMessage += "\n\n🔴 DNS Resolution Failed - Possible causes:\n";
      helpfulMessage += "   1. MongoDB Atlas cluster is PAUSED (most common)\n";
      helpfulMessage += "      → Go to https://cloud.mongodb.com/ and RESUME your cluster\n";
      helpfulMessage += "   2. Your IP address is not WHITELISTED\n";
      helpfulMessage += "      → MongoDB Atlas → Network Access → Add IP Address\n";
      helpfulMessage += "   3. Internet connection or DNS issue\n";
      helpfulMessage += "      → Check your internet connection\n";
      helpfulMessage += "      → Try disabling VPN if active\n";
    } else if (error.message && error.message.includes('authentication')) {
      helpfulMessage += "\n\n🔴 Authentication Failed:\n";
      helpfulMessage += "   → Check username and password in MONGODB_URI\n";
      helpfulMessage += "   → Verify database user exists in MongoDB Atlas\n";
    } else if (error.message && error.message.includes('ENOTFOUND')) {
      helpfulMessage += "\n\n🔴 Hostname Not Found:\n";
      helpfulMessage += "   → Check internet connection\n";
      helpfulMessage += "   → MongoDB Atlas cluster might be deleted\n";
      helpfulMessage += "   → Verify cluster name in connection string\n";
    }

    logger.error(helpfulMessage, error, {
      database: "lms",
      errorName: error.name,
      errorMessage: error.message,
    });

    console.error("\n" + "=".repeat(60));
    console.error(helpfulMessage);
    console.error("=".repeat(60) + "\n");

    throw error;
  }
};

export default connectDB;