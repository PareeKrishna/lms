# How to Add Environment Variables to Vercel Backend - Simple Guide

## Step-by-Step Process

### Step 1: Go to Your Vercel Dashboard
1. Open your web browser
2. Go to [vercel.com](https://vercel.com)
3. Sign in to your account
4. Find and click on your project (the one with your backend)

### Step 2: Open Project Settings
1. Once you're in your project, look at the top menu
2. Click on the **"Settings"** tab
3. In the left sidebar, click on **"Environment Variables"**

### Step 3: Add Each Environment Variable
For each variable from your `.env` file, follow these steps:

1. Click the **"Add New"** button (or "Add" button)
2. In the **"Key"** field, type the variable name (e.g., `MONGODB_URI`)
3. In the **"Value"** field, paste the value from your `.env` file
4. Select which environments to use it in:
   - ✅ **Production** (for live app)
   - ✅ **Preview** (for test deployments)
   - ✅ **Development** (for local development)
5. Click **"Save"**

### Step 4: Add All Your Variables
Repeat Step 3 for each of these variables (copy from your `.env` file):

- `MONGODB_URI`
- `CLERK_WEBHOOK_SECRET`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CURRENCY`
- `NODE_ENV` (optional, Vercel sets this automatically)
- `port` (optional, Vercel sets this automatically)

### Step 5: Redeploy Your App
1. After adding all variables, go back to the **"Deployments"** tab
2. Find your latest deployment
3. Click the **"..."** (three dots) menu
4. Click **"Redeploy"**
5. Confirm the redeploy

**OR** simply push a new commit to trigger a new deployment:
```bash
git add .
git commit -m "Update environment variables"
git push
```

### Step 6: Verify It Works
1. Wait for the deployment to finish
2. Check the deployment logs to make sure there are no errors
3. Test your API endpoints to confirm everything works

---

## Quick Tips

✅ **Keep it secret**: Never commit your `.env` file to GitHub. It should be in `.gitignore` (which it already is).

✅ **Use the same names**: Make sure the variable names in Vercel match exactly what you use in your code (e.g., `MONGODB_URI` not `MONGODB_URI_2`).

✅ **Select all environments**: For most variables, check all three boxes (Production, Preview, Development) so they work everywhere.

✅ **Double-check values**: Copy-paste carefully to avoid typos, especially for long keys and secrets.

---

## What Happens Behind the Scenes?

When you add environment variables in Vercel:
- They are securely stored in Vercel's system
- They are automatically injected into your app when it runs
- Your code can access them using `process.env.VARIABLE_NAME` (just like locally)
- They are kept secret and never exposed in your code

---

## Troubleshooting

**Problem**: App still can't find environment variables
- **Solution**: Make sure you redeployed after adding the variables

**Problem**: Some variables work but others don't
- **Solution**: Check that variable names match exactly (case-sensitive!)

**Problem**: Variables work locally but not on Vercel
- **Solution**: Make sure you added them in Vercel dashboard and redeployed

---

## Your Current Environment Variables (from .env file)

Based on your `.env` file, you need to add these to Vercel:

1. `CURRENCY` = 'USD'
2. `MONGODB_URI` = 'mongodb+srv://...'
3. `CLERK_WEBHOOK_SECRET` = 'whsec_...'
4. `CLERK_PUBLISHABLE_KEY` = 'pk_test_...'
5. `CLERK_SECRET_KEY` = 'sk_test_...'
6. `CLOUDINARY_NAME` = "dd6hbo3ul"
7. `CLOUDINARY_API_KEY` = "586898592321661"
8. `CLOUDINARY_SECRET_KEY` = "8phTfiYp67uzhtOqYkJT6sTvkrw"
9. `STRIPE_PUBLISHABLE_KEY` = 'pk_test_...'
10. `STRIPE_SECRET_KEY` = 'sk_test_...'
11. `STRIPE_WEBHOOK_SECRET` = "whsec_..."

---

That's it! Your environment variables are now set up in Vercel. 🎉
