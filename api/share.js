// Vercel Serverless Function: First-Party Share Link Handler
// Provides first-party short link resolving and redirection without external dependencies

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers.host || 'invocore.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;

  if (req.method === 'GET') {
    const { id, code } = req.query;
    const shareCode = id || code;

    if (!shareCode) {
      return res.redirect(302, baseUrl);
    }

    // Redirect to the first-party SPA invoice view route /v/:code
    return res.redirect(302, `${baseUrl}/v/${encodeURIComponent(String(shareCode))}`);
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const code = body?.code || body?.id || '';

      if (!code) {
        return res.status(400).json({ error: 'Missing code or id in payload' });
      }

      return res.status(200).json({
        success: true,
        code,
        shareUrl: `${baseUrl}/v/${code}`,
      });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
