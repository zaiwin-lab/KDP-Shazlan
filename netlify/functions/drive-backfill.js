/* One-time backfill: create a Drive company folder for every existing lead
   that doesn't have one yet, and drop its business brief inside.
   Idempotent (skips leads that already have a folder). */
const { getStore } = require('@netlify/blobs');
const drive = require('./lib/drive');
const supabase = require('./lib/supabase');

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (o) => ({ statusCode: 200, headers: cors, body: JSON.stringify(o, null, 2) });
const blobsConfig = () => ({ siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });

exports.handler = async () => {
  if (!drive.driveEnabled()) return json({ error: 'Drive not enabled' });
  try {
    const store = getStore({ name: 'submissions', consistency: 'strong', ...blobsConfig() });
    const { blobs } = await getStore({ name: 'submissions', ...blobsConfig() }).list();
    let recs = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))).filter(Boolean);
    recs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const token = await drive.getToken();
    const results = [];
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      if (r.driveFolderId) { results.push({ name: r.businessName, status: 'already had folder' }); continue; }
      const seq = r.seq || (i + 1);
      const folderName = `${String(seq).padStart(3, '0')} ${r.businessName || 'Client'}`;
      try {
        const folderId = await drive.ensureCompanyFolder(token, folderName);
        r.seq = seq; r.driveFolderId = folderId; r.driveUrl = drive.folderUrl(folderId);
        await drive.uploadText(token, folderId, '00_business-brief.json', 'application/json', JSON.stringify(r, null, 2));
        await store.setJSON(r.id, r);
        try { await supabase.upsertRow(r); } catch (_) {}
        results.push({ name: r.businessName, folder: folderName, status: 'created' });
      } catch (e) { results.push({ name: r.businessName, error: e.message }); }
    }
    return json({ done: true, count: results.length, results });
  } catch (err) {
    return json({ error: err.message });
  }
};
