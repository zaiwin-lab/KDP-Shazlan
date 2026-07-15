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
  return {
    email: process.env.GOOGLE_CLIENT_EMAIL || '',
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    master: process.env.DRIVE_MASTER_FOLDER_ID || '',
  };
}
function driveEnabled() { const c = cfg(); return !!(c.email && c.key && c.master); }
function folderUrl(id) { return `https://drive.google.com/drive/folders/${id}`; }

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
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

module.exports = { driveEnabled, folderUrl, getToken, findFolder, createFolder, ensureCompanyFolder, uploadFile, uploadText };
