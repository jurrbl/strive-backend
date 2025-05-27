import express, { Request, Response } from "express";
import OpenAI from "openai";

import dotenv from "dotenv";

dotenv.config();

const aiRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/ai/summary → Genera resoconto AI basato su dati grafico
aiRouter.post("/ai/summary", async (req: Request, res: Response) : Promise <any> => {
  const { graphData } = req.body;

  if (!graphData || !Array.isArray(graphData)) {
    return res.status(400).json({ summary: "Dati non validi per l'analisi." });
  }

  const prompt = `
Ecco dei dati relativi al tempo trascorso in attività giornaliere da uno studente:

${JSON.stringify(graphData, null, 2)}

Analizza l'andamento dell'attività di studio, evidenzia eventuali miglioramenti o cali, confronta il tempo dedicato allo studio rispetto al tempo speso in attività social o di intrattenimento.
Scrivi un breve resoconto professionale di massimo 5 righe.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // puoi usare anche "gpt-4" se hai accesso
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI che analizza grafici di tempo e studio.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const output = completion.choices[0].message?.content || "Nessuna risposta generata.";
    res.json({ summary: output });
  } catch (error) {
    console.error("Errore AI OpenAI:", error);
    res.status(500).json({ summary: "Errore durante l'elaborazione del resoconto AI." });
  }
});

export default aiRouter;
