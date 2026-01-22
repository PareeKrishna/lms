import { Webhook } from "svix";
import User from "../models/User.js";
import logger from "../utils/logger.js";

//API Controller Function to Manage Clerk User with Database

export const clerkWebhooks = async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info("Clerk webhook received", {
      hasBody: !!req.body,
      headers: {
        svixId: req.headers["svix-id"],
        svixTimestamp: req.headers["svix-timestamp"],
        hasSignature: !!req.headers["svix-signature"],
      },
    });

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    
    logger.debug("Verifying webhook signature");
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    logger.debug("Webhook signature verified successfully");

    const { data, type } = req.body;

    logger.info("Processing webhook event", {
      eventType: type,
      userId: data?.id,
    });

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };

        logger.debug("Creating new user in database", {
          userId: userData._id,
          email: userData.email,
        });

        await User.create(userData);

        logger.info("User created successfully via webhook", {
          userId: userData._id,
          email: userData.email,
          duration: `${Date.now() - startTime}ms`,
        });

        res.json({});
        break;
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };

        logger.debug("Updating user in database", {
          userId: data.id,
          email: userData.email,
        });

        await User.findByIdAndUpdate(data.id, userData);

        logger.info("User updated successfully via webhook", {
          userId: data.id,
          email: userData.email,
          duration: `${Date.now() - startTime}ms`,
        });

        res.json({});
        break;
      }

      case "user.deleted": {
        logger.debug("Deleting user from database", {
          userId: data.id,
        });

        await User.findByIdAndDelete(data.id);

        logger.info("User deleted successfully via webhook", {
          userId: data.id,
          duration: `${Date.now() - startTime}ms`,
        });

        res.json({});
        break;
      }
      default:
        logger.warn("Unknown webhook event type received", {
          eventType: type,
          userId: data?.id,
        });
        break;
    }
  } catch (error) {
    logger.error("Error processing Clerk webhook", error, {
      duration: `${Date.now() - startTime}ms`,
      eventType: req.body?.type,
      userId: req.body?.data?.id,
    });
    res.json({ success: false, message: error.message });
  }
};
