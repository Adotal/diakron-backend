// index.js
import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL;

const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// --- ENDPOINT PRINCIPAL ---
app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image received" });
  }

  try {
    const imageBuffer = fs.readFileSync(req.file.path);

    const hfResponse = await axios.post(
      HF_URL,
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream"
        },
        timeout: 25000
      }
    );

    fs.unlinkSync(req.file.path);

    // HuggingFace devuelve array ordenado por score
    const prediction = hfResponse.data[0];

    res.json({
      success: true,
      label: prediction.label,
      confidence: Number(prediction.score.toFixed(3))
    });

  } catch (err) {
    console.error("HF ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Inference failed"
    });
  }
});

// --- HEALTH CHECK ---
app.get("/", (_, res) => {
  res.send("DIAKRON backend running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});