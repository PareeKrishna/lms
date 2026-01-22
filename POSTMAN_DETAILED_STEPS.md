# Complete Postman Guide - Step by Step with All Parameters

## 🎯 Quick Start Checklist
- [ ] Backend server running on `http://localhost:5000`
- [ ] Postman installed and open
- [ ] You have a Clerk account and are signed in

---

## 📋 STEP 1: Get Your Clerk Token

### Option A: From Browser (Easiest)

1. **Open your frontend app** in browser (e.g., `http://localhost:5173`)
2. **Sign in** to your account
3. **Open Developer Tools**: Press `F12` or Right-click → Inspect
4. **Go to Network tab**
5. **Make any action** in your app (click a button, navigate)
6. **Find any API request** in the Network tab
7. **Click on the request**
8. **Go to "Headers" section**
9. **Look for "Authorization" header**
10. **Copy the entire value** (it will look like: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`)
11. **Copy ONLY the token part** (the part after "Bearer ")

   Example:
   ```
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
   ```
   
   Copy this part: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ`

### Option B: From Browser Console

1. **Open your frontend app** in browser
2. **Sign in** to your account
3. **Open Developer Tools**: Press `F12`
4. **Go to Console tab**
5. **Paste this code** and press Enter:
   ```javascript
   // This will only work if Clerk is loaded
   // Try this in the browser console:
   window.Clerk?.session?.getToken().then(token => {
     console.log("=== YOUR TOKEN ===");
     console.log(token);
     console.log("=== COPY THIS ===");
   });
   ```
6. **Copy the token** from console

---

## 📋 STEP 2: Test Your Token (VERIFY AUTH WORKS FIRST)

**Before doing anything else, let's verify your token works!**

### Request Setup:

1. **Open Postman**
2. **Create New Request**:
   - Click **"New"** button (top left)
   - Select **"HTTP Request"**
   - OR click the **"+"** tab

3. **Set Request Type**:
   - Look at the dropdown on the left (should say "GET" by default)
   - Make sure it says **"GET"**

4. **Enter URL**:
   - Click in the URL field (where it says "Enter request URL")
   - Type exactly: `http://localhost:5000/api/test-auth`
   - Press Enter

5. **Add Authorization Header**:
   - Click **"Headers"** tab (below the URL)
   - In the **Key** column, type: `Authorization`
   - In the **Value** column, type: `Bearer ` (with a space after Bearer)
   - Then paste your token right after the space
   
   **Example of what Value should look like:**
   ```
   Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
   ```
   
   ⚠️ **IMPORTANT**: 
   - There must be a **space** between "Bearer" and your token
   - No quotes around the value
   - No extra spaces
   - Key must be exactly: `Authorization` (capital A, rest lowercase)

6. **Body Tab**: 
   - **DO NOT TOUCH THIS TAB** - Leave it empty/unselected

7. **Send Request**:
   - Click the blue **"Send"** button (top right)
   - Wait for response

8. **Check Response**:
   - You should see response at the bottom
   
   **✅ Success Response:**
   ```json
   {
     "success": true,
     "message": "Authentication working!",
     "userId": "user_abc123xyz",
     "authenticated": true
   }
   ```
   → Your token works! Proceed to STEP 3 ✅
   
   **❌ Error Response:**
   ```json
   {
     "success": false,
     "message": "Not authenticated - no userId found",
     "authenticated": false
   }
   ```
   → Token is invalid/expired. Get a fresh token from browser and try again.

---

## 📋 STEP 3: Check Your Role

**Now let's check if you're an educator:**

### Exact Postman Settings:

1. **Request Type**: 
   - Dropdown should say **"GET"**

2. **URL**:
   ```
   http://localhost:5000/api/educator/check-role
   ```

3. **Headers Tab** (Click "Headers" tab):
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_TOKEN_HERE` (replace YOUR_TOKEN_HERE with actual token)
   
   **Visual Example:**
   ```
   Key              | Value
   -----------------|--------------------------------------------------
   Authorization    | Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Body Tab**: 
   - **DO NOT TOUCH THIS TAB** - Leave it empty/unselected

5. **Click "Send"**

### Expected Responses:

**✅ If you ARE an educator:**
```json
{
  "success": true,
  "role": "educator",
  "isEducator": true,
  "message": "You are an educator. You can add courses."
}
```
→ **Proceed to STEP 5 (Add Course)**

**⚠️ If you are NOT an educator:**
```json
{
  "success": true,
  "role": null,
  "isEducator": false,
  "message": "You are not an educator. Update your role to add courses."
}
```
→ **Proceed to STEP 4 (Update Role)**

**❌ If you get an error:**
- `401 Unauthorized` → Your token is wrong/expired, get a new one
- `500 Internal Server Error` → Check server logs

---

## 📋 STEP 4: Update Your Role to Educator

**Only do this if STEP 3 showed `"isEducator": false`**

### Exact Postman Settings:

1. **Request Type**: 
   - Dropdown should say **"GET"**

2. **URL**:
   ```
   http://localhost:5000/api/educator/update-role
   ```

3. **Headers Tab**:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_TOKEN_HERE`

4. **Body Tab**: 
   - **DO NOT TOUCH** - Leave empty

5. **Click "Send"**

### Expected Response:
```json
{
  "success": true,
  "message": "You can publish a course now"
}
```

6. **After this, go back to STEP 3** and check your role again to confirm it's now "educator"

---

## 📋 STEP 5: Add a Course

**⚠️ Only do this after confirming you're an educator in STEP 3!**

### Exact Postman Settings:

1. **Request Type**: 
   - Change dropdown to **"POST"** (click the dropdown, select POST)

2. **URL**:
   ```
   http://localhost:5000/api/educator/add-course
   ```

3. **Headers Tab**:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_TOKEN_HERE`
   
   ⚠️ **IMPORTANT**: 
   - **DO NOT** add a `Content-Type` header
   - Postman will automatically set it to `multipart/form-data`
   - Only have the `Authorization` header

4. **Body Tab** (This is the important part!):
   
   a. **Click "Body" tab** (below Headers)
   
   b. **Select "form-data"** radio button (NOT "raw", NOT "x-www-form-urlencoded")
   
   c. **Add First Field - Image**:
      - In the **Key** column, type exactly: `image`
      - Click the dropdown on the right side of the Key field
      - Change from **"Text"** to **"File"**
      - In the **Value** column, click **"Select Files"**
      - Choose an image file from your computer (JPG, PNG, etc.)
      - The file path should appear in the Value column
   
   d. **Add Second Field - Course Data**:
      - Click **"Add Row"** or the **"+"** button (if needed)
      - In the **Key** column, type exactly: `courseData`
      - Make sure the dropdown says **"Text"** (NOT "File")
      - In the **Value** column, paste this JSON (as a single line, no line breaks):
   
   ```json
   {"courseTitle":"Test React Course","courseDescription":"<p>This is a test course to learn React</p>","coursePrice":99,"discount":10,"courseContent":[{"chapterId":"ch1","chapterOrder":1,"chapterTitle":"Introduction","chapterContent":[{"lectureId":"lec1","lectureTitle":"What is React?","lectureDuration":15,"lectureUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","isPreviewFree":true,"lectureOrder":1}]}]}
   ```

   **Visual Example of Body Tab:**
   ```
   Key         | Type  | Value
   ------------|-------|--------------------------------------------------
   image       | File  | [C:\Users\...\image.jpg]  (file path)
   courseData  | Text  | {"courseTitle":"Test React Course",...}
   ```

5. **Click "Send"**

### Expected Responses:

**✅ Success:**
```json
{
  "success": true,
  "message": "Course Added"
}
```

**❌ Common Errors:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```
→ Check your Authorization header and token

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Unauthorized access. Educator role required."
}
```
→ You're not an educator. Go to STEP 4 first.

**400 Bad Request:**
```json
{
  "success": false,
  "message": " Thumbnail not attached"
}
```
→ The `image` field is not set to "File" type, or no file selected

---

## 🔍 Detailed Troubleshooting

### Problem: "401 Unauthorized" or "Missing userId"

**Possible Causes:**
1. **Token is expired** → Get a fresh token from browser
2. **Token format wrong** → Should be `Bearer <token>` with space
3. **Token copied incorrectly** → Make sure no extra spaces or characters
4. **Authorization header missing** → Check Headers tab

**Solution:**
1. Get a fresh token (go back to STEP 1)
2. In Postman Headers tab, make sure:
   - Key is exactly: `Authorization` (case-sensitive)
   - Value is exactly: `Bearer ` (space) + your token
   - No quotes around the value
3. Test with STEP 2 first

### Problem: "403 Forbidden - Educator role required"

**Cause:** You're not an educator yet

**Solution:**
1. Go to STEP 4 (Update Role)
2. Send the request
3. Go back to STEP 3 (Check Role) to verify
4. Then try adding course again

### Problem: "Thumbnail not attached"

**Cause:** Image field is not configured correctly

**Solution:**
1. Go to Body tab
2. Make sure you selected **"form-data"** (not raw)
3. Find the `image` field
4. Make sure dropdown says **"File"** (not "Text")
5. Click "Select Files" and choose an image
6. File path should appear in Value column

### Problem: JSON parsing error

**Cause:** courseData JSON is malformed

**Solution:**
1. Make sure `courseData` field type is **"Text"** (not File)
2. JSON must be on a **single line** (no line breaks)
3. Use this validator: https://jsonlint.com/
4. Make sure all required fields are present:
   - courseTitle (string)
   - courseDescription (string, can be HTML)
   - coursePrice (number)
   - discount (number 0-100)
   - courseContent (array, can be empty `[]`)

### Problem: "Cannot read property 'userId' of undefined"

**Cause:** Clerk middleware not working properly

**Solution:**
1. Check server logs for errors
2. Verify your token is valid (test with STEP 2)
3. Make sure backend server is running
4. Check that Clerk environment variables are set

---

## 📸 Visual Postman Layout Reference

```
┌─────────────────────────────────────────────────────────┐
│  POST  http://localhost:5000/api/educator/add-course    │  ← URL Bar
│  [Send]                                                 │
├─────────────────────────────────────────────────────────┤
│  [Params] [Authorization] [Headers] [Body] [Pre-req]  │  ← Tabs
├─────────────────────────────────────────────────────────┤
│  Headers Tab:                                           │
│  ┌──────────────┬────────────────────────────────────┐ │
│  │ Key          │ Value                              │ │
│  ├──────────────┼────────────────────────────────────┤ │
│  │ Authorization│ Bearer eyJhbGciOiJSUzI1NiIsInR5c... │ │
│  └──────────────┴────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Body Tab (form-data selected):                         │
│  ┌──────────────┬──────┬────────────────────────────┐ │
│  │ Key          │ Type │ Value                      │ │
│  ├──────────────┼──────┼────────────────────────────┤ │
│  │ image        │ File │ [Select Files] image.jpg   │ │
│  │ courseData   │ Text │ {"courseTitle":"Test"...}  │ │
│  └──────────────┴──────┴────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Final Checklist Before Sending Add Course Request

- [ ] Request method is **POST** (not GET)
- [ ] URL is exactly: `http://localhost:5000/api/educator/add-course`
- [ ] Headers tab has **Authorization** key with value `Bearer <token>`
- [ ] Body tab is selected
- [ ] **form-data** radio button is selected (not raw, not x-www-form-urlencoded)
- [ ] `image` field exists with Type = **File** and a file is selected
- [ ] `courseData` field exists with Type = **Text** and valid JSON
- [ ] JSON is on a single line (no line breaks)
- [ ] You've verified you're an educator (STEP 3)

---

## 🎯 Quick Reference: All Endpoints

### 1. Test Authentication (Verify Token Works)
```
GET http://localhost:5000/api/test-auth
Header: Authorization: Bearer <token>
Expected: {"success": true, "authenticated": true, "userId": "..."}
```

### 2. Check Role
```
GET http://localhost:5000/api/educator/check-role
Header: Authorization: Bearer <token>
```

### 3. Update Role
```
GET http://localhost:5000/api/educator/update-role
Header: Authorization: Bearer <token>
```

### 4. Add Course
```
POST http://localhost:5000/api/educator/add-course
Header: Authorization: Bearer <token>
Body: form-data
  - image: [File]
  - courseData: [Text JSON]
```

---

## 💡 Pro Tips

1. **Save your token as a variable**:
   - In Postman, click "Environment" (top right)
   - Create new environment
   - Add variable: `clerk_token` = your token
   - In requests, use: `Bearer {{clerk_token}}`

2. **Save requests as a collection**:
   - Click "Save" button
   - Create new collection "LMS API"
   - Save all requests there for easy access

3. **Test incrementally**:
   - First test: Health check (STEP 2)
   - Second test: Check role (STEP 3)
   - Third test: Add course (STEP 5)

4. **Check server logs**:
   - If something fails, check your backend terminal
   - Look for error messages in the logs
   - The logs will show exactly what went wrong

---

## 🆘 Still Having Issues?

If you're still getting unauthorized errors:

1. **Double-check token**:
   - Get a fresh token from browser
   - Make sure it's the full token (very long string)
   - No extra spaces or characters

2. **Verify server is running**:
   - Check backend terminal
   - Should see: "Server started successfully"
   - Should see: "MongoDB connected successfully"

3. **Check CORS**:
   - Make sure backend allows requests from your origin
   - Check server.js for CORS configuration

4. **Test with curl** (alternative to Postman):
   ```bash
   curl -X GET http://localhost:5000/api/educator/check-role \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

If all else fails, share:
- The exact error message
- What step you're on
- Your server logs
- Screenshot of Postman request (hide token)
