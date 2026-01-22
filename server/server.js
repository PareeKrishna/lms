import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import logger from "./utils/logger.js";

//initialize express
const app = express(); 

logger.info("Initializing server", {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.port || 5000,
});

//connect to database
try {
  logger.info("Connecting to MongoDB...");
  await connectDB();
} catch (error) {
  logger.error("Failed to connect to MongoDB", error);
  process.exit(1);
}

//connect to Cloudinary
try {
  logger.info("Connecting to Cloudinary...");
  await connectCloudinary();
  logger.info("Cloudinary connected successfully");
} catch (error) {
  logger.error("Failed to connect to Cloudinary", error);
  process.exit(1);
}

//middlewares
app.use(cors());
logger.debug("CORS middleware enabled");

// Body parsing middleware (must come before Clerk middleware)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
logger.debug("Body parsing middleware enabled");

// Validate and sanitize Authorization header before Clerk processes it
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Log whether Authorization header is present (for debugging)
  if (!authHeader && (req.url.includes('/api/educator') || req.url.includes('/api/'))) {
    logger.warn("Missing Authorization header in protected route", {
      method: req.method,
      url: req.url,
      allHeaders: Object.keys(req.headers),
    });
  }
  
  if (authHeader) {
    // Check for invalid characters that might cause parsing errors
    // Remove any BOM or non-ASCII characters that shouldn't be in a JWT
    const sanitized = authHeader.replace(/[\uFEFF\u200B-\u200D\u2060]/g, '').trim();
    
    // Validate it looks like a Bearer token
    if (!sanitized.startsWith('Bearer ')) {
      logger.warn("Invalid Authorization header format", {
        method: req.method,
        url: req.url,
        headerPrefix: authHeader.substring(0, 20),
      });
      req.headers.authorization = null; // Remove invalid header
    } else if (sanitized !== authHeader) {
      logger.debug("Sanitized Authorization header", {
        method: req.method,
        url: req.url,
      });
      req.headers.authorization = sanitized;
    } else {
      logger.debug("Valid Authorization header present", {
        method: req.method,
        url: req.url,
        hasToken: authHeader.length > 7,
      });
    }
  }
  
  next();
});

// Clerk middleware with comprehensive error handling
// This wrapper catches both synchronous and asynchronous errors from Clerk
app.use((req, res, next) => {
  try {
    const clerkMw = clerkMiddleware();
    
    // Execute Clerk middleware and catch any errors passed to callback
    clerkMw(req, res, (err) => {
      if (err) {
        // Handle JWT parsing errors specifically
        if (err.name === 'SyntaxError' && err.message.includes('Invalid character')) {
          logger.warn("Clerk JWT parsing error - invalid token format (caught in callback)", {
            method: req.method,
            url: req.url,
            errorMessage: err.message,
          });
          // Set req.auth to return null userId (not throw) so routes can check gracefully
          req.auth = () => ({ userId: null });
        } else {
          logger.warn("Clerk middleware error (caught in callback)", err, {
            method: req.method,
            url: req.url,
          });
          req.auth = () => ({ userId: null });
        }
      }
      // Continue to next middleware (routes will handle auth requirements)
      next();
    });
  } catch (err) {
    // Catch synchronous errors thrown by Clerk middleware
    if (err.name === 'SyntaxError' && err.message.includes('Invalid character')) {
      logger.warn("Clerk JWT parsing error - invalid token format (caught synchronously)", {
        method: req.method,
        url: req.url,
        errorMessage: err.message,
      });
      // Set req.auth to return null userId (not throw) so routes can check gracefully
      req.auth = () => ({ userId: null });
    } else {
      logger.warn("Clerk middleware error (caught synchronously)", err, {
        method: req.method,
        url: req.url,
      });
      req.auth = () => ({ userId: null });
    }
    // Continue to next middleware even if Clerk fails
    next();
  }
});
logger.debug("Clerk middleware enabled with comprehensive error handling");

// Request logging middleware
app.use(logger.request);

//routes
app.get("/", (req, res) => {
  logger.debug("Health check endpoint accessed");
  res.send("API working");
});

// Test authentication endpoint (no role required)
app.get("/api/test-auth", (req, res) => {
  try {
    const authResult = req.auth();
    const userId = authResult?.userId;
    
    if (userId) {
      logger.info("Authentication test successful", { userId });
      res.json({ 
        success: true, 
        message: "Authentication working!",
        userId: userId,
        authenticated: true
      });
    } else {
      logger.warn("Authentication test - no userId");
      res.status(401).json({ 
        success: false, 
        message: "Not authenticated - no userId found",
        authenticated: false
      });
    }
  } catch (error) {
    logger.error("Authentication test failed", error);
    res.status(401).json({ 
      success: false, 
      message: "Authentication failed: " + error.message,
      authenticated: false
    });
  }
});

app.post("/clerk", express.json(), (req, res, next) => {
  logger.debug("Clerk webhook endpoint accessed");
  next();
}, clerkWebhooks);

app.use('/api/educator', (req, res, next) => {
  logger.debug("Educator routes accessed", { path: req.path });
  next();
}, educatorRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  // Handle Clerk authentication errors specifically
  if (err.name === 'SyntaxError' && err.message.includes('Invalid character')) {
    logger.error("Clerk JWT parsing error - invalid token format", err, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      authHeader: req.headers.authorization ? 'present' : 'missing',
    });
    return res.status(401).json({ 
      success: false, 
      message: "Invalid authentication token. Please sign in again." 
    });
  }

  // Handle other Clerk-related errors
  if (err.message && err.message.includes('clerk')) {
    logger.error("Clerk authentication error", err, {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    return res.status(401).json({ 
      success: false, 
      message: "Authentication failed. Please sign in again." 
    });
  }

  // Handle all other errors
  logger.error("Unhandled error in Express middleware", err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  res.status(500).json({ success: false, message: "Internal server error" });
});

//port
const PORT = process.env.port || 5000;

app.listen(PORT, () => {
  logger.info("Server started successfully", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
