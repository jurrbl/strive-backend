// src/models/SessionLog.ts
import mongoose from "mongoose";

const SessionLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" }, // opzionale
    logs: { type: [String], default: [] },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SessionLog", SessionLogSchema);
