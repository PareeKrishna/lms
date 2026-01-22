import { clerkClient } from "@clerk/express";
import logger from "../utils/logger.js";

// Middleware (Protect Educator Routes)

export const protectEducator = async (req, res, next) => {
  try {
    // Safely get userId from auth, handling cases where auth might fail
    let userId;
    try {
      const authResult = req.auth();
      userId = authResult?.userId;
    } catch (authError) {
      logger.warn("Authentication failed in protectEducator", {
        error: authError.message,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required. Please sign in." 
      });
    }

    // Validate userId exists before making API call
    if (!userId) {
      logger.warn("Missing userId in protectEducator", {
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required. Please sign in." 
      });
    }
    
    logger.debug("Checking educator authorization", {
      userId,
      path: req.path,
      method: req.method,
    });

    const response = await clerkClient.users.getUser(userId);
    const userRole = response.publicMetadata?.role;

    logger.debug("User role retrieved", {
      userId,
      role: userRole,
    });

    if (userRole !== "educator") {
      logger.warn("Unauthorized access attempt to educator route", {
        userId,
        role: userRole,
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized access. Educator role required." 
      });
    }

    logger.info("Educator authorization successful", {
      userId,
      path: req.path,
    });

    next();
  } catch (error) {
    // Handle Clerk API errors specifically
    if (error.message && error.message.includes("valid resource ID")) {
      logger.error("Invalid userId provided to Clerk API", error, {
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({ 
        success: false, 
        message: "Invalid authentication. Please sign in again." 
      });
    }

    logger.error("Error in protectEducator middleware", error, {
      path: req.path,
      method: req.method,
      userId: 'unknown',
    });
    res.status(500).json({ 
      success: false, 
      message: "Internal server error during authorization" 
    });
  }
};
