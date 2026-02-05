# MongoDB Connection Troubleshooting Guide

## Error: `querySrv ECONNREFUSED _mongodb._tcp.cluster0.7wnposz.mongodb.net`

This error indicates that your application cannot resolve the DNS for your MongoDB Atlas cluster. Here's how to fix it:

---

## ✅ Step 1: Check if MongoDB Atlas Cluster is Paused

**Free tier clusters auto-pause after 1 week of inactivity.**

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Sign in to your account
3. Navigate to **Clusters** section
4. Look for your cluster: `cluster0.7wnposz`
5. If you see a **"Resume"** or **"Restore"** button, click it
6. Wait 2-5 minutes for the cluster to resume
7. Try connecting again

---

## ✅ Step 2: Whitelist Your IP Address

MongoDB Atlas blocks connections from IPs that aren't whitelisted.

1. Go to MongoDB Atlas Dashboard
2. Click **Network Access** in the left sidebar
3. Click **Add IP Address** button
4. Choose one of these options:
   - **Option A (Recommended for Development)**: Click **"Allow Access from Anywhere"** and enter `0.0.0.0/0`
   - **Option B (More Secure)**: Click **"Add Current IP Address"** to add only your current IP
5. Click **Confirm**
6. Wait 1-2 minutes for changes to propagate
7. Try connecting again

**Note**: If you're on a dynamic IP (most home networks), you may need to update this when your IP changes.

---

## ✅ Step 3: Verify Your Connection String

Your connection string should look like:
```
mongodb+srv://username:password@cluster0.7wnposz.mongodb.net
```

**Check:**
- ✅ Username and password are correct
- ✅ No extra spaces or special characters
- ✅ Cluster name matches: `cluster0.7wnposz.mongodb.net`

**To get a fresh connection string:**
1. Go to MongoDB Atlas → Clusters
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Update your `.env` file

---

## ✅ Step 4: Test Network Connectivity

### Test DNS Resolution
Open PowerShell/Command Prompt and run:
```powershell
nslookup cluster0.7wnposz.mongodb.net
```

**Expected**: Should return IP addresses
**If it fails**: DNS issue - try:
- Restart your router
- Use a different DNS server (8.8.8.8 or 1.1.1.1)
- Disable VPN if active

### Test Connection
Try connecting directly:
```powershell
ping cluster0.7wnposz.mongodb.net
```

---

## ✅ Step 5: Check Firewall/Antivirus

Sometimes firewalls or antivirus software block MongoDB connections.

1. **Temporarily disable** your firewall/antivirus
2. Try connecting again
3. If it works, add MongoDB to your firewall exceptions:
   - Allow outbound connections on port **27017** (MongoDB default)
   - Allow DNS queries

---

## ✅ Step 6: Check VPN/Proxy

If you're using a VPN or proxy:

1. **Disconnect VPN** temporarily
2. Try connecting again
3. If it works, you may need to:
   - Whitelist MongoDB Atlas IPs in your VPN
   - Or connect without VPN for MongoDB access

---

## ✅ Step 7: Verify Environment Variables

Make sure your `.env` file is being loaded:

1. Check that `.env` file exists in `server/` directory
2. Verify `MONGODB_URI` is set correctly
3. Make sure there are **no spaces** around the `=` sign:
   ```env
   MONGODB_URI='mongodb+srv://...'  ✅ Correct
   MONGODB_URI = 'mongodb+srv://...'  ❌ Wrong (spaces)
   ```

4. Restart your server after changing `.env`

---

## ✅ Step 8: Test Connection Manually

Create a test script to verify connection:

```javascript
// test-mongodb.js
import mongoose from 'mongoose';
import 'dotenv/config';

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(`${process.env.MONGODB_URI}/lms`, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ Connected successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();
```

Run it:
```bash
node test-mongodb.js
```

---

## 🔍 Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| `querySrv ECONNREFUSED` | Cluster paused or DNS issue - Resume cluster, check network |
| `MongoServerError: bad auth` | Wrong username/password - Check credentials |
| `MongoServerError: IP not whitelisted` | Add your IP to Network Access |
| `ETIMEDOUT` | Network/firewall blocking - Check firewall settings |
| `ENOTFOUND` | DNS resolution failed - Check internet connection |

---

## 🚀 Quick Fix Checklist

- [ ] MongoDB Atlas cluster is **resumed** (not paused)
- [ ] Your IP address is **whitelisted** in Network Access
- [ ] Connection string is **correct** in `.env` file
- [ ] No **spaces** around `=` in `.env` file
- [ ] **Restarted** server after changing `.env`
- [ ] **Internet connection** is working
- [ ] **VPN/Proxy** is disabled (if applicable)
- [ ] **Firewall** allows MongoDB connections

---

## 📞 Still Not Working?

1. **Check MongoDB Atlas Status**: [status.mongodb.com](https://status.mongodb.com/)
2. **MongoDB Atlas Logs**: Check your Atlas dashboard for connection logs
3. **Try a different network**: Test from mobile hotspot to rule out ISP issues
4. **Contact MongoDB Support**: If you have a paid plan

---

## 💡 Prevention Tips

1. **Keep cluster active**: Free tier pauses after 1 week - access it regularly
2. **Use IP whitelist**: More secure than allowing all IPs
3. **Monitor connections**: Check Atlas dashboard for connection issues
4. **Use connection pooling**: Already configured in your code

---

**Last Updated**: February 2, 2026
