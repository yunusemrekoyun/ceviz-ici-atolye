import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getPhotosLibrary } from "@/lib/photosLibrary.js";
import { getResumeConfig } from "@/lib/resume.js";

import MediaDashboard from "./MediaDashboard.jsx";

export const dynamic = "force-dynamic";

export default async function MediaAdminPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(token);

  if (!payload?.sub) {
    redirect("/login");
  }

  const [photosResult, resumeResult] = await Promise.all([
    getPhotosLibrary(),
    getResumeConfig(),
  ]);

  return (
    <MediaDashboard
      initialItems={photosResult.items}
      initialResume={resumeResult.resume}
      user={{
        username: payload.username ?? "admin",
        email: payload.email ?? "admin@portfolio.local",
      }}
    />
  );
}
