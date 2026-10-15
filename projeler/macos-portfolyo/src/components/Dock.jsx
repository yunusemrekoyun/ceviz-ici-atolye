import React, { useRef } from "react";
import { dockApps } from "#constants";
import { useGSAP } from "@gsap/react";
import { Tooltip } from "react-tooltip";
import useWindowStore from "#store/window.js";
import gsap from "gsap";

const Dock = () => {
  const dockRef = useRef(null);
  const openWindow = useWindowStore((state) => state.openWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);

  useGSAP(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const icons = Array.from(dock.querySelectorAll(".dock-icon"));
    if (!icons.length) return;

    const iconData = icons.map((icon) => ({
      el: icon,
      centerX: 0,
      scaleXTo: gsap.quickTo(icon, "scaleX", {
        duration: 0.2,
        ease: "power1.out",
      }),
      scaleYTo: gsap.quickTo(icon, "scaleY", {
        duration: 0.2,
        ease: "power1.out",
      }),
      yTo: gsap.quickTo(icon, "y", {
        duration: 0.2,
        ease: "power1.out",
      }),
    }));

    let dockRect = dock.getBoundingClientRect();
    let rafId = null;
    let mouseX = 0;

    const updateGeometry = () => {
      dockRect = dock.getBoundingClientRect();
      iconData.forEach((item) => {
        const rect = item.el.getBoundingClientRect();
        item.centerX = rect.left - dockRect.left + rect.width / 2;
      });
    };

    const tick = () => {
      rafId = null;
      iconData.forEach((item) => {
        const distance = Math.abs(mouseX - item.centerX);
        const intensity = Math.exp(-(distance ** 2) / 2000);
        const scale = 1 + 0.5 * intensity;
        item.scaleXTo(scale);
        item.scaleYTo(scale);
        item.yTo(-15 * intensity);
      });
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX - dockRect.left;
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    };

    const resetIcons = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      iconData.forEach((item) => {
        item.scaleXTo(1);
        item.scaleYTo(1);
        item.yTo(0);
      });
    };

    updateGeometry();

    const resizeObserver = new ResizeObserver(updateGeometry);
    resizeObserver.observe(dock);
    window.addEventListener("resize", updateGeometry);

    dock.addEventListener("mousemove", handleMouseMove);
    dock.addEventListener("mouseleave", resetIcons);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateGeometry);
      resizeObserver.disconnect();
      dock.removeEventListener("mousemove", handleMouseMove);
      dock.removeEventListener("mouseleave", resetIcons);
    };
  }, []);

  const toggleApp = (app) => {
    if (!app.canOpen) return;
    const targetWindow = useWindowStore.getState().windows?.[app.id];
    if (!targetWindow) return;

    if (targetWindow.isOpen) closeWindow(app.id);
    else openWindow(app.id);
  };

  return (
    <section id="dock">
      <div ref={dockRef} className="dock-container">
        {dockApps.map(({ id, name, icon, canOpen }) => (
          <div key={id} className="relative flex justify-center">
            <button
              type="button"
              className="dock-icon"
              aria-label={name}
              data-tooltip-id="dock-tooltip"
              data-tooltip-content={name}
              data-tooltip-delay-show={150}
              onClick={() => toggleApp({ id, canOpen })}
            >
              <span
                className={`block w-full h-full ${id === "phone" ? "p-1" : ""}`}
              >
                <img
                  src={`/images/${icon}`}
                  alt={name}
                  loading="lazy"
                  className={`${
                    canOpen ? "" : "opacity-60"
                  } w-full h-full object-contain`}
                />
              </span>
            </button>
          </div>
        ))}
        <Tooltip id="dock-tooltip" place="top" className="tooltip" />
      </div>
    </section>
  );
};

export default Dock;
