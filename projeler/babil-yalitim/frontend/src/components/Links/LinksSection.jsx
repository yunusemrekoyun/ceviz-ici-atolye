// src/components/Links/LinksSection.jsx
import { useState } from "react";
import img1 from "../../assets/services.jpg";
import img2 from "../../assets/projects.jpg";
import img3 from "../../assets/brands.jpg";
import LinkItem from "./LinkItem";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const LinksSection = () => {
  const { locale } = useLocale();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const links =
    locale === "en"
      ? [
          {
            label: "Services",
            img: img1,
            color: "text-secondaryColor",
            desc: "Click to explore our services in detail.",
            href: localizePath("/services", locale),
          },
          {
            label: "Projects",
            img: img2,
            color: "text-quaternaryColor",
            desc: "Click to see more about our projects.",
            href: localizePath("/projects", locale),
          },
          {
            label: "Blog",
            img: img3,
            color: "text-brandBlue",
            desc: "Click to browse the content we publish for you.",
            href: localizePath("/blog", locale),
          },
        ]
      : [
          {
            label: "Hizmetler",
            img: img1,
            color: "text-secondaryColor",
            desc: "Hizmetlerimiz hakkında detaylı bilgiye ulaşmak için tıklayın.",
            href: localizePath("/services", locale),
          },
          {
            label: "Projeler",
            img: img2,
            color: "text-quaternaryColor",
            desc: "Projelerimiz hakkında detaylı bilgiye ulaşmak için tıklayın.",
            href: localizePath("/projects", locale),
          },
          {
            label: "Bloglar",
            img: img3,
            color: "text-brandBlue",
            desc: "Sizler için yayınladığımız içerikleri görmek için tıklayın.",
            href: localizePath("/blog", locale),
          },
        ];

  return (
    <div className="w-full flex justify-center mt-6 px-0 sm:px-4 relative">
      <div
        className="
          w-full max-w-screen-xl
          flex flex-wrap justify-center items-end
          gap-5 sm:gap-8 md:gap-10
          px-0
        "
      >
        {links.map((link, idx) => (
          <div key={link.label}>
            <LinkItem
              label={link.label}
              img={link.img}
              color={link.color}
              desc={link.desc}
              href={link.href}
              isHovered={hoveredIndex === idx}
              forceExpanded={false}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinksSection;
