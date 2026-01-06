import { api } from "../api/client";
import type { Review } from "../types/api";

type ReviewPayload =
  | Review
  | {
      data?: Review | null;
      review?: Review | null;
    };

function normalizeReview(payload: ReviewPayload | null | undefined): Review | null {
  if (!payload) return null;
  if ((payload as any).data) return (payload as any).data as Review;
  if ((payload as any).review) return (payload as any).review as Review;
  return payload as Review;
}

export async function getOrderReview(orderId: string): Promise<Review | null> {
  const { data } = await api.get<ReviewPayload>(`/api/v1/reviews/order/${orderId}`);
  return normalizeReview(data);
}

export async function createReview(payload: { orderId: string; rating: number; comment?: string | null }): Promise<Review> {
  const { data } = await api.post<ReviewPayload>("/api/v1/reviews", payload);
  const review = normalizeReview(data);
  if (!review) {
    throw new Error("Invalid review response");
  }
  return review;
}

export async function updateReview(
  id: string,
  payload: { rating?: number; comment?: string | null }
): Promise<Review> {
  const { data } = await api.patch<ReviewPayload>(`/api/v1/reviews/${id}`, payload);
  const review = normalizeReview(data);
  if (!review) {
    throw new Error("Invalid review response");
  }
  return review;
}
