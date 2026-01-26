import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import connectDB from "../configs/mongodb.js";
import logger from "../utils/logger.js";

// Disable body parsing for this route - Vercel will keep it as Buffer
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers for Stripe webhooks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];

  logger.info("Stripe webhook received", {
    hasSignature: !!sig,
    bodyType: typeof req.body,
    isBuffer: Buffer.isBuffer(req.body),
    contentType: req.headers['content-type'],
  });

  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Vercel automatically handles the body as Buffer when bodyParser is disabled
    let rawBody;
    
    if (Buffer.isBuffer(req.body)) {
      // Body is already a Buffer (ideal case)
      rawBody = req.body;
      logger.debug("Body is already a Buffer", { length: rawBody.length });
    } else if (req.body && typeof req.body === 'object') {
      // Body was parsed as JSON, convert back to string
      rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
      logger.warn("Body was parsed as JSON, converting back", { length: rawBody.length });
    } else if (typeof req.body === 'string') {
      // Body is a string
      rawBody = Buffer.from(req.body, 'utf8');
      logger.debug("Body is a string, converting to Buffer", { length: rawBody.length });
    } else {
      // Try to read from stream
      logger.debug("Reading body from stream");
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      rawBody = Buffer.concat(chunks);
      logger.debug("Raw body constructed from stream", { length: rawBody.length });
    }

    event = stripeInstance.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    logger.info("Stripe webhook signature verified", { eventType: event.type });
  } catch (err) {
    logger.error("Stripe webhook verification failed", {
      error: err.message,
      hasSignature: !!sig,
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Connect to database
  try {
    await connectDB();
  } catch (error) {
    logger.error("Database connection failed", error);
    return res.status(500).json({ error: "Database connection failed" });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        
        logger.info("Processing payment_intent.succeeded", { paymentIntentId });
        
        const sessions = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId
        });
        
        if (!sessions.data || sessions.data.length === 0) {
          logger.error("No checkout session found for payment intent", { paymentIntentId });
          return res.status(404).json({ error: "Checkout session not found" });
        }
        
        const { purchaseId } = sessions.data[0].metadata;
        
        if (!purchaseId) {
          logger.error("No purchaseId in session metadata", { paymentIntentId });
          return res.status(400).json({ error: "Purchase ID not found in metadata" });
        }
        
        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          logger.error("Purchase not found", { purchaseId });
          return res.status(404).json({ error: "Purchase not found" });
        }
        
        const userData = await User.findById(purchaseData.userId);
        if (!userData) {
          logger.error("User not found", { userId: purchaseData.userId });
          return res.status(404).json({ error: "User not found" });
        }
        
        const courseData = await Course.findById(purchaseData.courseId.toString());
        if (!courseData) {
          logger.error("Course not found", { courseId: purchaseData.courseId });
          return res.status(404).json({ error: "Course not found" });
        }

        // Check if user is already enrolled
        if (!courseData.enrolledStudents.includes(userData._id)) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
        }

        if (!userData.enrolledCourses.includes(courseData._id)) {
          userData.enrolledCourses.push(courseData._id);
          await userData.save();
        }

        purchaseData.status = 'completed';
        await purchaseData.save();
        
        logger.info("Payment succeeded, purchase completed", { 
          purchaseId,
          userId: userData._id,
          courseId: courseData._id
        });
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        
        logger.info("Processing payment_intent.payment_failed", { paymentIntentId });
        
        const sessions = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId
        });
        
        if (!sessions.data || sessions.data.length === 0) {
          logger.error("No checkout session found for failed payment intent", { paymentIntentId });
          return res.status(404).json({ error: "Checkout session not found" });
        }
        
        const { purchaseId } = sessions.data[0].metadata;
        
        if (!purchaseId) {
          logger.warn("No purchaseId in session metadata for failed payment", { paymentIntentId });
          return res.json({ received: true, message: "No purchase to update" });
        }
        
        const purchaseData = await Purchase.findById(purchaseId);
        if (purchaseData) {
          purchaseData.status = 'failed';
          await purchaseData.save();
          logger.info("Payment failed, purchase marked as failed", { purchaseId });
        } else {
          logger.warn("Purchase not found for failed payment", { purchaseId });
        }
        break;
      }
      
      default:
        logger.debug(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Error processing webhook event", {
      error: error.message,
      stack: error.stack,
      eventType: event?.type
    });
    return res.status(500).json({ error: error.message });
  }
}
