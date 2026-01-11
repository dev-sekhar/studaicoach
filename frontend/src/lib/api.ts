import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh or logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // TODO: Implement refresh token logic here
        if (error.response?.status === 401 && !originalRequest._retry) {
            // For now, just logout
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            Cookies.remove('user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);
