import type { Category, Post, PostDetail, SearchResult, GenerateRequest, GenerateStatus, PaginatedResponse, UserProfile, ModelInfo } from './types';
import { tg } from './telegram';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  return fetchJSON(`${BASE}/categories`);
}

export async function getPosts(category?: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set('category', category);
  return fetchJSON(`${BASE}/posts?${params}`);
}

export async function getPost(id: number): Promise<PostDetail> {
  return fetchJSON(`${BASE}/posts/${id}`);
}

export function getImageUrl(postId: number): string {
  return `${BASE}/images/${postId}/result`;
}

export function getReferenceUrl(postId: number, order: number): string {
  return `${BASE}/images/${postId}/reference/${order}`;
}

export async function searchPosts(query: string, limit = 20): Promise<SearchResult[]> {
  return fetchJSON(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
}

export async function startGeneration(req: GenerateRequest): Promise<{ task_id: string }> {
  return fetchJSON(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function getGenerationStatus(taskId: string): Promise<GenerateStatus> {
  return fetchJSON(`${BASE}/generate/${taskId}/status`);
}

export function getUserProfile(): UserProfile {
  const user = tg?.initDataUnsafe?.user as Record<string, unknown> | undefined;
  return {
    id: (user?.id as number) ?? 0,
    username: (user?.username as string) ?? 'user',
    firstName: (user?.first_name as string) ?? 'User',
    lastName: (user?.last_name as string) ?? '',
    photoUrl: (user?.photo_url as string) ?? '',
    credits: 100,
  };
}

export const MODEL_DATA: ModelInfo[] = [
  {
    id: 'nano',
    name: 'Nano',
    description: 'Быстрая генерация, базовое качество',
    creditsPerPhoto: 1,
    creditsPerVideo: 5,
    photoPacks: [
      { id: 'nano-10', name: '10 фото', count: 10, price: 49, pricePerUnit: 4.9 },
      { id: 'nano-50', name: '50 фото', count: 50, price: 199, pricePerUnit: 3.98, popular: true },
      { id: 'nano-100', name: '100 фото', count: 100, price: 349, pricePerUnit: 3.49 },
    ],
    videoPacks: [
      { id: 'nano-v5', name: '5 видео', count: 5, price: 149, pricePerUnit: 29.8 },
      { id: 'nano-v20', name: '20 видео', count: 20, price: 449, pricePerUnit: 22.45 },
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Оптимальный баланс скорости и качества',
    creditsPerPhoto: 2,
    creditsPerVideo: 10,
    photoPacks: [
      { id: 'std-10', name: '10 фото', count: 10, price: 99, pricePerUnit: 9.9 },
      { id: 'std-50', name: '50 фото', count: 50, price: 399, pricePerUnit: 7.98, popular: true },
      { id: 'std-100', name: '100 фото', count: 100, price: 699, pricePerUnit: 6.99 },
    ],
    videoPacks: [
      { id: 'std-v5', name: '5 видео', count: 5, price: 299, pricePerUnit: 59.8 },
      { id: 'std-v20', name: '20 видео', count: 20, price: 899, pricePerUnit: 44.95 },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Высокое качество, детализация',
    creditsPerPhoto: 5,
    creditsPerVideo: 25,
    photoPacks: [
      { id: 'pro-10', name: '10 фото', count: 10, price: 249, pricePerUnit: 24.9 },
      { id: 'pro-50', name: '50 фото', count: 50, price: 999, pricePerUnit: 19.98, popular: true },
      { id: 'pro-100', name: '100 фото', count: 100, price: 1749, pricePerUnit: 17.49 },
    ],
    videoPacks: [
      { id: 'pro-v5', name: '5 видео', count: 5, price: 749, pricePerUnit: 149.8 },
      { id: 'pro-v20', name: '20 видео', count: 20, price: 2249, pricePerUnit: 112.45 },
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    description: 'Максимальное качество, фотореализм',
    creditsPerPhoto: 10,
    creditsPerVideo: 50,
    photoPacks: [
      { id: 'ultra-10', name: '10 фото', count: 10, price: 499, pricePerUnit: 49.9 },
      { id: 'ultra-50', name: '50 фото', count: 50, price: 1999, pricePerUnit: 39.98, popular: true },
      { id: 'ultra-100', name: '100 фото', count: 100, price: 3499, pricePerUnit: 34.99 },
    ],
    videoPacks: [
      { id: 'ultra-v5', name: '5 видео', count: 5, price: 1499, pricePerUnit: 299.8 },
      { id: 'ultra-v20', name: '20 видео', count: 20, price: 4499, pricePerUnit: 224.95 },
    ],
  },
];
