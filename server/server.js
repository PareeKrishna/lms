import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";

//initialize express
const app = express(); 
//connect to database
await connectDB();
await connectCloudinary();
//middlewares
app.use(cors());
app.use(clerkMiddleware())

//routes
app.get("/", (req, res) => res.send("API working"));
app.post("/clerk", express.json(), clerkWebhooks);
app.use('/api/educator' , educatorRouter)

//port
const PORT = process.env.port || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
