import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cortex_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 responses (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cortex_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== Items =====
export const saveItem = (data) => api.post('/items', data).then(r => r.data);
export const getItems = (params) => api.get('/items', { params }).then(r => r.data);
export const getItem = (id) => api.get(`/items/${id}`).then(r => r.data);
export const deleteItem = (id) => api.delete(`/items/${id}`).then(r => r.data);
export const updateItem = (id, data) => api.patch(`/items/${id}`, data).then(r => r.data);
export const getRelatedItems = (id) => api.get(`/items/${id}/related`).then(r => r.data);

// ===== Highlights =====
export const addHighlight = (itemId, data) => api.post(`/items/${itemId}/highlights`, data).then(r => r.data);
export const deleteHighlight = (itemId, highlightId) => api.delete(`/items/${itemId}/highlights/${highlightId}`).then(r => r.data);

// ===== Collections =====
export const createCollection = (data) => api.post('/collections', data).then(r => r.data);
export const getCollections = () => api.get('/collections').then(r => r.data);
export const getCollection = (id) => api.get(`/collections/${id}`).then(r => r.data);
export const updateCollection = (id, data) => api.put(`/collections/${id}`, data).then(r => r.data);
export const deleteCollection = (id) => api.delete(`/collections/${id}`).then(r => r.data);
export const addItemToCollection = (colId, itemId) => api.post(`/collections/${colId}/items`, { itemId }).then(r => r.data);
export const removeItemFromCollection = (colId, itemId) => api.delete(`/collections/${colId}/items/${itemId}`).then(r => r.data);

// ===== Search =====
export const searchItems = (query) => api.get('/search', { params: { q: query } }).then(r => r.data);

// ===== Resurface =====
export const getResurfaced = () => api.get('/resurface').then(r => r.data);

// ===== Graph =====
export const getGraphData = () => api.get('/graph').then(r => r.data);
