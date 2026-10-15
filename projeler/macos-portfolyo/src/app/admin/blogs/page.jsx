import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getBlogs } from "@/lib/blogs.js";

import BlogDashboard from "./BlogDashboard.jsx";

export const dynamic = "force-dynamic";

export default async function BlogsAdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(token);

  if (!payload?.sub) {
    redirect("/login");
  }

  const result = await getBlogs();

  return (
    <BlogDashboard
      initialPosts={result.posts}
      user={{
        username: payload.username ?? "admin",
        email: payload.email ?? "admin@portfolio.local",
      }}
    />
  );
}
