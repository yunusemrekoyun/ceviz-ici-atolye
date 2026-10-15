import { useState } from "react";
import PropTypes from "prop-types";
import RichContentRenderer from "../../../components/RichContent/RichContentRenderer";

const previewShellCls =
  "overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/90 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.38)] dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100";

const sectionTitleCls =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300";

const richPreviewCls =
  "prose prose-sm md:prose-base prose-slate max-w-none dark:prose-invert prose-headings:text-secondaryColor prose-a:text-quaternaryColor";

const MediaFrame = ({ media, fallbackText, className = "" }) => {
  if (!media?.src) {
    return (
      <div
        className={`grid place-items-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-900 dark:text-slate-500 ${className}`}
      >
        {fallbackText}
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <video
        src={media.src}
        className={className}
        controls
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={media.src} alt={media.alt || ""} className={className} />;
};

MediaFrame.propTypes = {
  media: PropTypes.shape({
    src: PropTypes.string,
    type: PropTypes.oneOf(["image", "video"]),
    alt: PropTypes.string,
  }),
  fallbackText: PropTypes.string.isRequired,
  className: PropTypes.string,
};

const mediaShape = PropTypes.shape({
  src: PropTypes.string,
  type: PropTypes.oneOf(["image", "video"]),
  alt: PropTypes.string,
});

const BlogPreview = ({ preview }) => (
  <div className={previewShellCls}>
    <div className="relative h-64 md:h-80 overflow-hidden">
      <MediaFrame
        media={preview.cover}
        fallbackText="Kapak önizlemesi"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <div className="mb-3 flex flex-wrap gap-2">
          {(preview.tags || []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-bold md:text-4xl">
          {preview.title || "Blog başlığı"}
        </h2>
      </div>
    </div>
    <div className="grid gap-8 p-6 lg:grid-cols-3">
      <article className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <RichContentRenderer
          content={preview.content}
          className={richPreviewCls}
        />
      </article>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className={sectionTitleCls}>Ek Medya</p>
          <div className="mt-4 grid gap-3">
            {(preview.assets || []).length ? (
              preview.assets.map((asset, index) => (
                <MediaFrame
                  key={`${asset.src}-${index}`}
                  media={asset}
                  fallbackText="Medya"
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Henüz ek medya seçilmedi.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  </div>
);

BlogPreview.propTypes = {
  preview: PropTypes.shape({
    title: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    content: PropTypes.string,
    cover: mediaShape,
    assets: PropTypes.arrayOf(mediaShape),
  }).isRequired,
};

const JournalPreview = ({ preview }) => (
  <div className={previewShellCls}>
    <div className="relative h-64 overflow-hidden md:h-80">
      <MediaFrame
        media={preview.cover}
        fallbackText="Kapak önizlemesi"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/45" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
          Haber önizlemesi
        </p>
        <h2 className="text-2xl font-bold md:text-4xl">
          {preview.title || "Haber başlığı"}
        </h2>
      </div>
    </div>
    <div className="grid gap-8 p-6 lg:grid-cols-3">
      <article className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <RichContentRenderer
          content={preview.content}
          className={richPreviewCls}
        />
      </article>
      <aside className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <p className={sectionTitleCls}>Galeri</p>
        <div className="mt-4 grid gap-3">
          {(preview.assets || []).length ? (
            preview.assets.map((asset, index) => (
              <MediaFrame
                key={`${asset.src}-${index}`}
                media={asset}
                fallbackText="Medya"
                className="aspect-video w-full rounded-2xl object-cover"
              />
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Henüz ek medya seçilmedi.
            </p>
          )}
        </div>
      </aside>
    </div>
  </div>
);

JournalPreview.propTypes = BlogPreview.propTypes;

const ProjectPreview = ({ preview }) => (
  <div className={previewShellCls}>
    <div className="relative h-64 overflow-hidden md:h-80">
      <MediaFrame
        media={preview.cover}
        fallbackText="Kapak önizlemesi"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <h2 className="text-2xl font-bold md:text-4xl">
          {preview.title || "Proje başlığı"}
        </h2>
      </div>
    </div>
    <div className="grid gap-8 p-6 lg:grid-cols-3">
      <article className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <h3 className="mb-4 text-lg font-semibold text-secondaryColor">
          Proje Hakkında
        </h3>
        <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">
          {preview.description || "Proje açıklaması burada görünecek."}
        </p>
      </article>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className={sectionTitleCls}>Proje Bilgileri</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-200">
            <p>Kategori: {preview.category || "Belirtilmemiş"}</p>
            <p>Başlangıç: {preview.startDate || "—"}</p>
            <p>Bitiş: {preview.endDate || "—"}</p>
          </div>
        </div>
        {(preview.video?.src || (preview.images || []).length > 0) && (
          <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className={sectionTitleCls}>Medya</p>
            <div className="mt-4 grid gap-3">
              {preview.video?.src && (
                <MediaFrame
                  media={preview.video}
                  fallbackText="Video"
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              )}
              {(preview.images || []).map((image, index) => (
                <MediaFrame
                  key={`${image.src}-${index}`}
                  media={image}
                  fallbackText="Görsel"
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  </div>
);

ProjectPreview.propTypes = {
  preview: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    cover: mediaShape,
    video: mediaShape,
    images: PropTypes.arrayOf(mediaShape),
  }).isRequired,
};

const SubServiceAccordion = ({ item, index }) => {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="text-base font-semibold text-secondaryColor dark:text-white">
            {item.title || `Alt Hizmet ${index + 1}`}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {item.type || "Alt hizmet tipi"}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {open ? "Kapat" : "Aç"}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-200/70 px-5 py-5 dark:border-slate-800">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <MediaFrame
              media={item.cover}
              fallbackText="Kapak yok"
              className="aspect-[9/16] w-full rounded-2xl object-cover"
            />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {item.category && (
                  <span className="rounded-full bg-quaternaryColor/10 px-3 py-1 text-xs font-semibold text-quaternaryColor">
                    {item.category}
                  </span>
                )}
                {(item.usageAreas || []).map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">
                {item.description || "Alt hizmet açıklaması burada görünecek."}
              </p>
              {(item.images || []).length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {item.images.map((image, imgIndex) => (
                    <MediaFrame
                      key={`${image.src}-${imgIndex}`}
                      media={image}
                      fallbackText="Medya"
                      className="aspect-video w-full rounded-2xl object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SubServiceAccordion.propTypes = {
  item: PropTypes.shape({
    title: PropTypes.string,
    type: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    usageAreas: PropTypes.arrayOf(PropTypes.string),
    cover: mediaShape,
    images: PropTypes.arrayOf(mediaShape),
  }).isRequired,
  index: PropTypes.number.isRequired,
};

const ServicePreview = ({ preview }) => (
  <div className={previewShellCls}>
    <div className="grid gap-8 p-6 lg:grid-cols-[280px_1fr]">
      <MediaFrame
        media={preview.cover}
        fallbackText="Kapak önizlemesi"
        className="aspect-[9/16] w-full rounded-[28px] object-cover"
      />
      <div className="space-y-5">
        <div>
          <p className={sectionTitleCls}>Hizmet Önizlemesi</p>
          <h2 className="mt-3 text-2xl font-bold text-secondaryColor dark:text-white md:text-4xl">
            {preview.title || "Hizmet başlığı"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.type && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {preview.type}
              </span>
            )}
            {preview.category && (
              <span className="rounded-full bg-quaternaryColor/10 px-3 py-1 text-xs font-semibold text-quaternaryColor">
                {preview.category}
              </span>
            )}
            {(preview.usageAreas || []).map((area) => (
              <span
                key={area}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">
            {preview.description || "Hizmet açıklaması burada görünecek."}
          </p>
        </div>
        {(preview.images || []).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {preview.images.map((image, index) => (
              <MediaFrame
                key={`${image.src}-${index}`}
                media={image}
                fallbackText="Medya"
                className="aspect-video w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
    {(preview.subServices || []).length > 0 && (
      <div className="border-t border-slate-200/70 p-6 dark:border-slate-800">
        <h3 className="mb-4 text-xl font-semibold text-secondaryColor dark:text-white">
          Alt Hizmetler
        </h3>
        <div className="space-y-4">
          {preview.subServices.map((item, index) => (
            <SubServiceAccordion key={item.id || index} item={item} index={index} />
          ))}
        </div>
      </div>
    )}
  </div>
);

ServicePreview.propTypes = {
  preview: PropTypes.shape({
    title: PropTypes.string,
    type: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    usageAreas: PropTypes.arrayOf(PropTypes.string),
    cover: mediaShape,
    images: PropTypes.arrayOf(mediaShape),
    subServices: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        type: PropTypes.string,
        category: PropTypes.string,
        description: PropTypes.string,
        usageAreas: PropTypes.arrayOf(PropTypes.string),
        cover: mediaShape,
        images: PropTypes.arrayOf(mediaShape),
      })
    ),
  }).isRequired,
};

export { BlogPreview, JournalPreview, ProjectPreview, ServicePreview };
