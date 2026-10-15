import App from "../App.jsx";
import { getProjects } from "@/lib/projects.js";
import { getPhotosLibrary } from "@/lib/photosLibrary.js";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [projectsResult, photosResult] = await Promise.all([
    getProjects(),
    getPhotosLibrary(),
  ]);

  return (
    <App
      initialProjects={projectsResult.projects}
      initialProjectFolders={projectsResult.projectFolders}
      initialPhotosLibraryItems={photosResult.items}
    />
  );
}
