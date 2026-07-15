/* =====================================================================
   supabase.js — mirror every submission into a Supabase Postgres table
   as a durable, queryable backup. Uses the PostgREST API + fetch only.

   Required Netlify env vars:
     SUPABASE_URL          — e.g. https://xxxx.supabase.co
     SUPABASE_SERVICE_KEY  — the service_role key (Project settings → API)
   Best-effort: if unset or a call fails, the primary flow is unaffected.
   ===================================================================== */
function cfg() {
  let url = (process.env.SUPABASE_URL || '').trim();
  // tolerate a pasted dashboard URL or a full REST path — reduce to the API origin
  const m = url.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  if (m) url = m[0];
  url = url.replace(/\/+$/, '');
  return { url, key: (process.env.SUPABASE_SERVICE_KEY || '').trim() };
}
function apiOrigin() { return cfg().url; }
function supabaseEnabled() { const c = cfg(); return !!(c.url && c.key); }

function headers() {
  const { key } = cfg();
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Map a submission record onto table columns; keep the full record in `data`.
function toRow(r) {
  return {
    id: r.id,
    business_name: r.businessName || null,
    owner_name: r.ownerName || null,
    email: r.email || null,
    mobile: r.mobile || null,
    district: r.district || null,
    industry: r.industry || null,
    stage: r.stage || null,
    lead_score: typeof r.leadScore === 'number' ? r.leadScore : null,
    seq: typeof r.seq === 'number' ? r.seq : null,
    drive_url: r.driveUrl || null,
    created_at: r.createdAt || null,
    updated_at: new Date().toISOString(),
    data: r,
  };
}

// Insert or update by primary key (id).
async function upsertRow(record) {
  if (!supabaseEnabled() || !record || !record.id) return;
  const { url } = cfg();
  const res = await fetch(`${url}/rest/v1/submissions?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(toRow(record)),
  });
  if (!res.ok) throw new Error('supabase upsert ' + res.status + ' ' + (await res.text()));
}

async function deleteRow(id) {
  if (!supabaseEnabled() || !id) return;
  const { url } = cfg();
  const res = await fetch(`${url}/rest/v1/submissions?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...headers(), Prefer: 'return=minimal' },
  });
  if (!res.ok) throw new Error('supabase delete ' + res.status + ' ' + (await res.text()));
}

module.exports = { supabaseEnabled, upsertRow, deleteRow, apiOrigin };
