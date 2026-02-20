import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Sermon Archiver API running");
});

/**
 * 🎯 Transcript endpoint using YouTube Innertube captions API
 */
app.get("/transcript", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    // 1️⃣ Get video page
    const watchRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }
    );

    const html = await watchRes.text();

    // 2️⃣ Extract captions JSON
    const captionsMatch = html.match(
      /"captions":(\{.*?"playerCaptionsTracklistRenderer".*?\})/
    );

    if (!captionsMatch) {
      return res.status(404).json({ error: "No captions found" });
    }

    const captionsJSON = JSON.parse(captionsMatch[1]);

    const tracks =
      captionsJSON.playerCaptionsTracklistRenderer.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No transcript available" });
    }

    // 3️⃣ Prefer English
    const track =
      tracks.find(t => t.languageCode === "en") || tracks[0];

    // 4️⃣ Fetch caption XML
    const transcriptRes = await fetch(track.baseUrl);
    const xml = await transcriptRes.text();

    // 5️⃣ Parse XML
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
