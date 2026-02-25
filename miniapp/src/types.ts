export interface Category {
  name: string;
  emoji: string;
  post_count: number;
}

export interface Post {
  id: number;
  publication_id: string;
  prompt: string | null;
  category: string;
  category_emoji: string;
  created_at: string;
  has_result_image: boolean;
  reference_count: number;
}

export interface PostDetail extends Post {
  references: ImageMeta[];
}

export interface ImageMeta {
  order: number;
  width: number | null;
  height: number | null;
}

export interface SearchResult extends Post {
  similarity: number;
}

export interface GenerateRequest {
  post_id: number;
  prompt_mode: 'original' | 'custom' | 'adapted';
  custom_prompt?: string;
  aspect_ratio?: string;
  use_references?: boolean;
}

export interface GenerateStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  result_url?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
