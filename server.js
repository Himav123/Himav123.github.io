import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.static('.'));
app.use(express.json({ limit: '15mb' }));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4.1-mini';

app.post('/api/chat', async (req, res) => {
  const { messages, imageDataUrl } = req.body;
  try {
    const parts = [];
    if (messages?.[0]?.content) parts.push({ type: 'input_text', text: messages[0].content });
    if (imageDataUrl) parts.push({ type: 'input_image', image_url: imageDataUrl });

    const sysPrompt = `You are WiseWaste, a friendly assistant who helps classify waste items.
Always output the following fields on separate lines when classifying images:
Type: ...
Biodegradability: ...
Recommended Bin: ...
Tip: ...`;

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: sysPrompt }] },
          { role: 'user', content: parts }
        ],
        stream: true
      })
    });

    if (!openaiRes.ok || !openaiRes.body) {
      res.status(500).send(await openaiRes.text());
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (json === '[DONE]') continue;
        try {
          const evt = JSON.parse(json);
          const delta = evt?.delta?.output_text ?? '';
          if (delta) res.write(delta);
        } catch {}
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(3000, () => console.log('🌿 WiseWaste running at http://localhost:3000/scan.html'));
