import axios from 'axios';
import { attachAuthInterceptors } from './interceptors';

// Records microservice. Uses the same JWT that node-service issued at login:
// pythonApi.get('/api/records') -> ${VITE_PYTHON_API_URL}/api/records
const pythonApi = axios.create({
  baseURL: import.meta.env.VITE_PYTHON_API_URL,
  timeout: 10000,
});

attachAuthInterceptors(pythonApi);

export default pythonApi;
