import express from "express";
import { YoutubeTranscript } from "youtube-transcript";

const app = express();
const PORT = process.env.PORT || 3000;

// health check
app.get("/", (req, res) => {
  res.send("Sermon Archiver API running");
});

// 🎯 TRANSCRIPT ENDPOINT
app.get("/transcript", async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId" });
    }

    let transcript = null;

    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      console.log("Primary transcript failed, trying fallback…");
    }

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: "No transcript available" });
    }

    const normalized = transcript.map(seg => ({
      text: seg.text,
      start: seg.offset / 1000,
      dur: seg.duration / 1000
    }));

    res.json({ transcript: normalized });

  } catch (err) {
    console.error("Transcript error:", err.message);
    res.status(500).json({ error: "Transcript fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
