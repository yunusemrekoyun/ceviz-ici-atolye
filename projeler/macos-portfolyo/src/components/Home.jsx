import { useLayoutEffect, useRef } from "react";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import { Draggable } from "gsap/Draggable";
import gsap from "gsap";

import { useContent } from "#components/ContentProvider.jsx";
import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";

const Home = () => {
  const isDraggingRef = useRef(false);
  const rootRef = useRef(null);
  const { desktopProjects } = useContent();
  const setActiveLocationId = useLocationStore((state) => state.setActiveLocationId);
  const desktopPositions = useLocationStore((state) => state.desktopPositions);
  const setDesktopPosition = useLocationStore((state) => state.setDesktopPosition);
  const openWindow = useWindowStore((state) => state.openWindow);
  const handleOpenProjectFinder = (project) => {
    if (isDraggingRef.current) return;
    setActiveLocationId(project?.id);
    openWindow("finder");
  };
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const folders = root.querySelectorAll(".folder");
    folders.forEach((folder) => {
      const id = folder.dataset.id;
      const saved = desktopPositions?.[id];
      if (!saved) return;
      gsap.set(folder, { x: saved.x ?? 0, y: saved.y ?? 0 });
    });
  }, [desktopPositions]);

  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;

    const folders = root.querySelectorAll(".folder");
    const instances = Draggable.create(folders, {
      onDragStart: () => {
        isDraggingRef.current = true;
      },
      onDragEnd: function () {
        const id = this.target.dataset.id;
        if (!id) return;
        setDesktopPosition(id, { x: this.x, y: this.y });
        // Allow click handlers again after drag completes
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      },
    });

    return () => {
      instances.forEach((instance) => instance.kill());
    };
  }, []);
  return (
    <section id="home" ref={rootRef}>
      <ul>
        {desktopProjects.map((project) => (
          <li
            key={project.id}
            className={clsx("group folder", project.windowPosition)}
            data-id={project.id}
            onClick={() => handleOpenProjectFinder(project)}
          >
            <img src={project.icon} alt={project.name} />
            <p>{project.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Home;
