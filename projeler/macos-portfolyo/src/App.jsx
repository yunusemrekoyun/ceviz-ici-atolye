"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useShallow } from "zustand/react/shallow";

import Dock from "#components/Dock.jsx";
import DesktopNotifications from "#components/DesktopNotifications.jsx";
import { ContentProvider } from "#components/ContentProvider.jsx";
import Home from "#components/Home.jsx";
import Navbar from "#components/Navbar.jsx";
import PersistenceManager from "#components/PersistenceManager.jsx";
import UrlStateManager from "#components/UrlStateManager.jsx";
import Welcome from "#components/Welcome.jsx";
import useWindowStore from "#store/window.js";

const FinderWindow = lazy(() => import("#components/Finder.jsx"));
const SafariWindow = lazy(() => import("#components/Safari.jsx"));
const ResumeWindow = lazy(() => import("#components/Resume.jsx"));
const PhotosWindow = lazy(() => import("#components/Photos.jsx"));
const ContactWindow = lazy(() => import("#components/Contact.jsx"));
const PhoneMirrorWindow = lazy(() => import("#components/PhoneMirror.jsx"));
const ImgFileWindow = lazy(() => import("#components/ImgFile.jsx"));
const VideoFileWindow = lazy(() => import("#components/VideoFile.jsx"));
const TextWindow = lazy(() => import("#components/Text.jsx"));
const TerminalWindow = lazy(() => import("#windows/Terminal.jsx"));

const PhoneMirrorMobile = lazy(() =>
  import("#components/PhoneMirror.jsx").then((module) => ({
    default: module.PhoneMirrorMobile,
  }))
);

gsap.registerPlugin(Draggable);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return isMobile;
};

const App = ({
  initialProjects = [],
  initialProjectFolders = [],
  initialPhotosLibraryItems = [],
}) => {
  const isMobile = useIsMobile();
  const mountWindows = useWindowStore(
    useShallow((state) => ({
      finder: state.windows.finder?.hasOpened || state.windows.finder?.isOpen,
      safari: state.windows.safari?.hasOpened || state.windows.safari?.isOpen,
      resume: state.windows.resume?.hasOpened || state.windows.resume?.isOpen,
      photos: state.windows.photos?.hasOpened || state.windows.photos?.isOpen,
      contact: state.windows.contact?.hasOpened || state.windows.contact?.isOpen,
      terminal:
        state.windows.terminal?.hasOpened || state.windows.terminal?.isOpen,
      txtfile: state.windows.txtfile?.hasOpened || state.windows.txtfile?.isOpen,
      imgfile: state.windows.imgfile?.hasOpened || state.windows.imgfile?.isOpen,
      videofile:
        state.windows.videofile?.hasOpened || state.windows.videofile?.isOpen,
      phone: state.windows.phone?.hasOpened || state.windows.phone?.isOpen,
    }))
  );

  if (isMobile) {
    return (
    <ContentProvider
      projects={initialProjects}
      projectFolders={initialProjectFolders}
      photosLibraryItems={initialPhotosLibraryItems}
    >
      <main className="mobile-shell">
          <Suspense fallback={null}>
            <PhoneMirrorMobile isMobileView />
          </Suspense>
        </main>
      </ContentProvider>
    );
  }

  return (
    <ContentProvider
      projects={initialProjects}
      projectFolders={initialProjectFolders}
      photosLibraryItems={initialPhotosLibraryItems}
    >
      <main>
        <UrlStateManager />
        <PersistenceManager />
        <Navbar />
        <DesktopNotifications />
        <Welcome />
        <Dock />
        {mountWindows.terminal && (
          <Suspense fallback={null}>
            <TerminalWindow />
          </Suspense>
        )}
        {mountWindows.safari && (
          <Suspense fallback={null}>
            <SafariWindow />
          </Suspense>
        )}
        {mountWindows.resume && (
          <Suspense fallback={null}>
            <ResumeWindow />
          </Suspense>
        )}
        {mountWindows.finder && (
          <Suspense fallback={null}>
            <FinderWindow />
          </Suspense>
        )}
        {mountWindows.txtfile && (
          <Suspense fallback={null}>
            <TextWindow />
          </Suspense>
        )}
        {mountWindows.imgfile && (
          <Suspense fallback={null}>
            <ImgFileWindow />
          </Suspense>
        )}
        {mountWindows.videofile && (
          <Suspense fallback={null}>
            <VideoFileWindow />
          </Suspense>
        )}
        {mountWindows.photos && (
          <Suspense fallback={null}>
            <PhotosWindow />
          </Suspense>
        )}
        {mountWindows.contact && (
          <Suspense fallback={null}>
            <ContactWindow />
          </Suspense>
        )}
        {mountWindows.phone && (
          <Suspense fallback={null}>
            <PhoneMirrorWindow />
          </Suspense>
        )}
        <Home />
      </main>
    </ContentProvider>
  );
};

export default App;
