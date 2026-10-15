import { useMemo, useRef } from "react";

import clsx from "clsx";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import WindowControls from "#components/WindowControls.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import { photosLinks } from "#constants";
import { useContent } from "#components/ContentProvider.jsx";
import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";

const Photos = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const { photosGallery, photosSections } = useContent();
  const photosActiveTab = useLocationStore((state) => state.photosActiveTab);
  const setPhotosActiveTab = useLocationStore((state) => state.setPhotosActiveTab);
  const activeTab = photosActiveTab ?? photosLinks[0]?.id ?? null;
  const listRef = useRef(null);

  const images = useMemo(
    () => photosSections?.[activeTab] || photosGallery,
    [activeTab, photosGallery, photosSections]
  );

  const handleOpenImage = (item) => {
    if (item?.type === "video") {
      openWindow("videofile", {
        name: `Video ${item.id}`,
        videoUrl: item.src,
        posterUrl: item.img,
      });
      return;
    }

    openWindow("imgfile", {
      name: `Photo ${item.id}`,
      imageUrl: item.img,
    });
  };

  useGSAP(() => {
    const list = listRef.current;
    if (!list) return;

    const items = list.querySelectorAll("li");
    gsap.fromTo(
      items,
      { opacity: 0, y: 10, scale: 0.985 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.28,
        stagger: 0.03,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "transform,opacity",
      }
    );
  }, [activeTab, images.length]);

  return (
    <>
      <div id="window-header">
        <WindowControls target="photos" />
        <h2>Photos</h2>
      </div>

      <div className="photos-body">
        <div className="sidebar">
          <h2>Library</h2>
          <ul>
            {photosLinks.map(({ id, icon, title }) => {
              const isActive = id === activeTab;
              return (
                <li
                  key={id}
                  className={clsx(
                    isActive ? "bg-blue-100 text-blue-700" : "not-active",
                    "cursor-pointer"
                  )}
                  onClick={() => {
                    setPhotosActiveTab(id);
                  }}
                >
                  <img src={icon} alt={title} />
                  <p>{title}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="gallery">
          <ul ref={listRef}>
            {images.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="photos-thumb"
                  onClick={() => handleOpenImage(item)}
                  aria-label={item.type === "video" ? "Open video" : "Open photo"}
                >
                  <img src={item.img} alt={`gallery-${item.id}`} loading="lazy" />
                  {item.type === "video" ? (
                    <span className="photos-thumb-play" aria-hidden>
                      ▶
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

const PhotosWindow = WindowWrapper(Photos, "photos");

export default PhotosWindow;
