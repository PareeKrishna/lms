import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import courseRouter from "./routes/courseRoute.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import logger from "./utils/logger.js";
import userRouter from "./routes/userRoutes.js";

// initialize express
const app = express();

logger.info("Initializing server", {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || process.env.port || 5000,
});

// connect to database
await connectDB();
await connectCloudinary();

/* ------------------------------------------------------------------ */
/* ----------------------- STRIPE WEBHOOK (FIRST) -------------------- */
/* ------------------------------------------------------------------ */

app.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

/* ------------------------------------------------------------------ */
/* --------------------------- CORS (FIXED) --------------------------- */
/* ------------------------------------------------------------------ */

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://lms-frontend-liard-five.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// CORS preflight is handled by the `cors` middleware installed above.

logger.debug("CORS middleware enabled");

/* ------------------------------------------------------------------ */
/* --------------------- BODY PARSING (SAFE) -------------------------- */
/* ------------------------------------------------------------------ */

app.use((req, res, next) => {
  if (req.path === "/stripe") return next();
  express.json({ limit: "10mb" })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/stripe") return next();
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});

/* ------------------------------------------------------------------ */
/* --------------------- CLERK MIDDLEWARE ----------------------------- */
/* ------------------------------------------------------------------ */

app.use((req, res, next) => {
  if (req.path === "/stripe") return next();
  try {
    clerkMiddleware()(req, res, () => next());
  } catch {
    req.auth = () => ({ userId: null });
    next();
  }
});

/* ------------------------------------------------------------------ */
/* --------------------------- LOGGING -------------------------------- */
/* ------------------------------------------------------------------ */

app.use(logger.request);

/* ------------------------------------------------------------------ */
/* ---------------------------- ROUTES -------------------------------- */
/* ------------------------------------------------------------------ */

app.get("/", (req, res) => {
  res.send("API working");
});

app.post("/clerk", express.json(), clerkWebhooks);

app.use("/api/educator", educatorRouter);
app.use("/api/course", courseRouter);
app.use("/api/user", userRouter);

/* ------------------------------------------------------------------ */
/* ----------------------- ERROR HANDLING ----------------------------- */
/* ------------------------------------------------------------------ */

app.use((err, req, res, next) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

/* ------------------------------------------------------------------ */
/* ----------------------------- START -------------------------------- */
/* ------------------------------------------------------------------ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info("Server started successfully", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
