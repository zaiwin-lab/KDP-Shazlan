/* Temporary diagnostic: confirms whether Drive file uploads work (OAuth). */
const drive = require('./lib/drive');
const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (o) => ({ statusCode: 200, headers: cors, body: JSON.stringify(o, null, 2) });

exports.handler = async () => {
  const out = {
    oauthEnabled: drive.oauthEnabled(),
    canUploadFiles: drive.canUploadFiles(),
    env: {
      GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID ? 'set' : 'MISSING',
      GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'set' : 'MISSING',
      GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? 'set' : 'MISSING',
      DRIVE_MASTER_FOLDER_ID: process.env.DRIVE_MASTER_FOLDER_ID ? 'set' : 'MISSING',
    },
  };
  if (!drive.driveEnabled()) { out.verdict = 'Drive not configured.'; return json(out); }
  try {
    const token = await drive.getToken();
    out.auth = drive.oauthEnabled() ? 'OAuth (your Google account)' : 'service account (folders only)';
    if (!drive.canUploadFiles()) { out.verdict = '⚠️ Service account only — folders work but files do NOT. Add the 3 GOOGLE_OAUTH_* env vars.'; return json(out); }
    const master = process.env.DRIVE_MASTER_FOLDER_ID;
    const r = await drive.uploadFile(token, master, '__healthcheck__.txt', 'text/plain', Buffer.from('ok'));
    if (r.id) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${r.id}?supportsAllDrives=true`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      out.testUpload = 'success';
      out.verdict = '✅ OAuth works — files now save into Google Drive.';
    } else { out.testUpload = 'failed'; out.verdict = '⚠️ Upload returned no id.'; }
  } catch (e) { out.error = e.message; out.verdict = '⚠️ ' + e.message; }
  return json(out);
};
