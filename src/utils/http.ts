import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface RequestParams {
  [key: string]: string | number | boolean | null | undefined;
}

interface ErrorResponse {
  message?: string;
}

let jwtToken: string | null = null;
const baseURL = import.meta.env.VITE_API_BASE || '/api';
const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    jwtToken = localStorage.getItem('token');
    if (jwtToken && !config.url?.includes('/login')) {
      config.headers = config.headers || {};
      config.headers['authorization'] = `${jwtToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Wrapper for GET requests
 * @param url - The request URL
 * @param params - Query parameters
 * @param config - Optional Axios request config
 * @returns Promise resolving to the response data
 */
export const get = async <T = unknown>(
  url: string,
  params: RequestParams = {},
  config: AxiosRequestConfig = {}
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await instance.get(url, { params, ...config });
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Wrapper for POST requests
 * @param url - The request URL
 * @param data - Request payload
 * @param config - Optional Axios request config
 * @returns Promise resolving to the response data
 */
export const post = async <T = unknown>(
  url: string,
  data: RequestParams,
  config: AxiosRequestConfig = {}
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await instance.post(url, data, config);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

export const deleteFun = async <T = unknown>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await instance.delete(url, {
      ...config,
    });
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

export const putFun = async <T = unknown>(
  url: string,
  data: RequestParams,
  config: AxiosRequestConfig = {}
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await instance.put(url, data, config);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Unified error handler for API requests
 * @param error - The original error thrown
 * @returns An instance of Error with a meaningful message
 */
function handleError(error: unknown): Error {
  if (isAxiosError(error)) {
    if (error.response) {
      const { status, data } = error.response;
      const message: string = (data as ErrorResponse).message || `Request failed with status code ${status}`;
      return new Error(message);
    } else if (error.request) {
      return new Error('No response received from server');
    }
    return new Error(`Axios error: ${error.message}`);
  }
  return new Error(`Unexpected error: ${String(error)}`);
}

/**
 * Type guard to check if an error is an AxiosError
 * @param error - The error to check
 * @returns True if error is an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError)?.isAxiosError === true;
}

/**
 * Set global headers for all subsequent requests
 * @param headers - A key-value map of headers to be set
 */
export const setGlobalHeaders = (headers: Record<string, string>) => {
  instance.defaults.headers.common = {
    ...instance.defaults.headers.common,
    ...headers
  };
};

/**
 * Update the base URL for all requests
 * @param url - The new base URL
 */
export const setBaseURL = (url: string) => {
  instance.defaults.baseURL = url;
};

/**
 * Update the default timeout for all requests
 * @param timeout - Timeout value in milliseconds
 */
export const setTimeout = (timeout: number) => {
  instance.defaults.timeout = timeout;
};

export default {
  get,
  post,
  setGlobalHeaders,
  setBaseURL,
  setTimeout,
};
