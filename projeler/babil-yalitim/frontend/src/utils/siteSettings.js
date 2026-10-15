export const DEFAULT_SITE_SETTINGS = Object.freeze({
  homeProjectsVisible: true,
});

export const normalizeSiteSettings = (value) => ({
  ...DEFAULT_SITE_SETTINGS,
  homeProjectsVisible: value?.homeProjectsVisible !== false,
});
