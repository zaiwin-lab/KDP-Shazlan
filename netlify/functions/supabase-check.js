/* Temporary verification: reports the live row count in the submissions table. */
const supabase = require('./lib/supabase');
const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (o) => ({ statusCode: 200, headers: cors, body: JSON.stringify(o, null, 2) });

exports.handler = async () => {
  const out = { supabaseEnabled: supabase.supabaseEnabled(), target: supabase.apiOrigin() + '/rest/v1/submissions' };
  try {
    out.rowCount = await supabase.countRows();
    out.verdict = String(out.rowCount).match(/^\d+$/) ? `✅ ${out.rowCount} rows in the submissions table.` : `⚠️ Could not read rows: ${out.rowCount}`;
  } catch (e) { out.error = e.message; out.verdict = '⚠️ ' + e.message; }
  return json(out);
};
