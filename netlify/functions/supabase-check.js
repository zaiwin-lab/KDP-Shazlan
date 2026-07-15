/* Temporary setup diagnostic for the Supabase backup. Reveals no secrets. */
const supabase = require('./lib/supabase');
const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const json = (o) => ({ statusCode: 200, headers: cors, body: JSON.stringify(o, null, 2) });

exports.handler = async () => {
  const out = {
    supabaseEnabled: supabase.supabaseEnabled(),
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'MISSING',
    },
  };
  out.target = supabase.apiOrigin() + '/rest/v1/submissions';
  if (!out.supabaseEnabled) { out.verdict = 'Missing an env var above.'; return json(out); }
  try {
    await supabase.upsertRow({ id: '__healthcheck__', businessName: 'healthcheck', createdAt: new Date().toISOString() });
    await supabase.deleteRow('__healthcheck__');
    out.verdict = '✅ Supabase reachable and the submissions table is writable — backup is active.';
  } catch (e) {
    out.error = e.message;
    out.verdict = 'Env is set but the write failed → make sure you ran the CREATE TABLE SQL and the service_role key is correct.';
  }
  return json(out);
};
