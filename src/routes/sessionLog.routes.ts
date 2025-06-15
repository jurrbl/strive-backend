// src/routes/sessionLog.routes.ts
import express, { Request, Response } from "express";
import SessionLog from "../models/SessionLog";


const router = express.Router();

// GET ultimo log
router.get("/sessionlog/last", async (req: Request, res: Response) : Promise<any> => {
  try {
    const userId = (req as any).user.id;

    const lastLog = await SessionLog.findOne({ userId }).sort({ createdAt: -1 });

    if (!lastLog) {
      return res.json({ statuses: [], feedback: "" });
    }

    res.json({
      statuses: lastLog.logs || [],
      feedback: lastLog.feedback || "",
    });
  } catch (err) {
    console.error("Errore sessionlog/last:", err);
    res.status(500).json({ error: "Errore recupero log." });
  }
});

// POST nuovo log
router.post("/sessionlog/save", async (req: Request, res: Response) : Promise<any> => {
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
});

export default router;
