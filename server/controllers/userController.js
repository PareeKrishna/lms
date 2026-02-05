import User from "../models/User.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import { CourseProgress } from "../models/CourseProgress.js";


export const getUserData = async (req, res) => {
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

//Users Enrolled Courses with lecture links

export const userEnrolledCourses = async (req, res) => {
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userData = await User.findById(userId).populate('enrolledCourses');

        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, enrolledCourses: userData.enrolledCourses || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

//purchase course

export const purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const { origin } = req.headers;

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'Course ID is required' });
        }

        if (!origin) {
            return res.status(400).json({ success: false, message: 'Origin header is required' });
        }

        const authResult = req.auth();
        const userId = authResult?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ success: false, message: 'Stripe configuration error' });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const courseData = await Course.findById(courseId);
        if (!courseData) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if user is already enrolled
        const isAlreadyEnrolled = userData.enrolledCourses.some(
            enrolledCourseId => enrolledCourseId.toString() === courseId
        );

        if (isAlreadyEnrolled) {
            return res.status(400).json({ success: false, message: 'You are already enrolled in this course' });
        }

        // Calculate price with discount
        const coursePrice = courseData.coursePrice || 0;
        const discount = courseData.discount || 0;
        const finalPrice = (coursePrice - (discount * coursePrice / 100)).toFixed(2);

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: finalPrice,
        };

        const newPurchase = await Purchase.create(purchaseData);

        //stripe gateway initialize
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const currency = (process.env.CURRENCY || 'USD').toLowerCase();

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle || 'Course'
                },
                unit_amount: Math.floor(parseFloat(newPurchase.amount) * 100)
            },
            quantity: 1
        }];

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        });

        res.json({ success: true, session_url: session.url });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

//update user course progress

export const updateUserCourseProgress = async (req, res) => {
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        const { courseId, lectureId } = req.body;
        // Only accept a valid non-empty lectureId so we never store undefined
        const validLectureId = typeof lectureId === 'string' && lectureId.trim() ? lectureId.trim() : null;
        if (!validLectureId) {
            return res.json({ success: false, message: 'Valid lecture ID is required' });
        }

        const progressData = await CourseProgress.findOne({
            userId, courseId
        });
        if (progressData) {
            // Ensure we have an array (legacy data might be corrupted)
            if (!Array.isArray(progressData.lectureCompleted)) {
                progressData.lectureCompleted = [];
            }
            if (progressData.lectureCompleted.includes(validLectureId)) {
                return res.json({ success: true, message: 'Lecture Already Completed' });
            }

            progressData.lectureCompleted.push(validLectureId);
            progressData.markModified('lectureCompleted');
            await progressData.save();

        } else {
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [validLectureId]
            });
        }

        res.json({ success: true, message: 'Progress Updated' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//get user Course Progress with total lectures derived from current course data

export const getUserCourseProgress = async (req, res) => {
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        const { courseId } = req.body;
        const progressData = await CourseProgress.findOne({
            userId,
            courseId
        });

        // Derive the latest total lecture count from the Course document
        let totalLectures = 0;
        if (courseId) {
            const course = await Course.findById(courseId).select('courseContent');
            if (course?.courseContent && Array.isArray(course.courseContent)) {
                course.courseContent.forEach(chapter => {
                    if (Array.isArray(chapter.chapterContent)) {
                        totalLectures += chapter.chapterContent.length;
                    }
                });
            }
        }

        res.json({ success: true, progressData, totalLectures });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

//Add User Rating to the course

export const addUserRating = async (req, res) => {

    const authResult = req.auth();
    const userId = authResult?.userId;
    const { courseId, rating } = req.body;
    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'Invalid Details' });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }
        const user = await User.findById(userId);
        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: 'You are not enrolled in this course' });
        }

        const existingRatingIndex = course.courseRatings.findIndex(rating => rating.userId.toString() === userId);
        if (existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            course.courseRatings.push({ userId, rating });
        }
        await course.save();

        return res.json({ success: true, message: 'Rating added successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}