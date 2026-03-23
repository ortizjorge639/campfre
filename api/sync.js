import { put, get, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  const key = req.query.key;
  if (!key || key.length < 6) {
    return res.status(400).json({ error: 'Invalid sync key' });
  }

  const path = `campfre/${key}.json`;

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: path, limit: 1 });
      if (blobs.length === 0) return res.status(404).json({ error: 'not found' });
      const blob = await get(blobs[0].url, { access: 'private' });
      const reader = blob.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const text = Buffer.concat(chunks).toString('utf-8');
      return res.status(200).json(JSON.parse(text));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { blobs } = await list({ prefix: path, limit: 1 });
      if (blobs.length > 0) await del(blobs.map(b => b.url));
      await put(path, JSON.stringify(req.body), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
