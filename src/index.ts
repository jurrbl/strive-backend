import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import fetch from "node-fetch";

import authRoutes from "./routes/auth";
import userRouter from "./routes/user-route";
import graphRouter from "./routes/graph.route";
import aiRouter from "./routes/ai.route";
import tabsRouter from "./routes/tabsRouter";

import "./utils/passportGoogle";
import verifyToken from "./middleware/verifyToken";

dotenv.config();

const app = express();
const server = http.createServer(app); // <-- crea server http manuale
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

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
app.use(verifyToken);
app.use("/api/user", userRouter);
app.use("/api", graphRouter);
app.use("/api", aiRouter);
app.use("/api/tabs", tabsRouter);

app.get("/", (_req, res) => {
  res.send("✅ Backend attivo!");
});

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log("🔌 Nuova connessione socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Disconnessione socket:", socket.id);
  });

  socket.on("tab-activity", async (data) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

    const prompt = `
Classifica ogni scheda nel seguente elenco indicando solo:

- titolo_scheda
- url
- inizio_attivita
- tipo: "studio", "svago" o "altro"

Restituisci SOLO un array JSON. Nessuna spiegazione.

Schede:
${JSON.stringify(data, null, 2)}
`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const geminiJson = await geminiRes.json();
      //console.dir(geminiJson, { depth: null }); // <-- utile per debug

      const rawOutput = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

      let parsed: any[] = [];
      let cleaned = rawOutput?.trim();

      // Rimuove blocco markdown ```json ... ```
      if (cleaned?.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").trim();
      }
      if (cleaned?.endsWith("```")) {
        cleaned = cleaned.slice(0, -3).trim();
      }

      // Rimuove tutto prima del primo [
      const firstBracket = cleaned?.indexOf("[");
      if (firstBracket > 0) cleaned = cleaned.slice(firstBracket);

      try {
        parsed = JSON.parse(cleaned || "[]");
      } catch (e) {
        console.error("❌ Errore parsing JSON da Gemini:", e, cleaned);
      }
      console.log("✅ Risposta JSON parsata:", parsed);
      // inoltra al client admin o salva su DB
      io.emit("tab-classified", parsed);
    } catch (error) {
      console.error("❌ Errore nella richiesta a Gemini:", error);
    }
  });
});

// Avvia il server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
