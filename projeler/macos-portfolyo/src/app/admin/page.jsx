import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getProjects } from "@/lib/projects.js";
import AdminDashboard from "./AdminDashboard.jsx";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(token);

  if (!payload?.sub) {
    redirect("/login");
  }

  const result = await getProjects();

  return (
    <AdminDashboard
      initialProjects={result.projects}
      initialProjectFolders={result.projectFolders}
      user={{
        username: payload.username ?? "admin",
        email: payload.email ?? "admin@portfolio.local",
      }}
    />
  );
}
