# Stripe Webhook Setup Guide for Vercel

## Problem
You're getting a 404 error: "The deployment could not be found on Vercel" when Stripe tries to send webhook events after payment completion.

## Root Cause
The webhook endpoint URL configured in your Stripe dashboard is incorrect or pointing to a non-existent Vercel deployment.

## Solution

### Step 1: Deploy Your Application to Vercel
1. Make sure your code is pushed to your Git repository
2. Deploy to Vercel (if not already deployed)
3. Note your production URL (e.g., `https://your-app.vercel.app`)

### Step 2: Update Stripe Webhook URL

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to: **Developers** → **Webhooks**
3. Find your existing webhook endpoint (the one showing 404 errors)
4. Click on it to edit, OR click **"Add endpoint"** to create a new one

5. Set the **Endpoint URL** to:
   ```
   https://your-app.vercel.app/api/stripe
   ```
   
   Replace `your-app.vercel.app` with your actual Vercel deployment URL.

6. Select events to listen to:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

7. Click **"Add endpoint"** or **"Update endpoint"**

### Step 3: Update Environment Variables

1. Copy the **Signing secret** from your webhook endpoint (starts with `whsec_`)
2. Add it to your Vercel environment variables:
   - Go to your Vercel project dashboard
   - Navigate to: **Settings** → **Environment Variables**
   - Add/Update: `STRIPE_WEBHOOK_SECRET` with the signing secret value
   - Make sure it's available for all environments (Production, Preview, Development)

3. Ensure these other Stripe variables are also set:
   - `STRIPE_SECRET_KEY` (your Stripe secret key, starts with `sk_`)
   - `STRIPE_PUBLISHABLE_KEY` (your Stripe publishable key, starts with `pk_`)

4. **Redeploy** your application after adding environment variables

### Step 4: Test the Webhook

#### Option A: Use Stripe CLI (Local Testing)
```bash
# Install Stripe CLI
# Windows (using Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to your Vercel deployment
stripe listen --forward-to https://your-app.vercel.app/api/stripe
```

#### Option B: Send Test Event from Stripe Dashboard
1. Go to your webhook endpoint in Stripe Dashboard
2. Click **"Send test webhook"**
3. Select `payment_intent.succeeded`
4. Click **"Send test webhook"**
5. Check the response - it should return `200 OK`

### Step 5: Verify Setup

1. Make a test payment through your application
2. Check the Stripe webhook logs in your dashboard
3. Verify the webhook was delivered successfully (200 status)
4. Confirm the purchase was marked as completed in your database

## Common Issues

### Issue: Still getting 404 errors
**Solution:** 
- Verify the Vercel deployment URL is correct (no typos)
- Make sure you're using `/api/stripe` (not `/stripe`)
- Check that the `server/api/stripe.js` file exists in your repository
- Redeploy your Vercel application

### Issue: Webhook signature verification failed
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` is correctly set in Vercel
- Make sure you copied the signing secret from the CORRECT webhook endpoint
- Each webhook endpoint has its own unique signing secret
- Redeploy after updating environment variables

### Issue: Database connection failed
**Solution:**
- Ensure `MONGODB_URI` is set in Vercel environment variables
- Verify your MongoDB Atlas allows connections from Vercel IPs (0.0.0.0/0)
- Check MongoDB connection string is valid

## Vercel Deployment Checklist

✅ Code pushed to Git repository
✅ Vercel project connected to repository
✅ `server/vercel.json` configuration exists
✅ Environment variables configured in Vercel:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY`
   - `MONGODB_URI`
   - `CLERK_WEBHOOK_SECRET`
   - Any other required env vars
✅ Application deployed successfully
✅ Stripe webhook URL updated to Vercel deployment URL
✅ Webhook tested and returning 200 OK

## Quick Commands

### Check Vercel deployment URL
```bash
# Navigate to server directory
cd D:\lms\server

# Deploy to Vercel (if using Vercel CLI)
vercel --prod

# Or check in Vercel dashboard
# https://vercel.com/dashboard
```

### Test webhook locally
```bash
# Using Stripe CLI
stripe listen --forward-to http://localhost:5000/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

## Need Help?

If you're still experiencing issues:
1. Check Vercel deployment logs for errors
2. Check Stripe webhook delivery logs
3. Verify all environment variables are set correctly
4. Ensure your MongoDB is accessible from Vercel
