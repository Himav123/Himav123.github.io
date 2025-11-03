
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.static("."));
app.use(express.json({ limit: "15mb" }));

// ⚠️ YOUR GEMINI API KEY (local use only)
const GEMINI_API_KEY = "AIzaSyDBjWHy1V5oeI9NT8Z4H5i0CIPsmy1uANE";

// Gemini model endpoint (Gemini 1.5 Flash = fast, cheap, multimodal)
const MODEL = "gemini-1.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

app.post("/api/chat", async (req, res) => {
  const { messages, imageDataUrl } = req.body;

  try {
    // Combine user message(s)
    const userMessage = messages?.[0]?.content || "Hello";

    // Prepare Gemini request
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: userMessage },
            ...(imageDataUrl
              ? [{ inline_data: { mime_type: "image/png", data: imageDataUrl.split(",")[1] } }]
              : []),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    };

    const geminiRes = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(500).send(errText);
      return;
    }

    const data = await geminiRes.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t generate a response.";

    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(3000, () =>
  console.log("♻️ WiseWaste Gemini server running at http://localhost:3000/scan.html")
);
