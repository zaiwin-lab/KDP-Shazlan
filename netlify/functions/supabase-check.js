/* Retired setup diagnostic. Neutralised (Netlify won't purge deleted functions
   via proxy deploys), so it reveals nothing. */
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gone: true }),
});
