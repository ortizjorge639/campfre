import { put, list, del } from '@vercel/blob';

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
      // For private stores, blob.url includes a token for download
      const resp = await fetch(blobs[0].downloadUrl);
      if (!resp.ok) return res.status(404).json({ error: 'fetch failed', status: resp.status });
      const data = await resp.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message, stack: err.stack?.split('\n')[0] });
    }
  }

  if (req.method === 'POST') {
    try {
      // Delete old blob if exists
      const { blobs } = await list({ prefix: path, limit: 1 });
      if (blobs.length > 0) await del(blobs.map(b => b.url));
      // Save new state
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
