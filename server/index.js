const express = require('express');
const { create } = require('ipfs-http-client');
const app = express();
app.use(express.json());
app.use(require('cors')()); // Enable CORS for frontend

// IPFS setup (no wallet needed)
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(`${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_API_SECRET}`).toString('base64')}`,
  },
});

// Save tree to IPFS
app.post('/api/tree/save', async (req, res) => {
  const { treeData } = req.body;
  try {
    const { cid } = await ipfs.add(JSON.stringify(treeData));
    res.json({ cid: cid.toString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save to IPFS' });
  }
});

// Fetch tree from IPFS
app.get('/api/tree/:cid', async (req, res) => {
  try {
    const stream = ipfs.cat(req.params.cid);
    let data = '';
    for await (const chunk of stream) data += chunk.toString();
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from IPFS' });
  }
});

// xAI storytelling
app.post('/api/ai/story', async (req, res) => {
  const { treeData } = req.body;
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok', // Check xAI docs for exact model
        messages: [{ role: 'user', content: `Generate a family story from: ${JSON.stringify(treeData)}` }],
      }),
    });
    const data = await response.json();
    res.json(data.choices[0].message.content);
  } catch (error) {
    res.status(500).json({ error: 'AI request failed' });
  }
});

// Handle Vercel serverless
module.exports = app;
