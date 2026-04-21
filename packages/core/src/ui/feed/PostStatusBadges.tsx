/**
 * Post Status Badges
 *
 * Renders top-of-card status indicators that should stay visually prominent.
 * All badges are always rendered in the DOM; visibility is driven by CSS
 * selectors on the parent article's data attributes. This lets the post menu
 * toggle badges instantly without a page reload. Featured is rendered in the
 * footer meta instead.
 */

import type { FC } from "hono/jsx";
import { Icon } from "../shared/Icon.js";

export const PostStatusBadges: FC = () => {
  return (
    <div class="post-status-badges">
      <span class="post-status-badge post-status-pinned">
        <Icon name="post-status-pin" />
        Pinned
      </span>
      <span class="post-status-badge post-status-pinned-in-collection">
        <Icon name="post-status-pin" />
        Pinned
      </span>
      <span class="post-status-badge post-status-private">
        <Icon name="post-status-private" />
        Private
      </span>
    </div>
  );
};
