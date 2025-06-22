// src/routes/sessionLog.routes.ts
import express, { Request, Response } from "express";
import SessionLog from "../models/SessionLog";

const router = express.Router();

// GET ultimo log
router.get(
  "/sessionlog/last",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = (req as any).user.id;

      // Find the last log for the user, sorted by creation date descending
      const lastLog = await SessionLog.findOne({ userId }).sort({
        createdAt: -1,
      });

      if (!lastLog) {
        // If no log is found, return empty logs and feedback
        return res.json({ logs: [], feedback: "" }); // Changed 'statuses' to 'logs' here too
      }

      // Send the actual logs and feedback from the found document
      res.json({
        logs: lastLog.logs || [], // <--- CORRECTED: Now sending as 'logs'
        feedback: lastLog.feedback || "",
      });
    } catch (err) {
      console.error("Errore sessionlog/last:", err);
      res.status(500).json({ error: "Errore recupero log." });
    }
  }
);

// POST nuovo log
router.post(
  "/sessionlog/save",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = (req as any).user.id;
      const { logs, feedback, sessionId } = req.body;

      const newLog = new SessionLog({
        userId,
        sessionId,
        logs,
        feedback,
      });

      await newLog.save();
      res.status(201).json({ message: "Log salvato correttamente." });
    } catch (err) {
      console.error("Errore salvataggio session log:", err);
      res.status(500).json({ error: "Errore salvataggio log." });
    }
  }
);

export default router;
