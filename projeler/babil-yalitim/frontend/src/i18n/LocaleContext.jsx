/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_LOCALE,
  EN_LOCALE,
  getLocaleFromPathname,
  normalizeLocale,
} from "./routing.js";

const STORAGE_KEY = "site-locale";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
  isEnglish: false,
});

const resolveInitialLocale = () => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return getLocaleFromPathname(window.location.pathname);
};

export function LocaleProvider({ children }) {
  const location = useLocation();
  const [locale, setLocaleState] = useState(resolveInitialLocale);

  const setLocale = useCallback((nextLocale) => {
    const safeLocale = normalizeLocale(nextLocale);
    setLocaleState(safeLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === EN_LOCALE ? DEFAULT_LOCALE : EN_LOCALE));
  }, []);

  useEffect(() => {
    const pathnameLocale = getLocaleFromPathname(location.pathname);
    setLocaleState((current) =>
      current === pathnameLocale ? current : pathnameLocale
    );
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      isEnglish: locale === "en",
    }),
    [locale, setLocale, toggleLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

LocaleProvider.propTypes = {
  children: PropTypes.node,
};

export function useLocale() {
  return useContext(LocaleContext);
}
