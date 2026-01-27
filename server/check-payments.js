import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { Purchase } from "./models/Purchase.js";
import User from "./models/User.js";
import Course from "./models/Course.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkPayments() {
  try {
    console.log("🔍 Connecting to database...");
    await connectDB();
    console.log("✅ Connected to database\n");

    // Get all purchases from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentPurchases = await Purchase.find({
      createdAt: { $gte: yesterday }
    })
      .populate("courseId", "courseTitle coursePrice")
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📊 Found ${recentPurchases.length} recent purchases (last 24h):\n`);

    if (recentPurchases.length === 0) {
      console.log("❌ No recent purchases found. Try making a test payment first.\n");
      
      // Show total purchases
      const totalPurchases = await Purchase.countDocuments();
      console.log(`Total purchases in database: ${totalPurchases}\n`);
      
      if (totalPurchases > 0) {
        console.log("📋 Showing latest 5 purchases:\n");
        const latestPurchases = await Purchase.find()
          .populate("courseId", "courseTitle coursePrice")
          .sort({ createdAt: -1 })
          .limit(5);
        
        latestPurchases.forEach((purchase, index) => {
          console.log(`${index + 1}. Purchase ID: ${purchase._id}`);
          console.log(`   Course: ${purchase.courseId?.courseTitle || 'N/A'}`);
          console.log(`   User ID: ${purchase.userId}`);
          console.log(`   Amount: $${purchase.amount}`);
          console.log(`   Status: ${purchase.status}`);
          console.log(`   Created: ${purchase.createdAt}`);
          console.log("");
        });
      }
    } else {
      for (let i = 0; i < recentPurchases.length; i++) {
        const purchase = recentPurchases[i];
        console.log(`${i + 1}. Purchase ID: ${purchase._id}`);
        console.log(`   Course: ${purchase.courseId?.courseTitle || 'N/A'}`);
        console.log(`   User ID: ${purchase.userId}`);
        console.log(`   Amount: $${purchase.amount}`);
        console.log(`   Status: ${purchase.status}`);
        console.log(`   Created: ${purchase.createdAt}`);

        // Try to find the Stripe session
        try {
          console.log(`   🔍 Checking Stripe for this purchase...`);
          
          // Search for checkout sessions with this purchaseId
          const sessions = await stripeInstance.checkout.sessions.list({
            limit: 100,
          });

          const matchingSession = sessions.data.find(
            (s) => s.metadata?.purchaseId === purchase._id.toString()
          );

          if (matchingSession) {
            console.log(`   ✅ Found Stripe session: ${matchingSession.id}`);
            console.log(`   Payment status: ${matchingSession.payment_status}`);
            console.log(`   Payment intent: ${matchingSession.payment_intent || 'N/A'}`);
            
            if (matchingSession.payment_intent) {
              const paymentIntent = await stripeInstance.paymentIntents.retrieve(
                matchingSession.payment_intent
              );
              console.log(`   Payment intent status: ${paymentIntent.status}`);
            }
          } else {
            console.log(`   ⚠️  No Stripe session found for this purchase`);
          }
        } catch (error) {
          console.log(`   ❌ Error checking Stripe: ${error.message}`);
        }
        console.log("");
      }
    }

    // Check webhook events from Stripe
    console.log("📡 Checking recent Stripe webhook events...\n");
    try {
      const events = await stripeInstance.events.list({
        limit: 10,
        types: ["payment_intent.succeeded", "payment_intent.payment_failed"],
      });

      console.log(`Found ${events.data.length} recent payment events:\n`);
      events.data.forEach((event, index) => {
        console.log(`${index + 1}. Event: ${event.type}`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
        console.log(`   Payment Intent: ${event.data.object.id}`);
        console.log(`   Amount: $${(event.data.object.amount / 100).toFixed(2)}`);
        console.log("");
      });
    } catch (error) {
      console.log(`❌ Error fetching webhook events: ${error.message}\n`);
    }

    // Check user enrollments
    console.log("👥 Checking user enrollments...\n");
    const users = await User.find({ enrolledCourses: { $exists: true, $ne: [] } })
      .limit(5)
      .populate("enrolledCourses", "courseTitle");

    if (users.length > 0) {
      console.log(`Found ${users.length} users with enrollments:\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. User: ${user.name} (${user._id})`);
        console.log(`   Enrolled courses: ${user.enrolledCourses.length}`);
        user.enrolledCourses.forEach((course) => {
          console.log(`   - ${course.courseTitle}`);
        });
        console.log("");
      });
    } else {
      console.log("❌ No users with enrollments found\n");
    }

    console.log("✅ Check complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPayments();
