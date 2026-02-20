import express from "express";
import fs from "fs";
import { google } from "googleapis";
import { XMLParser } from "fast-xml-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Load credentials + token
const credentials = JSON.parse(fs.readFileSync("./credentials.json"));
const token = JSON.parse(fs.readFileSync("./token.json"));

const { client_id, client_secret, redirect_uris } =
  credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

oAuth2Client.setCredentials(token);

const youtube = google.youtube({
  version: "v3",
  auth: oAuth2Client,
});

app.get("/", (req, res) => {
  res.send("YouTube Transcript API running");
});

app.get("/api/transcript/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    // 1️⃣ List captions
    const captionsList = await youtube.captions.list({
      part: "snippet",
      videoId,
    });

    if (!captionsList.data.items || captionsList.data.items.length === 0) {
      return res.status(404).json({ error: "No captions found" });
    }

    const captionId = captionsList.data.items[0].id;

    // 2️⃣ Download captions as text
    const captionRes = await youtube.captions.download(
      { id: captionId, tfmt: "ttml" },
      { responseType: "text" } // ⭐ IMPORTANT
    );

    const xml = captionRes.data;

    // 3️⃣ Parse XML
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);

    const paragraphs = json?.tt?.body?.div?.p || [];

    const extractText = (node) => {
      if (typeof node === "string") return node;

      if (node?.span) {
        if (Array.isArray(node.span)) {
          return node.span.map(extractText).join(" ");
        }
        return extractText(node.span);
      }

      return node["#text"] || "";
    };

    const transcript = paragraphs
      .map(extractText)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    res.json({ videoId, transcript });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: "Transcript fetch failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
