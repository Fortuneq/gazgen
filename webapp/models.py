from pydantic import BaseModel
from typing import Optional, List


class CategoryOut(BaseModel):
    name: str
    emoji: str
    post_count: int


class PostOut(BaseModel):
    id: int
    publication_id: str
    prompt: Optional[str] = None
    category: str
    category_emoji: str
    created_at: str
    has_result_image: bool
    reference_count: int


class PostDetailOut(PostOut):
    references: list["ImageMeta"]


class ImageMeta(BaseModel):
    order: int
    width: Optional[int] = None
    height: Optional[int] = None


class PaginatedPosts(BaseModel):
    items: list[PostOut]
    total: int
    page: int
    limit: int
    has_more: bool


class SearchRequest(BaseModel):
    query: str
    limit: int = 10


class SearchResultOut(PostOut):
    similarity: float


class TagOut(BaseModel):
    name: str
    display_name: str
    emoji: str
    post_count: int


class ProfileOut(BaseModel):
    telegram_id: int
    first_name: str | None
    username: str | None
    photo_credits: int
    video_credits: int


class GenerateRequest(BaseModel):
    post_id: int
    prompt_mode: str = "original"
    custom_prompt: Optional[str] = None
    aspect_ratio: str = "1:1"
    use_references: bool = True
    model: Optional[str] = None


class DirectGenerateRequest(BaseModel):
    prompt: str
    model: str
    aspect_ratio: str = "1:1"
    reference_urls: list[str] = []


class UploadReferenceResponse(BaseModel):
    url: str


class GenerateResponse(BaseModel):
    task_id: str


class GenerateStatusOut(BaseModel):
    task_id: str
    status: str
    result_url: Optional[str] = None
    error: Optional[str] = None


class CreatePaymentRequest(BaseModel):
    product_type: str  # 'subscription' | 'token_pack'
    product_name: str
    amount: float
    tokens: int


class CreatePaymentResponse(BaseModel):
    payment_url: str
    order_id: str


class PaymentStatusOut(BaseModel):
    order_id: str
    status: str
    tokens: int
    created_at: str
    paid_at: Optional[str] = None


class UserGenerationOut(BaseModel):
    id: int
    task_id: str
    prompt: Optional[str] = None
    model: str
    aspect_ratio: Optional[str] = None
    result_url: Optional[str] = None
    reference_urls: Optional[List[str]] = None
    cost: int
    created_at: str


class PaginatedGenerations(BaseModel):
    items: List[UserGenerationOut]
    total: int
    page: int
    limit: int
    has_more: bool
