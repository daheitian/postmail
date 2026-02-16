import { describe, it, expect } from "vitest";
import { resolveCardComponent, resolveComponent } from "../theme-components.js";
import type {
  ThemeComponents,
  TimelineCardProps,
  ThreadPreviewProps,
  TimelineFeedProps,
  Format,
  HomePageProps,
} from "../../types.js";
import type { FC } from "hono/jsx";

// Create simple mock components for testing (avoids importing .tsx files with i18n)
const MockNoteCard: FC<TimelineCardProps> = () => null;
const MockLinkCard: FC<TimelineCardProps> = () => null;
const MockQuoteCard: FC<TimelineCardProps> = () => null;
const MockThreadPreview: FC<ThreadPreviewProps> = () => null;
const MockTimelineFeed: FC<TimelineFeedProps> = () => null;
const MockHomePage: FC<HomePageProps> = () => null;

const DEFAULT_CARD_MAP: Record<Format, FC<TimelineCardProps>> = {
  note: MockNoteCard,
  link: MockLinkCard,
  quote: MockQuoteCard,
};

describe("theme-components", () => {
  describe("resolveCardComponent", () => {
    it("returns default NoteCard for note type", () => {
      expect(resolveCardComponent("note", DEFAULT_CARD_MAP)).toBe(MockNoteCard);
    });

    it("returns default LinkCard for link type", () => {
      expect(resolveCardComponent("link", DEFAULT_CARD_MAP)).toBe(MockLinkCard);
    });

    it("returns default QuoteCard for quote type", () => {
      expect(resolveCardComponent("quote", DEFAULT_CARD_MAP)).toBe(
        MockQuoteCard,
      );
    });

    it("returns theme override when provided", () => {
      const CustomNote: FC<TimelineCardProps> = () => null;
      const overrides: ThemeComponents = { NoteCard: CustomNote };
      expect(resolveCardComponent("note", DEFAULT_CARD_MAP, overrides)).toBe(
        CustomNote,
      );
    });

    it("returns default when theme has no override for type", () => {
      const overrides: ThemeComponents = {};
      expect(resolveCardComponent("link", DEFAULT_CARD_MAP, overrides)).toBe(
        MockLinkCard,
      );
    });
  });

  describe("resolveComponent", () => {
    it("returns default ThreadPreview when no override", () => {
      expect(resolveComponent("ThreadPreview", MockThreadPreview)).toBe(
        MockThreadPreview,
      );
    });

    it("returns theme override for ThreadPreview when provided", () => {
      const Custom: FC<ThreadPreviewProps> = () => null;
      expect(
        resolveComponent("ThreadPreview", MockThreadPreview, {
          ThreadPreview: Custom,
        }),
      ).toBe(Custom);
    });

    it("returns default TimelineFeed when no override", () => {
      expect(resolveComponent("TimelineFeed", MockTimelineFeed)).toBe(
        MockTimelineFeed,
      );
    });

    it("returns theme override for TimelineFeed when provided", () => {
      const Custom: FC<TimelineFeedProps> = () => null;
      expect(
        resolveComponent("TimelineFeed", MockTimelineFeed, {
          TimelineFeed: Custom,
        }),
      ).toBe(Custom);
    });

    it("returns default HomePage when no override", () => {
      expect(resolveComponent("HomePage", MockHomePage)).toBe(MockHomePage);
    });

    it("returns theme override for HomePage when provided", () => {
      const Custom: FC<HomePageProps> = () => null;
      expect(
        resolveComponent("HomePage", MockHomePage, { HomePage: Custom }),
      ).toBe(Custom);
    });

    it("returns default when theme has empty overrides", () => {
      expect(resolveComponent("HomePage", MockHomePage, {})).toBe(MockHomePage);
    });
  });
});
