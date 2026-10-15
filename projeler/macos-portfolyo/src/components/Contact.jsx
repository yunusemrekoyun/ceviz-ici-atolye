import {
  desktopContactContent,
  desktopContactQuickActions,
  personalInfo,
  socials,
} from "#constants";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import WindowControls from "#components/WindowControls.jsx";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const Contact = () => {
  const name = personalInfo?.name ?? "Contact";
  const heroImg = desktopContactContent?.avatarSrc; // arka plan
  const avatar = desktopContactContent?.avatarSrc; // küçük avatar
  const email = desktopContactContent?.email ?? personalInfo?.email;
  const phoneDisplay = personalInfo?.phoneDisplay; // varsa
  const phoneNumber = personalInfo?.phoneNumber; // varsa

  const quick = desktopContactQuickActions.map((action) => {
    if (action.type === "sms") {
      return {
        ...action,
        href: phoneNumber ? `sms:${phoneNumber}` : null,
      };
    }

    if (action.type === "mailto") {
      return {
        ...action,
        href: email ? `mailto:${email}` : null,
      };
    }

    return { ...action, href: null };
  });

  return (
    <>
      <div id="window-header">
        <WindowControls target="contact" />
        <h2>{desktopContactContent.windowTitle}</h2>
      </div>
      <div className="contact-body contact-layout">
        {/* LEFT */}
        <div className="contact-left">
          <div className="contact-hero">
            <img className="contact-hero-img" src={heroImg} alt="" />
            <div className="contact-hero-overlay" />

            <div className="contact-hero-content">
              <h1 className="contact-name">{name}</h1>

              <div className="contact-chip">
                <img src={avatar} alt={name} className="contact-chip-avatar" />
                <div className="contact-chip-text">
                  <p className="contact-chip-title">Shared Name and Photo</p>
                  <p className="contact-chip-subtitle">Contacts Only</p>
                </div>
                <span className="contact-chip-arrow">›</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="contact-right">
          <div className="contact-card">
            <p className="contact-section-title">Contact</p>

            <div className="contact-row">
              <p className="contact-label">email</p>
              <a
                className="contact-value"
                href={email ? `mailto:${email}` : undefined}
              >
                {email}
              </a>
            </div>

            {phoneDisplay && (
              <div className="contact-row">
                <p className="contact-label">mobile</p>
                <a
                  className="contact-value"
                  href={phoneNumber ? `tel:${phoneNumber}` : undefined}
                >
                  {phoneDisplay}
                </a>
              </div>
            )}
          </div>

          <div className="contact-card">
            <p className="contact-section-title">Social</p>

            <div className="contact-actions-grid">
              {socials.map(({ id, link, icon, text }) => (
                <a
                  key={id}
                  className="contact-action"
                  href={normalizeExternalUrl(link) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={text}
                >
                  <img src={icon} alt={text} className="contact-action-icon" />
                  <span className="contact-action-text">{text}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="contact-card contact-quick">
            <div className="contact-quick-row">
              {quick.map((q) =>
                q.href ? (
                  <a key={q.id} className="contact-quick-pill" href={q.href}>
                    {q.label}
                  </a>
                ) : (
                  <button
                    key={q.id}
                    type="button"
                    className="contact-quick-pill contact-quick-btn"
                  >
                    {q.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ContactWindow = WindowWrapper(Contact, "contact");
export default ContactWindow;
