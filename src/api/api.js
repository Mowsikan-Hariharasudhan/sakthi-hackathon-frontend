import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE || 'https://sakthi-hackathon-2.onrender.com/api';

const api = axios.create({ baseURL });

export default api;
