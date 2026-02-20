import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Sermon Archiver API running");
});

app.get("/transcript", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    // 📺 TV client returns captions reliably
    const playerRes = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "TVHTML5",
              clientVersion: "7.20240101"
            }
          },
          videoId
        })
      }
    );

    const playerData = await playerRes.json();

    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No transcript available" });
    }

    // Prefer English track
    const track =
      tracks.find(t => t.languageCode === "en") || tracks[0];

    // Fetch XML captions
    const transcriptRes = await fetch(track.baseUrl);
    const xml = await transcriptRes.text();

    const matches = [...xml.matchAll(/<text start="(.*?)" dur="(.*?)">(.*?)<\/text>/g)];

    const transcript = matches.map(m => ({
      text: m[3]
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&"),
      start: parseFloat(m[1]),
      dur: parseFloat(m[2])
    }));

    res.json({ transcript });

  } catch (err) {
    console.error("Transcript error:", err);
    res.status(500).json({ error: "Transcript fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
