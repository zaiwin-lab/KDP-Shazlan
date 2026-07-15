/* Temporary setup diagnostic: reports what's configured for Drive.
   No secrets are returned — only booleans, the folder name, and error text. */
const drive = require('./lib/drive');

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (o) => ({ statusCode: 200, headers: cors, body: JSON.stringify(o, null, 2) });

exports.handler = async () => {
  const out = {
    driveEnabled: drive.driveEnabled(),
    env: {
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'set' : '(none — will read from JSON)',
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'set' : 'MISSING',
      DRIVE_MASTER_FOLDER_ID: process.env.DRIVE_MASTER_FOLDER_ID ? process.env.DRIVE_MASTER_FOLDER_ID : 'MISSING',
    },
  };
  if (!out.driveEnabled) { out.verdict = 'Drive not enabled — an env var above is missing.'; return json(out); }
  try {
    const token = await drive.getToken();
    out.auth = 'ok (service account authenticated)';
    const master = process.env.DRIVE_MASTER_FOLDER_ID;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${master}?fields=id,name&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (j && j.id) { out.folder = { id: j.id, name: j.name }; out.verdict = '✅ All good — folder is reachable. Auto-save will work.'; }
    else { out.folderError = j.error || j; out.verdict = 'Authenticated, but cannot read the folder → check the folder is SHARED with the service account (Editor) and the Drive API is ENABLED, and the folder ID is correct.'; }
  } catch (e) {
    out.authError = e.message;
    out.verdict = 'Authentication failed → GOOGLE_PRIVATE_KEY value is wrong/incomplete.';
  }
  return json(out);
};
