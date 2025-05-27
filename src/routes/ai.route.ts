import express, { Request, Response } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const aiRouter = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

aiRouter.post("/ai/summary", async (req: Request, res: Response) : Promise <any> => {
  const { graphData } = req.body;

  if (!graphData || !Array.isArray(graphData)) {
    return res.status(400).json({ summary: "Dati non validi per l'analisi." });
  }

  const prompt = `
Analizza i seguenti dati di studio dell’utente (tempo dedicato allo studio, ai social e all’intrattenimento, giorno per giorno). 
Fornisci un resoconto dettagliato in massimo 5 righe che includa:

- un’analisi dei trend generali (aumento/diminuzione dello studio),
- i giorni migliori e peggiori per lo studio,
- un’opinione sull’efficacia generale del tempo speso,
- e **1 o 2 consigli pratici e motivanti** per migliorare l’equilibrio tra studio e distrazioni.

Il tono deve essere positivo, incoraggiante e costruttivo.
Dati:
${JSON.stringify(graphData, null, 2)}
`;

  try {
   const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Gemini:", data);
      return res.status(500).json({ summary: "Errore durante la generazione AI." });
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessun risultato.";
    res.json({ summary: output });
  } catch (error) {
    console.error("Errore generale AI:", error);
    res.status(500).json({ summary: "Errore interno nel generatore AI." });
  }
});

export default aiRouter;
