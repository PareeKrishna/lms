
# 🔴 Fix DNS Resolution Issue

## Problem:
Your DNS server (`192.168.59.72`) cannot resolve MongoDB Atlas hostnames. This is blocking your MongoDB connection.

**Error:** `querySrv ECONNREFUSED _mongodb._tcp.cluster0.7wnposz.mongodb.net`

## ✅ What's Already Working:
- ✅ MongoDB Atlas cluster is ACTIVE
- ✅ IP whitelist is set (`0.0.0.0/0`)
- ✅ Connection string is correct

## 🔧 Solutions (Try in Order):

### Solution 1: Change DNS Server (Easiest)

**Option A: Via Windows Settings**

1. Press `Win + I` to open Settings
2. Go to **Network & Internet** → **Wi-Fi** (or **Ethernet**)
3. Click on your active network connection
4. Scroll down → Click **"Edit"** under **DNS server assignment**
5. Select **"Manual"**
6. Toggle **IPv4** ON
7. Enter:
   - **Preferred DNS:** `8.8.8.8`
   - **Alternate DNS:** `1.1.1.1`
8. Click **"Save"**
9. Open PowerShell as **Administrator** and run:
   ```powershell
   ipconfig /flushdns
   ```
10. Test again:
    ```powershell
    cd "e:\backup\New folder (2)\lms\server"
    node test-mongodb-connection.js
    ```

**Option B: Via PowerShell (Run as Administrator)**

```powershell
# Find your network adapter name first
Get-NetAdapter

# Set DNS (replace "Wi-Fi" with your adapter name if different)
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 1.1.1.1 index=2

# Flush DNS cache
ipconfig /flushdns

# Test
cd "e:\backup\New folder (2)\lms\server"
node test-mongodb-connection.js
```

---

### Solution 2: Use Mobile Hotspot (Quick Test)

This will tell you if it's a network issue:

1. **Disconnect from current Wi-Fi/Ethernet**
2. **Enable mobile hotspot** on your phone
3. **Connect your computer** to the mobile hotspot
4. **Test connection:**
   ```powershell
   cd "e:\backup\New folder (2)\lms\server"
   node test-mongodb-connection.js
   ```

**If it works on mobile hotspot:**
- ✅ Your code/config is correct
- ❌ Your network/DNS is blocking MongoDB
- **Solution:** Use mobile hotspot, change DNS, or contact network admin

---

### Solution 3: Check Firewall

**Temporarily disable Windows Firewall to test:**

1. Press `Win + I` → **Privacy & Security** → **Windows Security**
2. Click **"Firewall & network protection"**
3. Click on your active network (Private/Public)
4. Toggle **"Microsoft Defender Firewall"** OFF
5. **Test connection**
6. **Turn firewall back ON** after testing

**If firewall was the issue:**
- Add exception for Node.js
- Or allow outbound connections on port 27017

---

### Solution 4: Corporate Network?

If you're on a corporate/restricted network:

1. **Contact IT department** and ask them to:
   - Whitelist MongoDB Atlas domains: `*.mongodb.net`
   - Allow DNS queries to external DNS servers
   - Or provide access to MongoDB Atlas

2. **Use VPN** (if available):
   - Connect to VPN
   - Test connection
   - VPN might bypass restrictions

3. **Use mobile hotspot** for development

---

### Solution 5: Router DNS Settings

If you control your router:

1. **Access router admin panel** (usually `192.168.1.1` or `192.168.0.1`)
2. **Find DNS settings**
3. **Change DNS servers** to:
   - Primary: `8.8.8.8`
   - Secondary: `1.1.1.1`
4. **Save and restart router**
5. **Restart your computer**

---

## 🧪 Test DNS Resolution

After changing DNS, test if it works:

```powershell
# Test A record
nslookup cluster0.7wnposz.mongodb.net

# Test SRV record (MongoDB uses this)
nslookup -type=SRV _mongodb._tcp.cluster0.7wnposz.mongodb.net
```

**Expected:** Should return IP addresses or SRV records, not "timed out" or "ECONNREFUSED"

---

## ✅ Verify Fix

After applying a solution, run:

```powershell
cd "e:\backup\New folder (2)\lms\server"
node test-mongodb-connection.js
```

**Expected Output:**
```
✅ Connected successfully!
✅ All tests passed!
```

---

## 📝 Recommended DNS Servers

- **Google DNS:** `8.8.8.8` and `8.8.4.4`
- **Cloudflare DNS:** `1.1.1.1` and `1.0.0.1`
- **Quad9 DNS:** `9.9.9.9` and `149.112.112.112`

---

## 🆘 Still Not Working?

If none of these work:

1. **Verify internet connection** - Can you browse websites?
2. **Check if MongoDB Atlas is accessible** - Try opening https://cloud.mongodb.com/ in browser
3. **Try from different network** - Mobile hotspot, different Wi-Fi
4. **Check MongoDB Atlas status** - https://status.mongodb.com/

---

**Last Updated:** February 2, 2026
