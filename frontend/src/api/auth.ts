import client from './client';
import { AuthTokens, LoginRequest, User } from '../types';

export async function login(creds: LoginRequest): Promise<AuthTokens> {
  const { data } = await client.post<AuthTokens>('/auth/login', creds);
  localStorage.setItem('antarvik_token', data.access_token);
  localStorage.setItem('antarvik_refresh', data.refresh_token);
  return data;
}

export async function register(creds: LoginRequest & { email: string }): Promise<User> {
  const { data } = await client.post<User>('/auth/register', creds);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me');
  return data;
}

export async function refreshToken(): Promise<AuthTokens> {
  const refresh = localStorage.getItem('antarvik_refresh');
  const { data } = await client.post<AuthTokens>('/auth/refresh', { refresh_token: refresh });
  localStorage.setItem('antarvik_token', data.access_token);
  return data;
}

export function logout(): void {
  localStorage.removeItem('antarvik_token');
  localStorage.removeItem('antarvik_refresh');
  window.location.href = '/login';
}
