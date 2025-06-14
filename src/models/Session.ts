import mongoose from "mongoose";

const SnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  tabs: [
    {
      id: String,
      titolo_scheda: String,
      url: String,
      active: Boolean,
      inizio_attivita: Date,
    },
  ],
  Study: { type: Number, default: 0 },
  Social: { type: Number, default: 0 },
  Entertainment: { type: Number, default: 0 },
  Other: { type: Number, default: 0 },
});

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  Study: { type: Number, default: 0 },
  Social: { type: Number, default: 0 },
  Entertainment: { type: Number, default: 0 },
  Other: { type: Number, default: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  snapshots: [SnapshotSchema], // <--- questo campo!
});

export default mongoose.model("Session", SessionSchema);
