import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  Study: { type: Number, required: true },
  Social: { type: Number, required: true },
  Entertainment: { type: Number, required: true },
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
