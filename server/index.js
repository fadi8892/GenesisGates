const express = require('express');
const { create } = require('ipfs-http-client');
const app = express();
app.use(express.json());

// IPFS setup
const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

// Mock auth (replace with real logic later)
app.post('/api/auth/verify', (req, res) => {
  const { code } = req.body;
  if (code === 'TEST123') { // Simple test code
    res.json({ token: 'mock-token' });
  } else {
    res.status(401).json({ error: 'Invalid code' });
  }
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

app.listen(process.env.PORT || 3001, () => console.log('Backend running'));
