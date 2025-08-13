import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE || 'https://witty-planets-allow.loca.lt/api';

const api = axios.create({ baseURL });

export default api;
