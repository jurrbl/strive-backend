// src/models/SessionLog.ts
import mongoose from "mongoose";

const SessionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" }, // optional
    // --- THIS IS THE KEY CHANGE ---
    logs: [
      {
        status: { type: String, required: true },
        duration: { type: Number, required: true },
      },
    ],
    // --- END OF KEY CHANGE ---
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SessionLog", SessionLogSchema);
