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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];

  logger.debug("Stripe webhook received", {
    hasSignature: !!sig,
    bodyType: typeof req.body,
    isBuffer: Buffer.isBuffer(req.body),
  });

  let event;

  try {
    // Read the raw body as Buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    logger.debug("Raw body constructed", {
      isBuffer: Buffer.isBuffer(rawBody),
      length: rawBody.length
    });

    event = stripeInstance.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    logger.info("Stripe webhook signature verified", { eventType: event.type });
  } catch (err) {
    logger.error("Stripe webhook verification failed", err);
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
        
        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId
        });
        
        const { purchaseId } = session.data[0].metadata;
        const purchaseData = await Purchase.findById(purchaseId);
        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId.toString());

        courseData.enrolledStudents.push(userData);
        await courseData.save();

        userData.enrolledCourses.push(courseData._id);
        await userData.save();

        purchaseData.status = 'completed';
        await purchaseData.save();
        
        logger.info("Payment succeeded, purchase completed", { purchaseId });
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        
        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId
        });
        
        const { purchaseId } = session.data[0].metadata;
        const purchaseData = await Purchase.findById(purchaseId);
        purchaseData.status = 'failed';
        await purchaseData.save();
        
        logger.info("Payment failed, purchase marked as failed", { purchaseId });
        break;
      }
      
      default:
        logger.debug(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error("Error processing webhook event", error);
    return res.status(500).json({ error: error.message });
  }
}
