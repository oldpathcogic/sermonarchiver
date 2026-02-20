import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Sermon Archiver API running");
});

/**
 * 🎯 Transcript endpoint using YouTube Player API
 */
app.get("/transcript", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    // 1️⃣ Call YouTube player API
    const playerRes = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA-YouTubeKey",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00"
            }
          },
          videoId
        })
      }
    );

    const playerData = await playerRes.json();

    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No transcript available" });
    }

    // Prefer English
    const track =
      tracks.find(t => t.languageCode === "en") || tracks[0];

    // 2️⃣ Fetch caption XML
    const transcriptRes = await fetch(track.baseUrl);
    const xml = await transcriptRes.text();

    // 3️⃣ Parse XML
    const lines = [...xml.matchAll(/<text start="(.*?)" dur="(.*?)">(.*?)<\/text>/g)];

    const transcript = lines.map(match => ({
      text: match[3]
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&"),
      start: parseFloat(match[1]),
      dur: parseFloat(match[2])
    }));

    res.json({ transcript });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcript fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
