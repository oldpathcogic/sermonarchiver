import express from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import { execSync } from "child_process";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;
    const file = "audio.mp3";

    // download audio
    const stream = ytdl(url, { filter: "audioonly" });
    const write = fs.createWriteStream(file);
    stream.pipe(write);

    await new Promise(resolve => write.on("finish", resolve));

    // transcribe
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(file),
      model: "gpt-4o-transcribe"
    });

    fs.unlinkSync(file);

    res.json({ text: transcript.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running"));
