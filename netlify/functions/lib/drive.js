/* =====================================================================
   drive.js — Google Drive access for the Syahlan SDC backend.
   Auth via a service account (JWT → OAuth token), no external deps.

   Required Netlify env vars:
     GOOGLE_CLIENT_EMAIL     — service account email (…@…iam.gserviceaccount.com)
     GOOGLE_PRIVATE_KEY      — the service account private key (with \n newlines)
     DRIVE_MASTER_FOLDER_ID  — the "Syahlan SDC - Client Intake" folder id
   The master folder must be shared with GOOGLE_CLIENT_EMAIL as Editor.
   ===================================================================== */
const crypto = require('crypto');

const SCOPE = 'https://www.googleapis.com/auth/drive';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function cfg() {
  let email = process.env.GOOGLE_CLIENT_EMAIL || '';
  let key = process.env.GOOGLE_PRIVATE_KEY || '';
  // Be forgiving: accept the FULL service-account JSON pasted into GOOGLE_PRIVATE_KEY
  // (or a dedicated GOOGLE_SERVICE_ACCOUNT var) and pull the fields out of it.
  const rawJson = (process.env.GOOGLE_SERVICE_ACCOUNT || '').trim() || (key.trim().startsWith('{') ? key.trim() : '');
  if (rawJson) {
    try { const j = JSON.parse(rawJson); if (j.private_key) key = j.private_key; if (!email && j.client_email) email = j.client_email; }
    catch (_) {}
  }
  key = key.replace(/\\n/g, '\n');
  return { email, key, master: process.env.DRIVE_MASTER_FOLDER_ID || '' };
}
// OAuth (the user's own Google account) — the only way to upload FILES into a
// personal Gmail Drive. When configured it takes priority over the service account.
function oauthCfg() {
  return {
    clientId: (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
    refreshToken: (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim(),
  };
}
function oauthEnabled() { const o = oauthCfg(); return !!(o.clientId && o.clientSecret && o.refreshToken); }
// A service account can create folders but can't upload files to a personal Drive;
// only OAuth (acting as the user) can. This gates file uploads.
function canUploadFiles() { return oauthEnabled(); }

function driveEnabled() { const c = cfg(); return !!(c.master && (oauthEnabled() || (c.email && c.key))); }
function folderUrl(id) { return `https://drive.google.com/drive/folders/${id}`; }

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
  // Prefer OAuth (files owned by the user, has storage quota).
  if (oauthEnabled()) {
    const o = oauthCfg();
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: o.clientId, client_secret: o.clientSecret, refresh_token: o.refreshToken, grant_type: 'refresh_token' }).toString(),
    });
    const j = await res.json();
    if (!j.access_token) throw new Error('OAuth token failed: ' + JSON.stringify(j));
    return j.access_token;
  }
  // Service-account JWT fallback (folders only; can't upload files on personal Drive).
  const { email, key } = cfg();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const input = `${header}.${claim}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(key);
  const jwt = `${input}.${b64url(sig)}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Drive auth failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function findFolder(token, name, parent) {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${String(name).replace(/'/g, "\\'")}' and '${parent}' in parents and trashed=false`;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json();
  return (j.files && j.files[0]) || null;
}

async function createFolder(token, name, parent) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name&supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  const j = await res.json();
  if (!j.id) throw new Error('Create folder failed: ' + JSON.stringify(j));
  return j;
}

// Return the id of "<folderName>" under the master folder, creating it if needed.
async function ensureCompanyFolder(token, folderName) {
  const { master } = cfg();
  const existing = await findFolder(token, folderName, master);
  if (existing) return existing.id;
  return (await createFolder(token, folderName, master)).id;
}

// Upload a file (Buffer) into a folder via a multipart request.
async function uploadFile(token, folderId, name, mimeType, buffer) {
  const boundary = 'sdc' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({ name, parents: [folderId] });
  const pre = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;
  const post = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(pre, 'utf8'), buffer, Buffer.from(post, 'utf8')]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name&supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const j = await res.json();
  if (!j.id) throw new Error('Upload failed: ' + JSON.stringify(j));
  return j;
}
async function uploadText(token, folderId, name, mime, text) {
  return uploadFile(token, folderId, name, mime, Buffer.from(String(text), 'utf8'));
}

module.exports = { driveEnabled, canUploadFiles, oauthEnabled, folderUrl, getToken, findFolder, createFolder, ensureCompanyFolder, uploadFile, uploadText };
