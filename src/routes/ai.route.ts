import express, { Request, Response } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const aiRouter = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

aiRouter.post("/ai/openai-summary", async (req: Request, res: Response): Promise<any> => {
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
});
aiRouter.post("/ai/motivational-phrases", async (req: Request, res: Response): Promise<any> => {
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
      return res.status(500).json({ error: "Errore durante la generazione AI." });
    }

    const outputText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const phrases: string[] = outputText
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 0);

    res.json({ phrases });
  } catch (error) {
    console.error("Errore generale AI:", error);
    res.status(500).json({ error: "Errore interno nel generatore AI." });
  }
});


aiRouter.post("/ai/analizza-status", async (req: Request, res: Response): Promise<any> => {
  const { status } = req.body;

  if (!status || typeof status !== "string") {
    return res.status(400).json({ error: "Parametro 'status' mancante o invalido." });
  }

  const prompt = `
Lo stato attuale del volto dell'utente è: "${status}".

Basandoti solo su questo stato, rispondi in una sola frase, scegliendo tra:

- L'utente sembra concentrato.
- L'utente sembra distratto (scrivendo in poche parole cosa sta facendo se ride/sta al telefono/fa altro).
- Nessun volto rilevato.
- L'utente sembra assente.

Non scrivere altro. Nessun commento introduttivo o conclusivo. Tutto Molto Breve.
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
      return res.status(500).json({ error: "Errore durante la valutazione AI." });
    }

    const valutazione: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessuna valutazione disponibile.";
    res.json({ valutazione });
  } catch (error) {
    console.error("Errore AI generale:", error);
    res.status(500).json({ error: "Errore interno nel generatore AI." });
  }
});


export default aiRouter;
