import  User  from "../models/User.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";


export const getUserData = async(req,res)=>{
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        if(!userId){
            return res.status(401).json({success: false, message: 'Authentication required'});
        }

        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({success: false, message: 'User not found'});
        }
        res.json({success: true, user});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
}

//Users Enrolled Courses with lecture links

export const userEnrolledCourses = async(req, res)=> {
    try {
        const authResult = req.auth();
        const userId = authResult?.userId;

        if(!userId){
            return res.status(401).json({success: false, message: 'Authentication required'});
        }

        const userData = await User.findById(userId).populate('enrolledCourses');

        if(!userData){
            return res.status(404).json({success: false, message: 'User not found'});
        }

        res.json({success: true, enrolledCourses : userData.enrolledCourses || []});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
}

//purchase course

export const purchaseCourse = async(req,res) => {
    try {
        const {courseId} = req.body;
        const {origin} = req.headers;
        
        if(!courseId){
            return res.status(400).json({success: false, message: 'Course ID is required'});
        }

        if(!origin){
            return res.status(400).json({success: false, message: 'Origin header is required'});
        }

        const authResult = req.auth();
        const userId = authResult?.userId;

        if(!userId){
            return res.status(401).json({success: false, message: 'Authentication required'});
        }

        if(!process.env.STRIPE_SECRET_KEY){
            return res.status(500).json({success: false, message: 'Stripe configuration error'});
        }

        const userData = await User.findById(userId);
        if(!userData){
            return res.status(404).json({success: false, message: 'User not found'});
        }

        const courseData = await Course.findById(courseId);
        if(!courseData){
            return res.status(404).json({success: false, message: 'Course not found'});
        }

        // Check if user is already enrolled
        const isAlreadyEnrolled = userData.enrolledCourses.some(
            enrolledCourseId => enrolledCourseId.toString() === courseId
        );

        if(isAlreadyEnrolled){
            return res.status(400).json({success: false, message: 'You are already enrolled in this course'});
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

        res.json({success: true, session_url: session.url});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
}