import express, { Request, Response } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import SessionLog from "../models/SessionLog";
dotenv.config();
const aiRouter = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
/* aiRouter.post("/ai/openai-summary", async (req: Request, res: Response): Promise<any> => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt non valido." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // oppure "gpt-3.5-turbo"
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore OpenAI:", data);
      return res.status(500).json({ error: "Errore dalla generazione OpenAI." });
    }

    const text = data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta.";
    res.json({ risposta: text });
  } catch (error) {
    console.error("Errore OpenAI:", error);
    res.status(500).json({ error: "Errore interno nella generazione OpenAI." });
  }
}); */

aiRouter.post(
  "/ai/motivational-phrases",
  async (req: Request, res: Response): Promise<any> => {
    const prompt = `
Genera 5 frasi motivazionali brevi (massimo 20 parole ciascuna), rivolte a studenti o persone che stanno cercando di restare concentrate.

Le frasi devono:
- Avere uno stile diretto, positivo e incoraggiante.
- Essere utili per chi è stanco o distratto.
- Essere ispirate a filosofi, poeti o grandi pensatori.
- NON essere numerate.
- NON contenere commenti introduttivi.
- Ogni frase deve stare su una riga diversa.


Formato di output:
<frase>
<frase>
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Errore Gemini:", data);
        return res
          .status(500)
          .json({ error: "Errore durante la generazione AI." });
      }

      const outputText: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const phrases: string[] = outputText
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      res.json({ phrases });
    } catch (error) {
      console.error("Errore generale AI:", error);
      res.status(500).json({ error: "Errore interno nel generatore AI." });
    }
  }
);

aiRouter.post(
  "/ai/analizza-status",
  async (req: Request, res: Response): Promise<any> => {
    // 'logs' from req.body is expected to be an array of objects:
    // [{ status: "concentrato", duration: 10 }, { status: "parla con altri", duration: 5 }]
    const { logs } = req.body;

    if (!logs || !Array.isArray(logs)) {
      console.error("❌ Parametro logs mancante o invalido:", logs);
      return res
        .status(400)
        .json({ error: "Parametro 'logs' mancante o invalido." });
    }

    // Prepare the logs data as a single string for the AI prompt.
    // This is separate from how it's saved to the database.
    const formattedLogsForAI = logs
      .map((l: any) => `- ${l.status} per ${l.duration} secondi`)
      .join("\n");

    const prompt = `
Durante questa sessione di studio l'utente ha manifestato i seguenti stati comportamentali (stato + durata in secondi):
${formattedLogsForAI}

Analizza attentamente tutti i comportamenti, le variazioni tra stati, le durate dei periodi di concentrazione, distrazione, assenza e parlato.

Rispondi con una valutazione dettagliata che includa:

1. Una sintesi del livello generale di concentrazione con le rispettive % di tempo trascorso in ciascuno stato (es. "Concentrazione: 60%, Distrazione: 20%, Assenza: 10%, Parlato: 10%").

2. Eventuali pattern rilevanti (es. "molte brevi distrazioni", "assenze frequenti", "ha parlato ad alta voce per un tempo prolungato", ecc.).
3. Un’ipotesi sul contesto se utile (es. “probabilmente stava ripassando ad alta voce”, “potrebbe essere stato al telefono”, ecc.).
4. Un suggerimento finale per migliorare la prossima sessione (es. “consiglio di ridurre le interazioni esterne” o “ottima gestione delle distrazioni”).

Scrivi in modo chiaro, obiettivo e professionale. Evita giudizi personali o emotivi.
`;

    try {
      console.log("FormattedLogs for AI: ", formattedLogsForAI);
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.choices || !data.choices[0]?.message?.content) {
        console.error("❌ Errore nella risposta OpenAI:", data);
        return res
          .status(500)
          .json({ error: "Errore durante la valutazione AI." });
      }

      // Ensure req.user is populated by your authentication middleware
      const user = req.user as any;

      const valutazione: string = data.choices[0].message.content.trim();

      console.log("✅ Valutazione generata:", valutazione);

      await SessionLog.create({
        userId: user.id, // Ensure user.id is correctly assigned from your auth system
        logs: logs, // Pass the original 'logs' array (array of objects) directly here!
        feedback: valutazione, // Map the AI's 'valutazione' to the 'feedback' field in your schema
        // `createdAt` and `updatedAt` will be automatically handled by `timestamps: true` in the schema
      });

      res.json({ valutazione });
    } catch (error: any) {
      console.error("❌ Errore AI generale:", error);
      res
        .status(500)
        .json({ error: "Errore interno AI.", details: error.message });
    }
  }
);
export default aiRouter;
