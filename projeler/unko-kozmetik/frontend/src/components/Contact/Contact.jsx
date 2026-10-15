import "./Contact.css";

const MAPS_LINK =
  "https://www.google.com/maps/search/?api=1&query=%C3%9Cn-Ko%20Kozmetik%20Eryaman%20Ankara";

const Contact = () => {
  return (
    <section className="contact">
      <div className="container">
        <header className="contact-header">
          <span className="eyebrow">İletişim</span>
          <h1 className="page-title">Size nasıl yardımcı olabiliriz?</h1>
          <p>
            Ürün önerisi, sipariş ya da iade için bize telefon veya e-posta ile
            ulaşın; mağazamıza da bekleriz.
          </p>
        </header>

        <div className="contact-grid">
          <div className="contact-info">
            <div className="contact-card">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <div>
                <h2>Mağaza</h2>
                <address className="contact-street">
                  Eryaman, 2. Cd. AVM Eryaman D:11/9
                  <br />
                  06824 Etimesgut / Ankara
                </address>
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="link-arrow"
                >
                  Yol tarifi al <i className="bi bi-arrow-up-right" />
                </a>
              </div>
            </div>
            <div className="contact-card">
              <i className="bi bi-telephone" aria-hidden="true" />
              <div>
                <h2>Telefon</h2>
                <a href="tel:+905525395910">+90 552 539 59 10</a>
              </div>
            </div>
            <div className="contact-card">
              <i className="bi bi-envelope" aria-hidden="true" />
              <div>
                <h2>E-posta</h2>
                <a href="mailto:info@ünkokozmetik.com">info@ünkokozmetik.com</a>
              </div>
            </div>
            <div className="contact-card">
              <i className="bi bi-clock" aria-hidden="true" />
              <div>
                <h2>Çalışma saatleri</h2>
                <p className="contact-date">
                  Pazartesi – Cumartesi · 09.00 – 18.00
                </p>
                <p className="contact-muted">Pazar kapalıyız</p>
              </div>
            </div>
          </div>

          <div className="contact-map">
            <iframe
              title="ÜnKo Kozmetik konumu"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3057.714856601749!2d32.61829347618013!3d39.970127471514964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d330b19fab209b%3A0xf3732525d9d12183!2s%C3%9Cn-Ko%20Kozmetik!5e0!3m2!1str!2str!4v1745801163902!5m2!1str!2str"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
