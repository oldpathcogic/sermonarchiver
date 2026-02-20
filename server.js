import express from "express";
import fetch from "node-fetch";
import { YoutubeTranscript } from "youtube-transcript";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 🛡️ Fix for Render / cloud IP blocking
 * Forces a browser-like user agent for transcript requests
 */
global.fetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ...(options.headers || {})
    }
  });

/**
 * ✅ Health check
 */
app.get("/", (req, res) => {
  res.send("Sermon Archiver API running");
});

/**
 * 🎯 TRANSCRIPT ENDPOINT
 */
app.get("/transcript", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    let transcript = null;

    // 🔹 Attempt 1 — normal fetch (includes auto captions)
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
        country: "US",
        includeGenerated: true
      });
    } catch (err) {
      console.log("Primary transcript fetch failed:", err.message);
    }

    // 🔹 Validate transcript
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: "No transcript available" });
    }

    // 🔹 Normalize format for Apps Script
    const normalized = transcript.map(seg => ({
      text: seg.text,
      start: (seg.offset || 0) / 1000,
      dur: (seg.duration || 0) / 1000
    }));

    console.log(`Transcript success: ${videoId} (${normalized.length} segments)`);

    return res.json({ transcript: normalized });

  } catch (err) {
    console.error("Transcript endpoint error:", err);
    return res.status(500).json({ error: "Transcript fetch failed" });
  }
});

/**
 * 🚀 Start server
 */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
