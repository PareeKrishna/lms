import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import logger from "../utils/logger.js";

//check current user role
export const checkUserRole = async (req, res) => {
  const startTime = Date.now();
  try {
    const authResult = req.auth();
    const userId = authResult?.userId;

    if (!userId) {
      logger.warn("Missing userId in checkUserRole");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required",
        role: null
      });
    }
    
    logger.debug("Checking user role", { userId });

    const response = await clerkClient.users.getUser(userId);
    const userRole = response.publicMetadata?.role || null;

    logger.info("User role retrieved", {
      userId,
      role: userRole,
      duration: `${Date.now() - startTime}ms`,
    });

    res.json({ 
      success: true, 
      role: userRole,
      isEducator: userRole === "educator",
      message: userRole === "educator" 
        ? "You are an educator. You can add courses." 
        : "You are not an educator. Update your role to add courses."
    });
  } catch (error) {
    // Handle Clerk API errors specifically
    if (error.message && error.message.includes("valid resource ID")) {
      logger.error("Invalid userId in checkUserRole", error, {
        duration: `${Date.now() - startTime}ms`,
      });
      return res.status(401).json({ 
        success: false, 
        message: "Invalid authentication. Please sign in again.",
        role: null
      });
    }
    
    logger.error("Failed to check user role", error, {
      userId: req.auth?.()?.userId || 'unknown',
      duration: `${Date.now() - startTime}ms`,
    });
    res.status(500).json({ 
      success: false, 
      message: error.message,
      role: null
    });
  }
};

//update your role to educator
export const updateRoleToEducator = async (req, res) => {
  const startTime = Date.now();
  try {
    const authResult = req.auth();
    const userId = authResult?.userId;

    if (!userId) {
      logger.warn("Missing userId in updateRoleToEducator");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    logger.info("Updating user role to educator", { userId });

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    logger.info("User role updated to educator successfully", {
      userId,
      duration: `${Date.now() - startTime}ms`,
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    // Handle Clerk API errors
    if (error.message && error.message.includes("valid resource ID")) {
      logger.error("Invalid userId in updateRoleToEducator", error, {
        duration: `${Date.now() - startTime}ms`,
      });
      return res.status(401).json({ 
        success: false, 
        message: "Invalid authentication. Please sign in again." 
      });
    }
    
    logger.error("Failed to update user role to educator", error, {
      userId: req.auth?.()?.userId || 'unknown',
      duration: `${Date.now() - startTime}ms`,
    });
    res.json({ success: false, message: error.message });
  }
};

// add new course
export const addCourse = async (req, res) => {
  const startTime = Date.now();
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const authResult = req.auth();
    const educatorId = authResult?.userId;

    if (!educatorId) {
      logger.warn("Missing userId in addCourse");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    logger.info("Adding new course", {
      educatorId,
      hasImageFile: !!imageFile,
      hasCourseData: !!courseData,
    });

    if (!imageFile) {
      logger.warn("Course creation failed: thumbnail not attached", {
        educatorId,
      });
      return res.json({ success: false, message: " Thumbnail not attached" });
    }

    const parsedCourseData = await JSON.parse(courseData);
    parsedCourseData.educator = educatorId;

    logger.debug("Creating course in database", {
      educatorId,
      courseTitle: parsedCourseData.courseTitle,
    });

    const newCourse = await Course.create(parsedCourseData);

    logger.info("Course created in database", {
      courseId: newCourse._id,
      courseTitle: newCourse.courseTitle,
      educatorId,
    });

    logger.debug("Uploading course thumbnail to Cloudinary", {
      courseId: newCourse._id,
      filePath: imageFile.path,
      fileSize: imageFile.size,
    });

    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    logger.info("Course thumbnail uploaded to Cloudinary", {
      courseId: newCourse._id,
      cloudinaryUrl: imageUpload.secure_url,
      cloudinaryPublicId: imageUpload.public_id,
    });

    newCourse.courseThumbnail = imageUpload.secure_url;
    await newCourse.save();

    logger.info("Course added successfully", {
      courseId: newCourse._id,
      courseTitle: newCourse.courseTitle,
      educatorId,
      duration: `${Date.now() - startTime}ms`,
    });

    res.json({ success: true, message: "Course Added" });
  } catch (error) {
    logger.error("Failed to add course", error, {
      educatorId: req.auth?.()?.userId || 'unknown',
      duration: `${Date.now() - startTime}ms`,
    });
    res.json({ success: false, message: error.message });
  }
};

// get educator courses
export const getEducatorCourses = async (req, res) => {
  const startTime = Date.now();
  try {
    const authResult = req.auth();
    const educator = authResult?.userId;

    if (!educator) {
      logger.warn("Missing userId in getEducatorCourses");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    logger.info("Fetching educator courses", { educatorId: educator });

    const courses = await Course.find({ educator });

    logger.info("Educator courses retrieved successfully", {
      educatorId: educator,
      courseCount: courses.length,
      duration: `${Date.now() - startTime}ms`,
    });

    res.json({ success: true, courses });
  } catch (error) {
    logger.error("Failed to get educator courses", error, {
      educatorId: req.auth?.()?.userId || 'unknown',
      duration: `${Date.now() - startTime}ms`,
    });
    res.json({ success: false, message: error.message });
  }
};