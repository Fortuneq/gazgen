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

export type ModelTier = 'nano' | 'standard' | 'pro' | 'ultra';

export interface GenerateRequest {
  post_id: number;
  prompt_mode: 'original' | 'custom' | 'adapted';
  custom_prompt?: string;
  aspect_ratio?: string;
  use_references?: boolean;
  model?: ModelTier;
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

export interface UserProfile {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  credits: number;
}

export interface PricingPack {
  id: string;
  name: string;
  count: number;
  price: number;
  pricePerUnit: number;
  popular?: boolean;
}

export interface ModelInfo {
  id: ModelTier;
  name: string;
  description: string;
  creditsPerPhoto: number;
  creditsPerVideo: number;
  photoPacks: PricingPack[];
  videoPacks: PricingPack[];
}
