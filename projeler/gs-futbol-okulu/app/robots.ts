import type { MetadataRoute } from "next";
import { ADMIN_PATH } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/on-kayit"],
        disallow: [ADMIN_PATH, `${ADMIN_PATH}/`, "/api/"],
      },
    ],
  };
}
