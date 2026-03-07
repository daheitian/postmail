/**
 * Star Rating (read-only)
 *
 * Displays a 1-5 star rating inline. Returns null when no rating is set.
 */

import type { FC } from "hono/jsx";

interface StarRatingProps {
  rating?: number;
}

export const StarRating: FC<StarRatingProps> = ({ rating }) => {
  if (!rating || rating <= 0) return null;

  const stars = [1, 2, 3, 4, 5];

  return (
    <div class="post-rating" aria-label={`${rating} out of 5`}>
      {stars.map((n) => (
        <span class={n <= rating ? "post-star-filled" : "post-star-empty"}>
          ★
        </span>
      ))}
    </div>
  );
};
