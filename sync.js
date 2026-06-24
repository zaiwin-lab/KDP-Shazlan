const API = '/.netlify/functions/submissions';

export async function saveSubmission(data) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSubmissions() {
  const r = await fetch(API);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSubmission(id) {
  const r = await fetch(`${API}?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function patchSubmission(id, patch) {
  const r = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteSubmission(id) {
  const r = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
