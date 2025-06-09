import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

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

  // Esempio: ricevi dati dalle tab
  socket.on("tab-activity", (data) => {
    console.log("📥 Attività ricevuta dalla scheda:", data);

    //Chiedi a chatgpt di analizzare i dati
    
    // Inoltra i dati al server AI o elabora come necessario



    // puoi salvare su DB o inoltrare a client admin
  });
});

// Avvia il server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
