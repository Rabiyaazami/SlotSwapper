const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { ...opts, headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text || '{}');
    if (!res.ok) throw json;
    return json;
  } catch (e) {
    throw typeof e === 'object' ? e : { error: text || e.toString() };
  }
}
