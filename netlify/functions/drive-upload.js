/* Uploads one client file (base64) into its Google Drive company folder.
   Called by the activation page after a submission returns a driveFolderId. */
const drive = require('./lib/drive');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!drive.canUploadFiles()) return { statusCode: 200, headers: cors, body: JSON.stringify({ skipped: 'drive-oauth-not-configured' }) };

  try {
    const { folderId, name, mimeType, base64 } = JSON.parse(event.body || '{}');
    if (!folderId || !base64) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing folderId or base64' }) };
    const token = await drive.getToken();
    const buf = Buffer.from(base64, 'base64');
    const r = await drive.uploadFile(token, folderId, name || 'file', mimeType || 'application/octet-stream', buf);
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, id: r.id }) };
  } catch (err) {
    console.error('drive-upload error', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
