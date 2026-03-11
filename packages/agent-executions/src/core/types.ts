import { InternalAxiosRequestConfig } from 'axios'

export type RequestInterceptor = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
