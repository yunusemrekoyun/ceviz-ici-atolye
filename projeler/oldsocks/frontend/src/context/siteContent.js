import { createContext, useContext } from "react";

export const SiteContentContext = createContext(null);
export const useSiteContent = () => useContext(SiteContentContext);
