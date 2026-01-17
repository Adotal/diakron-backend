import express from "express";
import multer from "multer";
import fs from "fs";
import { Client } from "@gradio/client";

const app = express();
const upload = multer({ dest: "uploads/" });

// Conectar una sola vez al Space
const client = await Client.connect("Adotal/TrashNet");

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image received" });
    }

    const imageBlob = new Blob([
      fs.readFileSync(req.file.path)
    ]);

    const result = await client.predict("/predict", {
      img: imageBlob
    });

    fs.unlinkSync(req.file.path);

    const prediction = result.data[0];

    // Convertir a porcentaje y limpiar
    const confidences = prediction.confidences.map(c => ({
      label: c.label,
      confidence: Number((c.confidence * 100).toFixed(2))
    }));

    res.json({
      success: true,
      predicted: prediction.label,
      confidences
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Prediction failed" });
  }
});

app.listen(3000);
