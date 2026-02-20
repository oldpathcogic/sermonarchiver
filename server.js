import express from "express";

const app = express();

/**
 * GET /api/transcript/:videoId
 */
app.get("/api/transcript/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    // 1️⃣ Fetch YouTube watch page
    const watchRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`
    );
    const html = await watchRes.text();

    // 2️⃣ Extract player response JSON
    const playerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/
    );

    if (!playerResponseMatch) {
      return res.status(404).json({ error: "Player response not found" });
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);

    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "No captions available" });
    }

    // 3️⃣ Pick English track (fallback to first)
    const englishTrack =
      tracks.find((t) => t.languageCode === "en") || tracks[0];

    const captionUrl = englishTrack.baseUrl;

    // 4️⃣ Fetch caption XML
    const captionRes = await fetch(captionUrl);
    const xml = await captionRes.text();

    // 5️⃣ Parse XML → plain text
    const textMatches = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/g)];

    const transcript = textMatches
      .map((m) =>
        m[1]
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/<[^>]+>/g, "")
      )
      .join(" ");

    return res.json({
      videoId,
      language: englishTrack.languageCode,
      transcript,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

export default app;
