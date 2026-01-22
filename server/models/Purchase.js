import mongoose from "mongoose";

const PurchaseSchema = new mongoose.Schema({
    courseId : {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true},
})