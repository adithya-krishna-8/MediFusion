import axios from 'axios';

const baseURL = (process.env.REACT_APP_API_URL || 'http://localhost/api').replace(/\/$/, '');

const axiosClient = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosClient;
