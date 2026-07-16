

import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { API_BASE_URL } from "./ApiConfig";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies automatically
});

// Optional request interceptor (token or other headers)
// api.interceptors.request.use(...);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): AxiosResponse<unknown> => {
    const res = response.data;
    if (!res.success) {
      throw new Error(res.message || "The API request failed");
    }
    return { ...response, data: res.data };
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized, redirect to login...");
      window.location.href = "/login";
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
;
