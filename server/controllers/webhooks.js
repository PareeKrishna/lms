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

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
export const stripeWebhooks = async (request, response) => {
  const sig = request.headers['stripe-signature'];

  logger.debug("Stripe webhook received", {
    hasSignature: !!sig,
    bodyType: typeof request.body,
    isBuffer: Buffer.isBuffer(request.body),
    bodyLength: request.body?.length
  });

  let event;

  try {
    if (!Buffer.isBuffer(request.body)) {
      logger.error("Stripe webhook body is not a Buffer", {
        bodyType: typeof request.body,
        bodyConstructor: request.body?.constructor?.name
      });
      return response.status(400).json({
        success: false,
        message: "Webhook payload must be provided as a Buffer"
      });
    }

    event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    logger.info("Stripe webhook signature verified", { eventType: event.type });
  }
  catch (err) {
    logger.error("Stripe webhook verification failed", err);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const sessions = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      });
      if (!sessions.data?.length || !sessions.data[0].metadata?.purchaseId) {
        logger.warn("Stripe webhook: no session or purchaseId", { paymentIntentId });
        break;
      }
      const { purchaseId } = sessions.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      if (!purchaseData) {
        logger.warn("Stripe webhook: purchase not found", { purchaseId });
        break;
      }
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId.toString());
      if (!userData || !courseData) {
        logger.warn("Stripe webhook: user or course not found", { userId: purchaseData.userId, courseId: purchaseData.courseId });
        break;
      }

      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }
      if (!userData.enrolledCourses.some(id => id.toString() === courseData._id.toString())) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = 'completed';
      await purchaseData.save();
      logger.info("Stripe: enrollment completed", { purchaseId, userId: userData._id, courseId: courseData._id });
      break;
    }
    case 'payment_intent.payment_failed': {

      const paymentIntent = event.data.object;
      //console.log('PaymentIntent was successful!');
      const paymentIntentId = paymentIntent.id;
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      })
      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      purchaseData.status = 'failed'
      await purchaseData.save();
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({ received: true });
}