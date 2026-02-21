// newindex.js
// index.js

import express, { raw } from "express";

// To send raw JPEG files to HugginFace:
import { Client } from "@gradio/client";

// Check ed25519 signatures
import * as ed from "@noble/ed25519";

import { sha512 } from "@noble/hashes/sha2.js";
ed.hashes.sha512 = sha512;

const app = express();

//-----------------------RAW IMAGE TO HUGGINFACE----------------------//

const imageParser = express.raw({ type: "image/jpeg", limit: "5mb" });

const client = await Client.connect("Adotal/TrashNet");

// When reiciving and image
app.post("/analyze", imageParser, async (req, res) => {
  try {
    // Check existence
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: "No image received" });
    }

    // Create raw image
    const imageBlob = new Blob([req.body], { type: "image/jpeg" });

    // Send raw image and receive result
    const result = await client.predict("/predict", {
      img: imageBlob,
    });

    // Add format to reiceverd JSON
    res.json({
      success: true,
      predicted: result.data[0].label,
      confidences: result.data[0].confidences.map((c) => ({
        label: c.label,
        confidence: Math.round(c.confidence * 100),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Inference failed" });
  }
});

//-----------------------QR VERIFY SIGNATURE--------------------------//
// Parser for QR payload
const qrParser = express.raw({
  type: "application/octet-stream",
  limit: "128b",    // Only 88b needed, but allows tiny variations
});

// 32-byte public key
const publicKey = Uint8Array.from([
  0x91, 0x96, 0x0d, 0x0c, 0x77, 0x1c, 0x93, 0xe6, 0x66, 0xc0, 0x73, 0x43, 0x6f,
  0x1b, 0xb3, 0xcf, 0x0c, 0xc2, 0x32, 0x4e, 0xe9, 0x82, 0xd8, 0xdf, 0xf6, 0xf2,
  0x86, 0x49, 0xb8, 0x9b, 0xea, 0x3c,
]);

app.post("/verify-qr", qrParser, (req, res) => {
  try {
    // req.body is automatically fully populated as a Buffer by express.raw()
    const data = req.body;

    // TESTING
    // console.log("Buffer: ", data);
    // console.log(`Received raw binary data of length: ${data.length} bytes`);

    // Ensure we actually received data and it's long enough
    // Ed25519 signatures are exactly 64 bytes.
    if (!data || !Buffer.isBuffer(data) || data.length < 64) {
      return res.status(400).json({
        valid: false,
        error:
          "Payload is too small or invalid to contain a 64-byte signature.",
      });
    }

    // Extract message and signature cleanly
    const message = new Uint8Array(data.subarray(0, data.length - 64));
    const signature = new Uint8Array(data.subarray(data.length - 64));

    // Verify the signature
    const isValid = ed.verify(signature, message, publicKey);

    // If the signature is not valid
    if (!isValid) {
      return res.json({ valid: false });
    }

    // HERE THE BACKEND MUST CALCULATE HOW MANY POINTS THE USER DESERVES
    const points = 1415; // TESTING

    // Send a structured JSON response
    return res.status(200).json({
      valid: true,
      points: points,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
