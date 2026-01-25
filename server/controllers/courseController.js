import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";

//get all courses
export const getAllCourse = async (req, res) => {
    try {
        const courses = await Course.find({
            isPublished: true
        }).select(['-courseContent', '-enrolledStudents']).populate({
            path: 'educator'
        });//these properties are not needed to be sent to the client
        res.json({success: true, courses: courses || []});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
}

//get course by id
export const getCourseId = async (req, res) => {
    const { id } = req.params;

    try {
        if(!id){
            return res.status(400).json({success: false, message: 'Course ID is required'});
        }

        const courseData = await Course.findById(id).populate({
            path: 'educator'
        });

        if(!courseData){
            return res.status(404).json({success: false, message: 'Course not found'});
        }

        //Remove lectureUrl if isPreviewFree is false
        if(courseData.courseContent && Array.isArray(courseData.courseContent)){
            courseData.courseContent.forEach(chapter => {
                if(chapter && chapter.chapterContent && Array.isArray(chapter.chapterContent)){
                    chapter.chapterContent.forEach(lecture => {
                        if(lecture && !lecture.isPreviewFree) {
                            lecture.lectureUrl = "";
                        }
                    });
                }
            });
        }

        res.json({success: true, courseData});
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
}

