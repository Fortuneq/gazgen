import type { Category, Post, PostDetail, SearchResult, GenerateRequest, GenerateStatus, PaginatedResponse } from './types';

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
