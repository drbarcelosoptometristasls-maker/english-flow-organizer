import type { Review } from "./types";

export type ReviewResult = "easy" | "hard" | "failed";

/** SM-2 simplificado. Retorna os novos campos do review. */
export function nextReview(
  review: Pick<Review, "ease" | "interval_days">,
  result: ReviewResult
): { ease: number; interval_days: number; due_date: string; last_result: string } {
  let ease = review.ease ?? 2.5;
  let interval = review.interval_days ?? 1;

  if (result === "easy") {
    interval = Math.max(1, Math.round(interval * ease));
  } else if (result === "hard") {
    interval = Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else {
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    ease,
    interval_days: interval,
    due_date: due.toISOString().slice(0, 10),
    last_result: result,
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
