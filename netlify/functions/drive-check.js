/* Retired setup diagnostic. Kept only because Netlify won't purge a deleted
   function via proxy deploys; neutralised so it reveals nothing. */
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gone: true }),
});
