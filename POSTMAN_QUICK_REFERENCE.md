# Postman Quick Reference Card

## 🔑 Step 1: Get Token
1. Open browser → Sign in → F12 → Network tab
2. Find any API request → Check Headers → Copy Authorization value
3. Copy only the token part (after "Bearer ")

---

## ✅ Step 2: Test Auth (DO THIS FIRST!)

**Settings:**
- Method: `GET`
- URL: `http://localhost:5000/api/test-auth`
- Headers:
  ```
  Key: Authorization
  Value: Bearer YOUR_TOKEN_HERE
  ```
- Body: Leave empty

**Expected Response:**
```json
{"success": true, "authenticated": true, "userId": "..."}
```

**If you get error → Token is wrong, get a new one!**

---

## 👤 Step 3: Check Role

**Settings:**
- Method: `GET`
- URL: `http://localhost:5000/api/educator/check-role`
- Headers:
  ```
  Key: Authorization
  Value: Bearer YOUR_TOKEN_HERE
  ```
- Body: Leave empty

**Response:**
- `"isEducator": true` → You can add courses! ✅
- `"isEducator": false` → Go to Step 4 first

---

## 🔄 Step 4: Update Role (Only if Step 3 shows false)

**Settings:**
- Method: `GET`
- URL: `http://localhost:5000/api/educator/update-role`
- Headers:
  ```
  Key: Authorization
  Value: Bearer YOUR_TOKEN_HERE
  ```
- Body: Leave empty

**Then go back to Step 3 to verify!**

---

## 📚 Step 5: Add Course

**Settings:**
- Method: `POST` ⚠️ (NOT GET!)
- URL: `http://localhost:5000/api/educator/add-course`
- Headers:
  ```
  Key: Authorization
  Value: Bearer YOUR_TOKEN_HERE
  ```
  ⚠️ DO NOT add Content-Type header!

**Body Tab:**
1. Select **"form-data"** (NOT raw, NOT x-www-form-urlencoded)
2. Add two fields:

   **Field 1:**
   - Key: `image`
   - Type: **File** (change dropdown from Text to File)
   - Value: Click "Select Files" → Choose image

   **Field 2:**
   - Key: `courseData`
   - Type: **Text** (keep as Text)
   - Value: Paste this (single line, no breaks):
   ```json
   {"courseTitle":"Test Course","courseDescription":"<p>Test</p>","coursePrice":99,"discount":10,"courseContent":[{"chapterId":"ch1","chapterOrder":1,"chapterTitle":"Intro","chapterContent":[{"lectureId":"lec1","lectureTitle":"Lecture 1","lectureDuration":15,"lectureUrl":"https://youtube.com/watch?v=example","isPreviewFree":true,"lectureOrder":1}]}]}
   ```

---

## ❌ Common Mistakes

1. **Wrong header format:**
   - ❌ `BearerYOUR_TOKEN` (no space)
   - ❌ `"Bearer YOUR_TOKEN"` (with quotes)
   - ✅ `Bearer YOUR_TOKEN` (space, no quotes)

2. **Wrong body type:**
   - ❌ Using "raw" with JSON
   - ❌ Using "x-www-form-urlencoded"
   - ✅ Using "form-data"

3. **Image field wrong:**
   - ❌ Type = "Text"
   - ❌ No file selected
   - ✅ Type = "File" with file selected

4. **Wrong method:**
   - ❌ GET for add-course
   - ✅ POST for add-course

---

## 🎯 Exact Postman Setup for Add Course

```
┌─────────────────────────────────────────────┐
│ POST  http://localhost:5000/api/educator/  │
│       add-course                            │
├─────────────────────────────────────────────┤
│ [Headers Tab]                               │
│ ┌──────────────┬──────────────────────────┐ │
│ │ Authorization│ Bearer eyJhbGciOiJSUz... │ │
│ └──────────────┴──────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [Body Tab] - form-data selected             │
│ ┌──────────────┬──────┬──────────────────┐ │
│ │ image        │ File │ [Select Files]   │ │
│ │ courseData   │ Text │ {"courseTitle"...│ │
│ └──────────────┴──────┴──────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🆘 Still Unauthorized?

1. **Get fresh token** from browser (tokens expire!)
2. **Check space** in header: `Bearer ` (space after Bearer)
3. **Test with Step 2** first (test-auth endpoint)
4. **Check server logs** for error details
5. **Verify backend is running** on port 5000

---

## 📝 Copy-Paste JSON Template

Use this for `courseData` field (paste as single line):

```json
{"courseTitle":"My Course","courseDescription":"<p>Course description here</p>","coursePrice":99,"discount":10,"courseContent":[{"chapterId":"ch1","chapterOrder":1,"chapterTitle":"Chapter 1","chapterContent":[{"lectureId":"lec1","lectureTitle":"Lecture 1","lectureDuration":15,"lectureUrl":"https://www.youtube.com/watch?v=example","isPreviewFree":true,"lectureOrder":1}]}]}
```

**Minimal version (no chapters):**
```json
{"courseTitle":"My Course","courseDescription":"<p>Description</p>","coursePrice":99,"discount":10,"courseContent":[]}
```
