/* Uploads one client file (base64) into Supabase Storage under the lead's
   folder, and returns its public URL. Called by the activation page after
   a submission. Best-effort: no-op if Supabase isn't configured. */
const supabase = require('./lib/supabase');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!supabase.supabaseEnabled()) return { statusCode: 200, headers: cors, body: JSON.stringify({ skipped: 'storage-not-configured' }) };

  try {
    const { leadId, name, mimeType, base64 } = JSON.parse(event.body || '{}');
    if (!leadId || !base64) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing leadId or base64' }) };
    await supabase.ensureBucket();
    const buf = Buffer.from(base64, 'base64');
    const safe = String(name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const pathKey = `${encodeURIComponent(leadId)}/${encodeURIComponent(safe)}`;
    const url = await supabase.uploadToStorage(pathKey, buf, mimeType);
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, url, name: safe }) };
  } catch (err) {
    console.error('file-upload error', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
