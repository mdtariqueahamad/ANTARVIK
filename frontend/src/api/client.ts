import axios from 'axios';
import toast from 'react-hot-toast';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach JWT
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('antarvik_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor – handle errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('antarvik_token');
        localStorage.removeItem('antarvik_refresh');
        window.location.href = '/login';
      } else if (status === 403) {
        toast.error('Insufficient permissions');
      } else if (status === 422) {
        toast.error(data?.detail || 'Validation error');
      } else if (status >= 500) {
        toast.error('Server error – check connectivity');
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout – station may be unreachable');
    } else {
      toast.error('Network error');
    }
    return Promise.reject(error);
  },
);

export default client;
