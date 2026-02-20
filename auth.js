import fs from "fs";
import readline from "readline";
import { google } from "googleapis";

const credentials = JSON.parse(
  fs.readFileSync("./credentials.json")
);

const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  prompt: "consent",
});

console.log("👉 Open this URL:\n", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync("./token.json", JSON.stringify(tokens, null, 2));

    console.log("✅ Tokens saved to token.json");
    rl.close();
  } catch (err) {
    console.error("❌ Error exchanging code:", err);
    rl.close();
  }
});
