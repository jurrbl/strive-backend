import mongoose from "mongoose";

const tabSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  type: {
    type: String,
    enum: ["Study", "Social", "Entertainment"],
    required: true,
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: false },
  timeSpent: { type: Number, required: false }, // in seconds
});

const Tab = mongoose.model("Tab", tabSchema, "Tabs");
export default Tab;
