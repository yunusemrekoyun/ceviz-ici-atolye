import { describe, expect, it } from "vitest";
import {
  getMediaKey,
  getMediaUrl,
  getImageSrcSet,
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "./media";

describe("media utils", () => {
  it("detects video urls", () => {
    expect(looksVideo("https://example.com/file.mp4")).toBe(true);
    expect(looksVideo("https://example.com/file.jpg")).toBe(false);
  });

  it("returns direct urls for local image and video media", () => {
    expect(
      getOptimizedImageUrl("https://cdn.example.com/projects/cover.jpg")
    ).toBe("https://cdn.example.com/projects/cover.jpg");
    expect(
      getOptimizedVideoUrl("https://cdn.example.com/projects/hero.mp4")
    ).toBe("https://cdn.example.com/projects/hero.mp4");
  });

  it("normalizes relative media urls against the backend origin", () => {
    expect(getMediaUrl("/media/projects/cover.jpg").endsWith("/media/projects/cover.jpg")).toBe(
      true
    );
  });

  it("uses posterUrl for video previews", () => {
    const media = {
      url: "https://cdn.example.com/services/demo.mp4",
      posterUrl: "https://cdn.example.com/services/demo.poster.jpg",
      resourceType: "video",
      storageKey: "services/demo.mp4",
    };

    expect(getVideoPosterUrl(media)).toBe(media.posterUrl);
    expect(getOptimizedImageUrl(media)).toBe(media.posterUrl);
    expect(getMediaKey(media)).toBe(media.storageKey);
  });

  it("selects responsive image variants and builds srcset", () => {
    const media = {
      url: "https://cdn.example.com/services/full.webp",
      storageKey: "services/full.webp",
      resourceType: "image",
      width: 1600,
      variants: [
        {
          url: "https://cdn.example.com/services/w480.webp",
          storageKey: "services/w480.webp",
          width: 480,
        },
        {
          url: "https://cdn.example.com/services/w960.webp",
          storageKey: "services/w960.webp",
          width: 960,
        },
      ],
    };

    expect(getOptimizedImageUrl(media, { width: 500 })).toBe(
      "https://cdn.example.com/services/w960.webp"
    );
    expect(getOptimizedImageUrl(media, { width: 1700 })).toBe(
      "https://cdn.example.com/services/full.webp"
    );
    expect(getImageSrcSet(media)).toContain("480w");
    expect(getImageSrcSet(media)).toContain("960w");
    expect(getImageSrcSet(media)).toContain("1600w");
  });

  it("selects preview and detail variants for videos", () => {
    const media = {
      url: "https://cdn.example.com/services/full.mp4",
      storageKey: "services/full.mp4",
      resourceType: "video",
      width: 1920,
      variants: [
        {
          label: "preview",
          url: "https://cdn.example.com/services/preview.mp4",
          storageKey: "services/preview.mp4",
          width: 640,
        },
        {
          label: "detail",
          url: "https://cdn.example.com/services/detail.mp4",
          storageKey: "services/detail.mp4",
          width: 1280,
        },
      ],
    };

    expect(getOptimizedVideoUrl(media, { purpose: "preview" })).toBe(
      "https://cdn.example.com/services/preview.mp4"
    );
    expect(getOptimizedVideoUrl(media, { purpose: "detail" })).toBe(
      "https://cdn.example.com/services/detail.mp4"
    );
    expect(getOptimizedVideoUrl(media, { width: 700 })).toBe(
      "https://cdn.example.com/services/detail.mp4"
    );
  });
});
