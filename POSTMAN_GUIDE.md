# Postman Guide: Adding a Course as Educator

## Prerequisites
1. Your backend server is running on `http://localhost:5000`
2. You have a Clerk account and are signed in
3. You have Postman installed

---

## Step 1: Get Your Clerk Authentication Token

### Method 1: From Browser Console (Recommended)
1. Open your frontend application in the browser
2. Sign in to your account
3. Open Developer Tools (F12 or Right-click → Inspect)
4. Go to **Console** tab
5. Run this code:
   ```javascript
   // If you're on the frontend and Clerk is loaded
   // Check the Network tab instead:
   // 1. Go to Network tab
   // 2. Make any API call from your app
   // 3. Find the request, check Headers
   // 4. Look for "Authorization: Bearer <token>"
   ```

### Method 2: Add Temporary Code to Get Token
Add this to any component that uses Clerk:
```javascript
import { useAuth } from "@clerk/clerk-react";

const { getToken } = useAuth();

useEffect(() => {
  getToken().then(token => {
    console.log("Your Clerk Token:", token);
    // Copy this token for Postman
  });
}, []);
```

---

## Step 2: Check Your Current Role

**⚠️ IMPORTANT: Always check your role first before trying to add a course!**

1. **Method**: `GET`
2. **URL**: `http://localhost:5000/api/educator/check-role`
3. **Headers**:
   - Key: `Authorization`
   - Value: `Bearer YOUR_CLERK_TOKEN_HERE`
4. Click **Send**
5. **Expected Responses**:

   **If you ARE an educator:**
   ```json
   {
     "success": true,
     "role": "educator",
     "isEducator": true,
     "message": "You are an educator. You can add courses."
   }
   ```
   ✅ **You can proceed to Step 4 (Add Course)**

   **If you are NOT an educator:**
   ```json
   {
     "success": true,
     "role": null,
     "isEducator": false,
     "message": "You are not an educator. Update your role to add courses."
   }
   ```
   ⚠️ **You need to update your role first - proceed to Step 3**

   **If authentication fails:**
   ```json
   {
     "success": false,
     "message": "Authentication required",
     "role": null
   }
   ```
   → Check your Authorization header and token

---

## Step 3: Update Your Role to Educator (Only if Step 2 shows you're not an educator)

**Only do this if Step 2 showed `"isEducator": false`:**

1. **Method**: `GET`
2. **URL**: `http://localhost:5000/api/educator/update-role`
3. **Headers**:
   - Key: `Authorization`
   - Value: `Bearer YOUR_CLERK_TOKEN_HERE`
4. Click **Send**
5. Expected Response:
   ```json
   {
     "success": true,
     "message": "You can publish a course now"
   }
   ```
6. **After updating, go back to Step 2 to verify** your role is now "educator"

---

## Step 4: Create the Add Course Request

**⚠️ Make sure you completed Step 2 and confirmed `"isEducator": true` before proceeding!**

### Request Setup

1. **Method**: `POST`
2. **URL**: `http://localhost:5000/api/educator/add-course`
3. **Headers**:
   - Key: `Authorization`
   - Value: `Bearer YOUR_CLERK_TOKEN_HERE`
   - ⚠️ **Important**: Do NOT add `Content-Type` header manually (Postman will set it automatically for form-data)

### Body Configuration

1. Select **Body** tab
2. Choose **form-data** (not raw or x-www-form-urlencoded)
3. Add two fields:

#### Field 1: Image File
- **Key**: `image` (must be exactly "image")
- **Type**: Change dropdown from "Text" to **"File"**
- **Value**: Click "Select Files" and choose an image file (JPG, PNG, etc.)

#### Field 2: Course Data (JSON String)
- **Key**: `courseData` (must be exactly "courseData")
- **Type**: Keep as "Text"
- **Value**: Paste the JSON below (as a single-line string, no line breaks)

---

## Step 5: Course Data JSON Template

Copy this JSON and customize it:

```json
{
  "courseTitle": "Complete React Development Course",
  "courseDescription": "<p>Learn React from scratch to advanced level. This course covers everything you need to know.</p>",
  "coursePrice": 99,
  "discount": 10,
  "courseContent": [
    {
      "chapterId": "chapter_1",
      "chapterOrder": 1,
      "chapterTitle": "Introduction to React",
      "chapterContent": [
        {
          "lectureId": "lecture_1_1",
          "lectureTitle": "What is React?",
          "lectureDuration": 15,
          "lectureUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "isPreviewFree": true,
          "lectureOrder": 1
        },
        {
          "lectureId": "lecture_1_2",
          "lectureTitle": "Setting up React Environment",
          "lectureDuration": 20,
          "lectureUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "isPreviewFree": false,
          "lectureOrder": 2
        }
      ]
    },
    {
      "chapterId": "chapter_2",
      "chapterOrder": 2,
      "chapterTitle": "React Components",
      "chapterContent": [
        {
          "lectureId": "lecture_2_1",
          "lectureTitle": "Functional Components",
          "lectureDuration": 25,
          "lectureUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "isPreviewFree": true,
          "lectureOrder": 1
        }
      ]
    }
  ]
}
```

### Important Notes:
- **courseTitle**: String (required)
- **courseDescription**: HTML string (required)
- **coursePrice**: Number (required)
- **discount**: Number 0-100 (required)
- **courseContent**: Array of chapters (at least one chapter required)
- Each chapter must have:
  - `chapterId`: Unique string
  - `chapterOrder`: Number (1, 2, 3...)
  - `chapterTitle`: String
  - `chapterContent`: Array of lectures (can be empty)
- Each lecture must have:
  - `lectureId`: Unique string
  - `lectureTitle`: String
  - `lectureDuration`: Number (minutes)
  - `lectureUrl`: String (YouTube URL or any video URL)
  - `isPreviewFree`: Boolean (true/false)
  - `lectureOrder`: Number (1, 2, 3...)

---

## Step 6: Send the Request

1. Double-check:
   - ✅ Authorization header is set with Bearer token
   - ✅ Body is set to `form-data`
   - ✅ `image` field is type "File" with a file selected
   - ✅ `courseData` field is type "Text" with valid JSON
2. Click **Send**
3. Wait for response

---

## Expected Responses

### Success Response (200):
```json
{
  "success": true,
  "message": "Course Added"
}
```

### Error Responses:

**401 Unauthorized** - Missing or invalid token:
```json
{
  "success": false,
  "message": "Authentication required"
}
```
→ Check your Authorization header

**401 Unauthorized** - Not an educator:
```json
{
  "success": false,
  "message": "Unauthorized access. Educator role required."
}
```
→ Run Step 2 to update your role

**400 Bad Request** - Missing thumbnail:
```json
{
  "success": false,
  "message": " Thumbnail not attached"
}
```
→ Make sure `image` field is set to "File" type and a file is selected

**500 Internal Server Error**:
→ Check server logs for details

---

## Quick Checklist

- [ ] Backend server is running
- [ ] Got Clerk authentication token
- [ ] **Checked role using `/check-role` endpoint (Step 2)**
- [ ] **Confirmed `"isEducator": true` in response**
- [ ] Updated role to educator (only if Step 2 showed false)
- [ ] Request method is POST
- [ ] URL is correct: `http://localhost:5000/api/educator/add-course`
- [ ] Authorization header: `Bearer <token>`
- [ ] Body type is `form-data`
- [ ] `image` field is File type with file selected
- [ ] `courseData` field is Text type with valid JSON
- [ ] JSON has all required fields

---

## Troubleshooting

### "Missing userId in protectEducator"
- Your token might be expired or invalid
- Get a fresh token from the browser
- Make sure you're signed in

### "Invalid character" error
- Check that your token doesn't have extra spaces
- Format: `Bearer <token>` (space between Bearer and token)

### File upload fails
- Make sure `image` field type is "File" not "Text"
- File size should be reasonable (under 10MB)
- Supported formats: JPG, PNG, GIF, etc.

### JSON parsing error
- Make sure `courseData` is a valid JSON string
- No line breaks in the JSON (paste as single line)
- All required fields are present

---

## Example Postman Collection

You can save this as a Postman Collection:

```json
{
  "info": {
    "name": "LMS Educator API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Check User Role",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{clerk_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/educator/check-role",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "educator", "check-role"]
        }
      }
    },
    {
      "name": "Update Role to Educator",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{clerk_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/educator/update-role",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "educator", "update-role"]
        }
      }
    },
    {
      "name": "Add Course",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{clerk_token}}",
            "type": "text"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "image",
              "type": "file",
              "src": []
            },
            {
              "key": "courseData",
              "type": "text",
              "value": "{\"courseTitle\":\"Test Course\",\"courseDescription\":\"<p>Test</p>\",\"coursePrice\":99,\"discount\":10,\"courseContent\":[]}"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:5000/api/educator/add-course",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "educator", "add-course"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "clerk_token",
      "value": "YOUR_TOKEN_HERE",
      "type": "string"
    }
  ]
}
```

Save this as a `.json` file and import it into Postman!
