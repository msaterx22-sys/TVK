// Simple API smoke test for local dev server
(async () => {
  const base = 'http://localhost:3000';
  try {
    console.log('Testing admin login...');
    const loginRes = await fetch(base + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'TVK', password: 'TVKACK' })
    });
    console.log('login status:', loginRes.status);
    const loginText = await loginRes.text();
    console.log('login body:', loginText);

    let token = null;
    try { token = JSON.parse(loginText).token; } catch (_) { }

    console.log('Testing get petitions...');
    const petRes = await fetch(base + '/api/petitions');
    console.log('petitions status:', petRes.status);
    const petText = await petRes.text();
    console.log('petitions body (truncated):', petText.slice(0, 400));

    if (token) {
      console.log('Testing admin petitions with token...');
      const adminRes = await fetch(base + '/api/admin/petitions', { headers: { Authorization: `Bearer ${token}` } });
      console.log('admin petitions status:', adminRes.status);
      const adminText = await adminRes.text();
      console.log('admin petitions body (truncated):', adminText.slice(0, 400));
    } else {
      console.log('No token received; skipping admin-protected request');
    }
  } catch (err) {
    console.error('Error running tests:', err);
    process.exitCode = 2;
  }
})();
