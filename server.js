import express from "express";
import axios from "axios";
import ytdl from "ytdl-core";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/transcribe", async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "Missing videoId" });

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const tempFile = path.join(os.tmpdir(), `${videoId}.mp3`);

    // 🎧 Download audio
    const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
    const writeStream = fs.createWriteStream(tempFile);

    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    // 📤 Send to OpenAI transcription
    const formData = new FormData();
    formData.append("file", fs.createReadStream(tempFile));
    formData.append("model", "gpt-4o-transcribe");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    fs.unlinkSync(tempFile);

    return res.json({
      transcript: response.data.text,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Transcription failed" });
  }
});

app.get("/", (req, res) => res.send("Transcription server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
