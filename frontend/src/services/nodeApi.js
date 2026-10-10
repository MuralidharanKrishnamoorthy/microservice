import axios from 'axios';
import { attachAuthInterceptors } from './interceptors';

// Identity service (register / login / me). Base URL comes from .env, never hardcoded:
// nodeApi.post('/api/auth/login') -> ${VITE_NODE_API_URL}/api/auth/login
const nodeApi = axios.create({
  baseURL: import.meta.env.VITE_NODE_API_URL,
  timeout: 10000,
});

attachAuthInterceptors(nodeApi);

export default nodeApi;
