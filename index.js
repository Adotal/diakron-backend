// index.js
// This backend file accepts raw JPEG files
import express from "express";
import { Client } from "@gradio/client";

const app = express();
app.use(express.raw({ type: "image/jpeg", limit: "5mb" }));

const client = await Client.connect("Adotal/TrashNet");

app.post("/analyze", async (req, res) => {
  try {
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: "No image received" });
    }

    const imageBlob = new Blob([req.body], { type: "image/jpeg" });

    const result = await client.predict("/predict", {
      img: imageBlob
    });

    res.json({
      success: true,
      predicted: result.data[0].label,
      confidences: result.data[0].confidences.map(c => ({
        label: c.label,
        confidence: Math.round(c.confidence * 100)
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Inference failed" });
  }
});

app.listen(3000);
