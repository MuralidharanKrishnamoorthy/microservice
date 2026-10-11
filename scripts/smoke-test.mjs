// End-to-end smoke test across the RUNNING services — does what the React app does:
//   register + login on Node -> save + fetch records on Python with the SAME JWT.
// Usage (all services started):  node scripts/smoke-test.mjs
const NODE = process.env.NODE_API_URL || 'http://localhost:5000';
const PYTHON = process.env.PYTHON_API_URL || 'http://localhost:8000';
const ORIGIN = 'http://localhost:5173';

let failures = 0;
function check(label, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!condition) failures += 1;
}

async function call(base, method, path, { token, body, origin = ORIGIN } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json, headers: res.headers };
}

const id = Date.now();
const user = { name: 'Smoke Test', email: `smoke_${id}@example.com`, password: 'Password@123' };
const record = { name: 'Jane Doe', email: 'jane@example.com', age: 40, department: 'Data', description: 'Analyst' };

const nodeHealth = await call(NODE, 'GET', '/health');
check('node /health: postgres + redis up', nodeHealth.status === 200, JSON.stringify(nodeHealth.body?.data));
const pyHealth = await call(PYTHON, 'GET', '/health');
check('python /health: postgres up', pyHealth.status === 200, JSON.stringify(pyHealth.body?.data));

// Node: identity
const reg = await call(NODE, 'POST', '/api/auth/register', { body: user });
check('register on node', reg.status === 201);
const login = await call(NODE, 'POST', '/api/auth/login', { body: { email: user.email, password: user.password } });
check('login on node returns JWT', login.status === 200 && Boolean(login.body?.token));
const token = login.body?.token;

// Python: records, authorized by Node's token
const saved = await call(PYTHON, 'POST', '/api/records', { token, body: record });
check('python accepts node-issued JWT and saves record', saved.status === 201, JSON.stringify(saved.body?.data));
check('record belongs to the logged-in user', saved.body?.data?.userId === reg.body?.data?.user?.id);

const fetched = await call(PYTHON, 'GET', '/api/records', { token });
check('python fetches the saved record', fetched.status === 200 && fetched.body?.data?.length === 1);

check('python rejects missing JWT', (await call(PYTHON, 'GET', '/api/records')).status === 401);
check('node no longer serves records', (await call(NODE, 'GET', '/api/records', { token })).status === 404);

check('CORS allows frontend origin on node', login.headers.get('access-control-allow-origin') === ORIGIN);
check('CORS allows frontend origin on python', fetched.headers.get('access-control-allow-origin') === ORIGIN);
const evil = await call(NODE, 'GET', '/health', { origin: 'http://evil.example' });
check('CORS does not allow other origins', evil.headers.get('access-control-allow-origin') !== 'http://evil.example');

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} smoke check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
