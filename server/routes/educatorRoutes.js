import express from 'express';
import { addCourse, getEducatorCourses, updateRoleToEducator } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';

const educatorRouter = express.Router();

//Add Educator Role

educatorRouter.get('/update-role', updateRoleToEducator);
educatorRouter.post(
  "/add-course",

  // 1️⃣ Route reached
  (req, res, next) => {
    console.log("✅ Route hit: /add-course");
    next();
  },

  // 2️⃣ Multer
  upload.single("image"),

  (req, res, next) => {
    console.log("📦 After multer");
    console.log("FILE:", req.file);
    console.log("BODY:", req.body);
    next();
  },

  // 3️⃣ Auth middleware
  protectEducator,

  (req, res, next) => {
    console.log("🔐 After protectEducator");
    console.log("AUTH:", req.auth);
    next();
  },

  // 4️⃣ Controller
  addCourse
);
educatorRouter.get('/courses', protectEducator,getEducatorCourses);
export default educatorRouter 