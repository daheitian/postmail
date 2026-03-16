import type { FC } from "hono/jsx";
import {
  HOME_BRANDING_LINK_LABEL,
  HOME_BRANDING_PREFIX,
  JANT_REPO_URL,
} from "../../lib/jant-branding.js";

export const HomePageBranding: FC = () => {
  return (
    <footer class="home-branding-credit">
      {HOME_BRANDING_PREFIX}{" "}
      <a href={JANT_REPO_URL} target="_blank" rel="noopener noreferrer">
        {HOME_BRANDING_LINK_LABEL}
      </a>
    </footer>
  );
};
