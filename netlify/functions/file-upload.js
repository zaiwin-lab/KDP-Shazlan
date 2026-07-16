/* Uploads one client file (base64) into Supabase Storage under the lead's
   folder, and returns its public URL. Called by the activation page after
   a submission. Best-effort: no-op if Supabase isn't configured. */
const supabase = require('./lib/supabase');
const drive = require('./lib/drive');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  try {
    const { leadId, driveFolderId, name, mimeType, base64 } = JSON.parse(event.body || '{}');
    if (!leadId || !base64) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing leadId or base64' }) };
    const buf = Buffer.from(base64, 'base64');
    const safe = String(name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120);

    // 1) reliable copy in Supabase Storage (dashboard links use this)
    let url = null;
    if (supabase.supabaseEnabled()) {
      await supabase.ensureBucket();
      const pathKey = `${encodeURIComponent(leadId)}/${encodeURIComponent(safe)}`;
      url = await supabase.uploadToStorage(pathKey, buf, mimeType);
    }

    // 2) also drop it into the client's Google Drive folder (OAuth only)
    let driveOk = false;
    if (driveFolderId && drive.canUploadFiles()) {
      try {
        const token = await drive.getToken();
        await drive.uploadFile(token, driveFolderId, safe, mimeType || 'application/octet-stream', buf);
        driveOk = true;
      } catch (e) { console.error('drive file upload:', e.message); }
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, url, name: safe, drive: driveOk }) };
  } catch (err) {
    console.error('file-upload error', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
