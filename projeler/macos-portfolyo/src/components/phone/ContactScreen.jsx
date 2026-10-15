import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Mail, MessageCircle, Phone, Video } from "lucide-react";
import {
  personalInfo,
  phoneContactContent,
  phoneContactSheetConfig,
  resumeConfig,
} from "#constants";
import PhoneActionSheet from "#components/phone/PhoneActionSheet.jsx";
import { runIOSSlideTransition } from "#components/phone/phoneTransitions.js";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const ContactScreen = ({ socials = [] }) => {
  const [route, setRoute] = useState("detail"); // list | detail
  const [transition, setTransition] = useState(null); // { direction, from, to }
  const [sheetOpen, setSheetOpen] = useState(false);
  const stageRef = useRef(null);
  const listPanelRef = useRef(null);
  const detailPanelRef = useRef(null);
  const transitionTlRef = useRef(null);
  const displayName = personalInfo.name;
  const email = personalInfo.email;
  const phoneNumber = personalInfo.phoneNumber;
  const displayPhone = personalInfo.phoneDisplay;
  const memojiVideo = phoneContactContent.memojiVideo;
  const avatarSrc = personalInfo.avatar;

  const editActions = useMemo(
    () => [
      {
        id: "share",
        label: phoneContactSheetConfig.actions.share,
        onPress: async () => {
          try {
            if (navigator.share) {
              await navigator.share({
                title: displayName,
                text: `${displayName} • ${email}`,
              });
            } else if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(`${displayName} • ${email}`);
            }
          } catch {
            // ignore
          }
        },
      },
      {
        id: "resume",
        label: phoneContactSheetConfig.actions.resume,
        onPress: () =>
          window.open(resumeConfig.viewUrl, "_blank", "noopener,noreferrer"),
      },
    ],
    [displayName, email]
  );

  const openContactsList = () => {
    if (route === "list" || transition) return;
    setTransition({ direction: "back", from: route, to: "list" });
    setRoute("list");
  };

  const openContactDetail = () => {
    if (route === "detail" || transition) return;
    setTransition({ direction: "forward", from: route, to: "detail" });
    setRoute("detail");
  };

  const showListPanel =
    route === "list" || transition?.from === "list" || transition?.to === "list";
  const showDetailPanel =
    route === "detail" ||
    transition?.from === "detail" ||
    transition?.to === "detail";

  useLayoutEffect(() => {
    if (!transition) return undefined;

    const stageEl = stageRef.current;
    const listEl = listPanelRef.current;
    const detailEl = detailPanelRef.current;
    if (!stageEl || !listEl || !detailEl) return undefined;

    const fromEl = transition.from === "list" ? listEl : detailEl;
    const toEl = transition.to === "list" ? listEl : detailEl;

    if (transitionTlRef.current?.kill) {
      transitionTlRef.current.kill();
      transitionTlRef.current = null;
    }

    fromEl.style.display = "flex";
    toEl.style.display = "flex";
    fromEl.style.zIndex = "1";
    toEl.style.zIndex = "2";

    const tl = runIOSSlideTransition({
      stageEl,
      fromEl,
      toEl,
      direction: transition.direction,
      onComplete: () => {
        if (transition.to === "detail") {
          listEl.style.display = "none";
          detailEl.style.display = "flex";
        } else {
          detailEl.style.display = "none";
          listEl.style.display = "flex";
        }
        listEl.style.zIndex = "";
        detailEl.style.zIndex = "";
        setTransition(null);
      },
    });

    transitionTlRef.current = tl;

    return () => {
      if (tl?.kill) tl.kill();
      if (transitionTlRef.current === tl) transitionTlRef.current = null;
    };
  }, [transition]);

  return (
    <div className="phone-app phone-contact">
      <div
        ref={stageRef}
        className={`phone-slide-stage${transition ? " is-transitioning" : ""}`}
      >
        <div
          ref={listPanelRef}
          className="phone-slide-panel"
          aria-hidden={!showListPanel}
          style={{ display: showListPanel ? "flex" : "none" }}
        >
          <div className="phone-contact-nav" role="navigation" aria-label="Contact navigation">
            <span aria-hidden className="phone-contact-nav-spacer" />
            <p className="phone-contact-nav-title">{phoneContactContent.navBackLabel}</p>
            <button
              type="button"
              className="phone-contact-nav-action"
              aria-label="Edit contact"
              onClick={() => setSheetOpen(true)}
            >
              {phoneContactContent.navActionLabel}
            </button>
          </div>

          <div className="phone-contact-content">
            <h3 className="phone-messages-large-title">{phoneContactContent.navBackLabel}</h3>
            <div className="phone-contact-section">
              <p className="phone-contact-section-title">My Card</p>
              <div className="phone-contact-card">
                <button
                  type="button"
                  className="phone-contact-row"
                  onClick={openContactDetail}
                >
                  <span className="phone-contact-row-leading" aria-hidden>
                    <span className="phone-contact-list-avatar">
                      <img src={avatarSrc} alt="" />
                    </span>
                  </span>
                  <span className="text-[16px] font-medium text-slate-900">{displayName}</span>
                  <ChevronRight size={18} className="phone-contact-row-chevron" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={detailPanelRef}
          className="phone-slide-panel"
          aria-hidden={!showDetailPanel}
          style={{ display: showDetailPanel ? "flex" : "none" }}
        >
          <div className="phone-contact-nav" role="navigation" aria-label="Contact navigation">
            <button
              type="button"
              className="phone-contact-nav-btn"
              aria-label="Contacts"
              onClick={openContactsList}
            >
              <ChevronLeft size={18} />
              <span>{phoneContactContent.navBackLabel}</span>
            </button>
            <p className="phone-contact-nav-title">{phoneContactContent.navTitle}</p>
            <button
              type="button"
              className="phone-contact-nav-action"
              aria-label="Edit contact"
              onClick={() => setSheetOpen(true)}
            >
              {phoneContactContent.navActionLabel}
            </button>
          </div>

          <div className="phone-contact-content">
            <div className="phone-contact-hero">
              <div className="phone-contact-avatar" aria-hidden>
                <video
                  className="phone-contact-memoji"
                  src={memojiVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster={phoneContactContent.poster}
                  disablePictureInPicture
                />
              </div>
              <h3 className="phone-contact-name">{displayName}</h3>
              <p className="phone-contact-tagline">{phoneContactContent.tagline}</p>
            </div>

            <div className="phone-contact-actions" aria-label="Quick actions">
              <a className="phone-contact-action" href={`sms:${phoneNumber}`}>
                <span className="phone-contact-action-icon" aria-hidden>
                  <MessageCircle size={20} />
                </span>
                <span className="phone-contact-action-label">{phoneContactContent.quickActions.message}</span>
              </a>
              <a className="phone-contact-action" href={`tel:${phoneNumber}`}>
                <span className="phone-contact-action-icon" aria-hidden>
                  <Phone size={20} />
                </span>
                <span className="phone-contact-action-label">{phoneContactContent.quickActions.call}</span>
              </a>
              <a className="phone-contact-action" href={`facetime:${phoneNumber}`}>
                <span className="phone-contact-action-icon" aria-hidden>
                  <Video size={20} />
                </span>
                <span className="phone-contact-action-label">{phoneContactContent.quickActions.video}</span>
              </a>
              <a className="phone-contact-action" href={`mailto:${email}`}>
                <span className="phone-contact-action-icon" aria-hidden>
                  <Mail size={20} />
                </span>
                <span className="phone-contact-action-label">{phoneContactContent.quickActions.mail}</span>
              </a>
            </div>

            <div className="phone-contact-section">
              <p className="phone-contact-section-title">{phoneContactContent.infoSectionTitle}</p>
              <div className="phone-contact-card">
                <a className="phone-contact-row" href={`tel:${phoneNumber}`}>
                  <span className="phone-contact-row-label">{phoneContactContent.phoneLabel}</span>
                  <span className="phone-contact-row-value">{displayPhone}</span>
                </a>
                <a className="phone-contact-row" href={`mailto:${email}`}>
                  <span className="phone-contact-row-label">{phoneContactContent.emailLabel}</span>
                  <span className="phone-contact-row-value">{email}</span>
                </a>
              </div>
            </div>

            {socials.length ? (
              <div className="phone-contact-section">
                <p className="phone-contact-section-title">{phoneContactContent.socialSectionTitle}</p>
                <div className="phone-contact-card">
                  {socials.map(({ id, bg, link, icon, text }) => (
                    <a
                      key={id}
                      href={normalizeExternalUrl(link) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="phone-contact-row phone-contact-row--link"
                    >
                      <span className="phone-contact-row-leading" aria-hidden>
                        <span className="phone-contact-social-icon" style={{ backgroundColor: bg }}>
                          <img src={icon} alt="" />
                        </span>
                      </span>
                      <span className="phone-contact-row-value">{text}</span>
                      <ChevronRight size={18} className="phone-contact-row-chevron" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <PhoneActionSheet
        open={sheetOpen}
        title={phoneContactSheetConfig.title}
        message={phoneContactSheetConfig.message}
        actions={editActions}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
};

export default ContactScreen;
