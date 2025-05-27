import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";

import userRouter from "./routes/user-route";
import graphRouter from "./routes/graph.route";
import aiRouter from "./routes/ai.route";

import "./utils/passportGoogle";
import verifyToken from "./middleware/verifyToken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// DB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Routes
app.use("/auth", authRoutes);
app.use(verifyToken)
app.use("/api/user", userRouter)
app.use("/api", graphRouter); 
app.use("/api", aiRouter);

app.get("/", (_req, res) => {
  res.send("✅ Backend attivo!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
