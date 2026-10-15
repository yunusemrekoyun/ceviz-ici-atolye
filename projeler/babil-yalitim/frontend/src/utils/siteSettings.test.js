import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
} from "./siteSettings";

describe("site settings", () => {
  it("uses defaults when payload is missing", () => {
    expect(normalizeSiteSettings()).toEqual(DEFAULT_SITE_SETTINGS);
  });

  it("keeps explicit false visibility flag", () => {
    expect(normalizeSiteSettings({ homeProjectsVisible: false })).toEqual({
      homeProjectsVisible: false,
    });
  });
});
