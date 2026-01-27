import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { Purchase } from "./models/Purchase.js";
import User from "./models/User.js";
import Course from "./models/Course.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixPendingPayments() {
  try {
    console.log("🔍 Connecting to database...");
    await connectDB();
    console.log("✅ Connected to database\n");

    // Find all pending purchases
    const pendingPurchases = await Purchase.find({ status: "pending" })
      .populate("courseId", "courseTitle")
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${pendingPurchases.length} pending purchases\n`);

    if (pendingPurchases.length === 0) {
      console.log("✅ No pending purchases to process!");
      process.exit(0);
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const purchase of pendingPurchases) {
      console.log(`\n📦 Processing Purchase ID: ${purchase._id}`);
      console.log(`   Course: ${purchase.courseId?.courseTitle || "N/A"}`);
      console.log(`   User ID: ${purchase.userId}`);
      console.log(`   Amount: $${purchase.amount}`);
      console.log(`   Status: ${purchase.status}`);

      try {
        // Find the Stripe session for this purchase
        const sessions = await stripeInstance.checkout.sessions.list({
          limit: 100,
        });

        const matchingSession = sessions.data.find(
          (s) => s.metadata?.purchaseId === purchase._id.toString()
        );

        if (!matchingSession) {
          console.log(`   ⚠️  No Stripe session found - skipping`);
          skipped++;
          continue;
        }

        console.log(`   ✅ Found Stripe session: ${matchingSession.id}`);
        console.log(`   Payment status: ${matchingSession.payment_status}`);

        // Check if payment was successful
        if (matchingSession.payment_status !== "paid") {
          console.log(`   ⚠️  Payment not completed - skipping`);
          skipped++;
          continue;
        }

        // Verify payment intent status
        if (matchingSession.payment_intent) {
          const paymentIntent = await stripeInstance.paymentIntents.retrieve(
            matchingSession.payment_intent
          );
          
          console.log(`   Payment intent status: ${paymentIntent.status}`);

          if (paymentIntent.status !== "succeeded") {
            console.log(`   ⚠️  Payment intent not succeeded - skipping`);
            skipped++;
            continue;
          }
        }

        // Payment was successful, now enroll the user
        console.log(`   💰 Payment was successful! Enrolling user...`);

        const userData = await User.findById(purchase.userId);
        if (!userData) {
          console.log(`   ❌ User not found - skipping`);
          failed++;
          continue;
        }

        const courseData = await Course.findById(purchase.courseId.toString());
        if (!courseData) {
          console.log(`   ❌ Course not found - skipping`);
          failed++;
          continue;
        }

        // Check if user is already enrolled
        const isAlreadyEnrolledInCourse = courseData.enrolledStudents.some(
          (studentId) => studentId.toString() === userData._id.toString()
        );
        const isAlreadyInUserCourses = userData.enrolledCourses.some(
          (courseId) => courseId.toString() === courseData._id.toString()
        );

        if (!isAlreadyEnrolledInCourse) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
          console.log(`   ✅ Added user to course enrolledStudents`);
        } else {
          console.log(`   ℹ️  User already in course enrolledStudents`);
        }

        if (!isAlreadyInUserCourses) {
          userData.enrolledCourses.push(courseData._id);
          await userData.save();
          console.log(`   ✅ Added course to user enrolledCourses`);
        } else {
          console.log(`   ℹ️  Course already in user enrolledCourses`);
        }

        // Update purchase status
        purchase.status = "completed";
        await purchase.save();
        console.log(`   ✅ Purchase marked as completed`);

        processed++;
        console.log(`   🎉 Successfully processed!`);
      } catch (error) {
        console.log(`   ❌ Error processing: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n\n📈 Summary:`);
    console.log(`   ✅ Successfully processed: ${processed}`);
    console.log(`   ⚠️  Skipped (not paid): ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${pendingPurchases.length}`);

    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixPendingPayments();
