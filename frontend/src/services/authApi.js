import nodeApi from './nodeApi';

export async function loginRequest(email, password) {
  const { data } = await nodeApi.post('/api/auth/login', { email, password });
  return data; // { success, message, token, data: { user } }
}

export async function registerRequest(name, email, password) {
  const { data } = await nodeApi.post('/api/auth/register', { name, email, password });
  return data;
}
