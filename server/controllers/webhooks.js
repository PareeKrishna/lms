import { Webhook } from "svix";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

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
        if (!data || !data.id) {
          logger.error("Invalid user.created webhook data - missing id");
          return res.status(400).json({ success: false, message: "Invalid webhook data" });
        }

        if (!data.email_addresses || !Array.isArray(data.email_addresses) || data.email_addresses.length === 0) {
          logger.error("Invalid user.created webhook data - missing email addresses", { userId: data.id });
          return res.status(400).json({ success: false, message: "Email address is required" });
        }

        const firstName = data.first_name || "";
        const lastName = data.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || "User";

        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: fullName,
          imageUrl: data.image_url || "",
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

        res.json({ success: true });
        break;
      }

      case "user.updated": {
        if (!data || !data.id) {
          logger.error("Invalid user.updated webhook data - missing id");
          return res.status(400).json({ success: false, message: "Invalid webhook data" });
        }

        if (!data.email_addresses || !Array.isArray(data.email_addresses) || data.email_addresses.length === 0) {
          logger.error("Invalid user.updated webhook data - missing email addresses", { userId: data.id });
          return res.status(400).json({ success: false, message: "Email address is required" });
        }

        const firstName = data.first_name || "";
        const lastName = data.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || "User";

        const userData = {
          email: data.email_addresses[0].email_address,
          name: fullName,
          imageUrl: data.image_url || "",
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

        res.json({ success: true });
        break;
      }

      case "user.deleted": {
        if (!data || !data.id) {
          logger.error("Invalid user.deleted webhook data - missing id");
          return res.status(400).json({ success: false, message: "Invalid webhook data" });
        }

        logger.debug("Deleting user from database", {
          userId: data.id,
        });

        await User.findByIdAndDelete(data.id);

        logger.info("User deleted successfully via webhook", {
          userId: data.id,
          duration: `${Date.now() - startTime}ms`,
        });

        res.json({ success: true });
        break;
      }
      default:
        logger.warn("Unknown webhook event type received", {
          eventType: type,
          userId: data?.id,
        });
        res.json({ success: true, message: "Event type not handled" });
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

export const stripeWebhooks = async(request,response)=>{
  const startTime = Date.now();
  
  try {
    // Validate Stripe secret key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error("STRIPE_SECRET_KEY is not configured");
      return response.status(500).json({ success: false, message: "Stripe configuration error" });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured");
      return response.status(500).json({ success: false, message: "Stripe webhook secret not configured" });
    }

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];

    if (!sig) {
      logger.warn("Stripe webhook received without signature");
      return response.status(400).json({ success: false, message: "Missing stripe-signature header" });
    }

    let event;

    try {
      event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      logger.info("Stripe webhook event received", { eventType: event.type, eventId: event.id });
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", err);
      return response.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        {
          try {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            
            logger.debug("Processing payment_intent.succeeded", { paymentIntentId });
            
            const session = await stripeInstance.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1
            });

            if (!session.data || session.data.length === 0) {
              logger.error("No checkout session found for payment intent", { paymentIntentId });
              return response.status(400).json({ success: false, message: "Checkout session not found" });
            }

            const { purchaseId } = session.data[0].metadata;
            
            if (!purchaseId) {
              logger.error("Purchase ID missing from session metadata", { paymentIntentId });
              return response.status(400).json({ success: false, message: "Purchase ID not found in metadata" });
            }

            const purchaseData = await Purchase.findById(purchaseId);
            if (!purchaseData) {
              logger.error("Purchase not found in database", { purchaseId });
              return response.status(404).json({ success: false, message: "Purchase not found" });
            }

            const userData = await User.findById(purchaseData.userId);
            if (!userData) {
              logger.error("User not found for purchase", { userId: purchaseData.userId, purchaseId });
              return response.status(404).json({ success: false, message: "User not found" });
            }

            const courseData = await Course.findById(purchaseData.courseId.toString());
            if (!courseData) {
              logger.error("Course not found for purchase", { courseId: purchaseData.courseId, purchaseId });
              return response.status(404).json({ success: false, message: "Course not found" });
            }

            // Check if user is already enrolled
            const isAlreadyEnrolled = courseData.enrolledStudents.some(
              student => student._id.toString() === userData._id.toString()
            );

            if (!isAlreadyEnrolled) {
              courseData.enrolledStudents.push(userData);
              await courseData.save();
              logger.info("User enrolled in course", { userId: userData._id, courseId: courseData._id });
            }

            // Check if course is already in user's enrolled courses
            const isCourseInUserList = userData.enrolledCourses.some(
              courseId => courseId.toString() === courseData._id.toString()
            );

            if (!isCourseInUserList) {
              userData.enrolledCourses.push(courseData._id);
              await userData.save();
            }

            purchaseData.status = 'completed';
            await purchaseData.save();

            logger.info("Payment intent succeeded - enrollment completed", {
              purchaseId,
              userId: userData._id,
              courseId: courseData._id,
              duration: `${Date.now() - startTime}ms`
            });
          } catch (error) {
            logger.error("Error processing payment_intent.succeeded", error, {
              eventId: event.id,
              paymentIntentId: event.data.object?.id
            });
            return response.status(500).json({ success: false, message: "Error processing payment" });
          }
          break;
        }
      case 'payment_intent.payment_failed':
        {
          try {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            
            logger.debug("Processing payment_intent.payment_failed", { paymentIntentId });
            
            const session = await stripeInstance.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1
            });

            if (!session.data || session.data.length === 0) {
              logger.error("No checkout session found for failed payment intent", { paymentIntentId });
              return response.status(400).json({ success: false, message: "Checkout session not found" });
            }

            const { purchaseId } = session.data[0].metadata;
            
            if (!purchaseId) {
              logger.error("Purchase ID missing from session metadata", { paymentIntentId });
              return response.status(400).json({ success: false, message: "Purchase ID not found in metadata" });
            }

            const purchaseData = await Purchase.findById(purchaseId);
            if (!purchaseData) {
              logger.error("Purchase not found in database", { purchaseId });
              return response.status(404).json({ success: false, message: "Purchase not found" });
            }

            purchaseData.status = 'failed';
            await purchaseData.save();

            logger.info("Payment intent failed - status updated", {
              purchaseId,
              duration: `${Date.now() - startTime}ms`
            });
          } catch (error) {
            logger.error("Error processing payment_intent.payment_failed", error, {
              eventId: event.id,
              paymentIntentId: event.data.object?.id
            });
            return response.status(500).json({ success: false, message: "Error processing failed payment" });
          }
          break;
        }
      // ... handle other event types
      default:
        logger.info(`Unhandled Stripe event type`, { eventType: event.type });
        break;
    }

    // Return a response to acknowledge receipt of the event
    response.json({ success: true, received: true });
  } catch (error) {
    logger.error("Unexpected error in Stripe webhook handler", error, {
      duration: `${Date.now() - startTime}ms`
    });
    response.status(500).json({ success: false, message: "Internal server error" });
  }
}