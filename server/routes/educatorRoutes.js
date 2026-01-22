import express from 'express';
import { addCourse, getEducatorCourses, updateRoleToEducator, checkUserRole, educatorDashboardData, getEnrolledStudentsData } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';
import logger from '../utils/logger.js';

const educatorRouter = express.Router();

logger.info("Registering educator routes");

//Check current user role (no protection needed - users can check their own role)
educatorRouter.get('/check-role', (req, res, next) => {
  logger.debug("Route accessed: GET /check-role");
  next();
}, checkUserRole);

//Add Educator Role
educatorRouter.get('/update-role', (req, res, next) => {
  logger.debug("Route accessed: GET /update-role");
  next();
}, updateRoleToEducator);

educatorRouter.post(
  "/add-course",
  (req, res, next) => {
    logger.debug("Route accessed: POST /add-course");
    next();
  },
  upload.single("image"),
  protectEducator,
  addCourse
);

educatorRouter.get('/courses', (req, res, next) => {
  logger.debug("Route accessed: GET /courses");
  next();
}, protectEducator, getEducatorCourses);

//Get Educator Dashboard Data
educatorRouter.get('/dashboard', (req, res, next) => {
  logger.debug("Route accessed: GET /dashboard");
  next();
}, protectEducator, educatorDashboardData);

//Get Enrolled Students Data
educatorRouter.get('/enrolled-students', (req, res, next) => {
  logger.debug("Route accessed: GET /enrolled-students");
  next();
}, protectEducator, getEnrolledStudentsData);

logger.info("Educator routes registered successfully");

export default educatorRouter;