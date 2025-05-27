import express, { Request, Response } from "express";
import Session from "../models/Session"; // Assicurati che esista
// import verifyJWT from "../middleware/verifyJWT"; // solo se serve

const graphRouter = express.Router();

graphRouter.get("/session/graph", async (req: Request, res: Response) => {
  try {
    const sessions = await Session.find({});
    res.json({ graphData: sessions });
  } catch (err) {
    console.error("Errore nel recupero sessioni:", err);
    res.status(500).json({ message: "Errore lato server" });
  }
});

export default graphRouter;
