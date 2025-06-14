import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import fetch from "node-fetch";
import Tab from "./models/Tab";
import authRoutes from "./routes/auth";
import userRouter from "./routes/user-route";
import graphRouter from "./routes/graph.route";
import aiRouter from "./routes/ai.route";
import tabsRouter from "./routes/tabsRouter";
import Session from "./models/Session";
import "./utils/passportGoogle";
import verifyToken from "./middleware/verifyToken";

dotenv.config();
const tabTracking = new Map(); // userId -> { url -> { tipo, inizio_attivita } }
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
const inactivityTimers = new Map<string, NodeJS.Timeout>();
function resetInactivityTimer(userId: string) {
  // Cancella eventuale timer precedente
  if (inactivityTimers.has(userId)) {
    clearTimeout(inactivityTimers.get(userId));
  }

  // Imposta un nuovo timeout di 15 minuti
  const timeout = setTimeout(async () => {
    try {
      const session = await Session.findOne({ userId, endTime: null });
      if (session) {
        session.endTime = new Date();
        await session.save();
        console.log(`🕒 Sessione chiusa per inattività: ${userId}`);
        io.emit("session-closed-automatically", session); // notifica al client (opzionale)
      }
    } catch (err) {
      console.error("❌ Errore durante chiusura automatica:", err);
    }
  }, 15 * 60 * 1000); // 15 minuti

  inactivityTimers.set(userId, timeout);
}

// Socket.IO handlers
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  socket.join(userId);
  console.log(`✅ Socket ${socket.id} joined room ${userId}`);

  socket.on("disconnect", () => {
    console.log("❌ Disconnessione socket:", socket.id);

    //chiudi la sessione
    if (inactivityTimers.has(userId)) {
      clearTimeout(inactivityTimers.get(userId));
      inactivityTimers.delete(userId);
    }

    Session.findOne({ userId, endTime: null })
      .then((session) => {
        if (session) {
          session.endTime = new Date();
          return session.save();
        }
      })
      .then(() => {
        console.log(`🕒 Sessione chiusa per disconnessione: ${userId}`);
        io.emit("session-closed-automatically", { userId });
      })
      .catch((err) =>
        console.error("❌ Errore durante chiusura sessione:", err)
      );
  });

  socket.on("tab-activity", async (data, userID) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    const userId = data.userId || userID;
    resetInactivityTimer(userId);

    const prompt = `
Classifica ogni scheda nel seguente elenco indicando solo:

- titolo_scheda
- url
- inizio_attivita
- tipo: "studio", "social" o "altro"

Restituisci SOLO un array JSON. Nessuna spiegazione.

Schede:
${JSON.stringify(data, null, 2)}
`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const geminiJson = await geminiRes.json();
      let rawOutput =
        geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawOutput) return;

      if (rawOutput.startsWith("```json"))
        rawOutput = rawOutput.replace(/^```json/, "").trim();
      if (rawOutput.endsWith("```")) rawOutput = rawOutput.slice(0, -3).trim();

      const firstBracket = rawOutput.indexOf("[");
      if (firstBracket > 0) rawOutput = rawOutput.slice(firstBracket);

      const parsed = JSON.parse(rawOutput);
      console.log("✅ Schede classificate:", parsed);

      io.to(socket.id).emit("tab-classified", parsed);

      //crea la sessione se non esiste
      let session = await Session.findOne({ userId, endTime: null });
      if (!session) {
        session = new Session({
          userId,
          name: `${new Date().toLocaleDateString("it-IT", {
            weekday: "short",
          })}`,
          Study: 0,
          Social: 0,
          Entertainment: 0,
          Other: 0,
          startTime: new Date(),
        });
        await session.save();
        const sessions = await Session.find({ userId });
        io.to(socket.id).emit("update-graph", sessions);
      }

      const sessions = await Session.find({ userId });
      io.to(socket.id).emit("update-graph", sessions);

      if (!tabTracking.has(userId)) tabTracking.set(userId, {});
      const userTabs = tabTracking.get(userId);

      for (const scheda of parsed) {
        userTabs[scheda.url] = {
          tipo: scheda.tipo?.toLowerCase(),
          inizio_attivita: new Date(scheda.inizio_attivita),
          ultimo_aggiornamento: new Date(),
        };
      }
    } catch (err) {
      console.error("❌ Errore in tab-activity:", err);
    }
  });

  socket.on("tab-ping", async (data, userID) => {
    const userId = data.userId || userID;
    resetInactivityTimer(userId);

    try {
      const userTabs = tabTracking.get(userId);
      if (!userTabs) return;

      const session = await Session.findOne({ userId, endTime: null });
      if (!session) return;

      const now = new Date();

      // Prepara una mappa: tipo -> ultima scheda valida di quel tipo
      const tipoMap = new Map<string, { delta: number; url: string }>();

      for (const url of data.activeTabs) {
        const tabInfo = userTabs[url];
        if (!tabInfo || !tabInfo.tipo || !tabInfo.ultimo_aggiornamento)
          continue;

        const last = new Date(tabInfo.ultimo_aggiornamento);
        const delta = Math.floor((now.getTime() - last.getTime()) / 1000);
        if (delta <= 0 || delta > 1800) continue; // ignora tempi irrealistici

        const tipo = tabInfo.tipo.toLowerCase();

        // Se non hai ancora contato questo tipo, salvalo
        if (!tipoMap.has(tipo)) {
          tipoMap.set(tipo, { delta, url });
        }

        // Aggiorna il timestamp anche se la scheda non è usata per il conteggio
        tabInfo.ultimo_aggiornamento = now;
      }

      // Ora aggiungi una volta sola per tipo
      for (const [tipo, { delta, url }] of tipoMap.entries()) {
        if (typeof delta === "number" && !isNaN(delta)) {
          if (tipo === "studio") session.Study += delta;
          else if (tipo === "svago") session.Entertainment += delta;
          else if (tipo === "social") session.Social += delta;
          else if (tipo === "altro" || tipo === "other") session.Other += delta;
          else {
            console.warn(`⚠️ Tipo non riconosciuto: "${tipo}", URL: ${url}`);
          }
        } else {
          console.warn(
            `⚠️ Delta non valido (${delta}) per tipo: "${tipo}", URL: ${url}`
          );
        }

        console.log(`⏱️ +${delta}s su ${tipo} (da ${url})`);
      }

      await session.save();
      const sessions = await Session.find({ userId });
      io.to(socket.id).emit("update-graph", sessions);
    } catch (err) {
      console.error("❌ Errore in tab-ping:", err);
    }
  });
  socket.on("tab-snapshot", async ({ snapshot, userId }) => {
    resetInactivityTimer(userId);

    try {
      let session = await Session.findOne({ userId, endTime: null });
      if (!session) {
        session = new Session({
          userId,
          name: `${new Date().toLocaleDateString("it-IT", {
            weekday: "short",
          })}`,
          Study: 0,
          Social: 0,
          Entertainment: 0,
          Other: 0,
          startTime: new Date(),
          snapshots: [],
        });
        await session.save();
        const sessions = await Session.find({ userId });
        io.to(userId).emit("update-graph", sessions);
      }

      // Calcola delta rispetto allo snapshot precedente
      const now = new Date();
      const previousSnapshot = session.snapshots.at(-1); // ultimo snapshot
      const lastTime = previousSnapshot?.timestamp || session.startTime || now;
      const secondsPassed = Math.floor(
        (now.getTime() - new Date(lastTime).getTime()) / 1000
      );

      // Rileva tipo scheda attiva prevalente
      const attive = snapshot.filter((t: any) => t.active);
      let tipo = "Other";
      if (attive.length) {
        const firstActive = attive[0];
        const tracking = tabTracking.get(userId);
        const tabInfo = tracking?.[firstActive.url];
        tipo = tabInfo?.tipo || "Other";
      }

      const delta = {
        Study: 0,
        Social: 0,
        Entertainment: 0,
        Other: 0,
      };

      if (tipo === "studio") delta.Study = secondsPassed;
      else if (tipo === "social") delta.Social = secondsPassed;
      else if (tipo === "svago") delta.Entertainment = secondsPassed;
      else delta.Other = secondsPassed;

      // Salva snapshot con tempo solo dell’intervallo
      const nuovoSnapshot = {
        timestamp: now,
        tabs: snapshot.map((tab: any) => ({
          id: tab.id,
          titolo_scheda: tab.titolo_scheda,
          url: tab.url,
          active: tab.active,
          inizio_attivita: new Date(tab.inizio_attivita),
        })),
        ...delta,
      };

      session.snapshots.push(nuovoSnapshot);
      await session.save();
      const sessions = await Session.find({ userId });
      io.to(userId).emit("update-graph", sessions);

      // Emit solo il nuovo snapshot
      io.to(userId).emit("snapshot-data-new", [nuovoSnapshot]);
      console.log("SocketID", socket.id);
      console.log("Nuovo snapshot:", [nuovoSnapshot]);
      console.log(`📸 Snapshot incrementale salvato per ${userId}`);
    } catch (err) {
      console.error("❌ Errore durante salvataggio snapshot:", err);
    }
  });

  socket.on("tab-closed", async (data, userID) => {
    try {
      const userId = data.userId || userID;
      const { url, chiusa_alle } = data;

      const userTabs = tabTracking.get(userId);
      if (!userTabs || !userTabs[url]) {
        console.warn("⚠️ Nessuna info classificata salvata per:", url);
        return;
      }

      const { tipo, inizio_attivita, ultimo_aggiornamento } = userTabs[url];
      const start = ultimo_aggiornamento
        ? new Date(ultimo_aggiornamento)
        : new Date(inizio_attivita);
      const end = new Date(chiusa_alle);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      if (duration <= 0 || duration > 1800) {
        console.warn(`⛔️ Durata anomala ignorata per ${url}: ${duration}s`);
        return;
      }

      const session = await Session.findOne({ userId, endTime: null });
      if (!session) {
        console.warn("⚠️ Nessuna sessione attiva trovata");
        return;
      }

      if (tipo === "studio") session.Study += duration;
      else if (tipo === "svago") session.Entertainment += duration;
      else if (tipo === "social") session.Social += duration;
      else session.Other += duration;

      await session.save();
      const sessions = await Session.find({ userId });
      io.to(socket.id).emit("update-graph", sessions);

      console.log("Aggiornamento grafico inviato");
      delete userTabs[url];
      //aggiorna il graph
    } catch (err) {
      console.error("❌ Errore in tab-closed:", err);
    }
  });
  socket.on("get-snapshots", async ({ userId }) => {
    try {
      const session = await Session.findOne({ userId, endTime: null });
      if (!session || !session.snapshots || session.snapshots.length === 0) {
        socket.emit("snapshots-data", []);
        return;
      }

      const enrichedSnapshots = session.snapshots.map((snap) => ({
        timestamp: snap.timestamp,
        Study: snap.Study,
        Social: snap.Social,
        Entertainment: snap.Entertainment,
        Other: snap.Other,
      }));

      socket.emit("snapshots-data", enrichedSnapshots);
      console.log(`📊 Snapshot inviati per userId: ${userId}`);
    } catch (err) {
      console.error("❌ Errore durante il recupero snapshot:", err);
      socket.emit("snapshots-data", []);
    }
  });

  socket.on("start-graph", async (data) => {
    //send all sessions of the user to the client
    const userId = data.userId || data.userID;
    const sessions = await Session.find({ userId });
    socket.emit("update-graph", sessions);
    console.log(
      `📊 Inviate ${sessions.length} sessioni per l'utente ${userId}`
    );
  });
});

// Avvia il server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
