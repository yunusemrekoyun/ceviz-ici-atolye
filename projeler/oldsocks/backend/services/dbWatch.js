// Veritabanı bağlantısı koparsa ve ALERT_AFTER_MS içinde geri gelmezse tek bir adrese
// e-posta gider (DB_ALERT_EMAIL; yöneticilere değil). Bağlantı dönünce ikinci e-posta.
const mongoose = require("mongoose");
const { sendAdminAlertMail } = require("../utils/mailer");

const DEFAULT_ALERT_TO = "yunusemrekoyun26@gmail.com";

function istanbulTime(date) {
  return date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function startDbWatch({
  connection = mongoose.connection,
  send = sendAdminAlertMail,
  to = process.env.DB_ALERT_EMAIL || DEFAULT_ALERT_TO,
  afterMs = Number(process.env.DB_ALERT_AFTER_MS || 60_000),
} = {}) {
  let downSince = null;
  let timer = null;
  let alerted = false;

  const onDown = () => {
    if (downSince) return;
    downSince = new Date();
    timer = setTimeout(() => {
      if (connection.readyState === 1) return;
      alerted = true;
      send({
        to,
        subject: "OLDSOCKS: veritabanına ulaşılamıyor",
        lines: [
          `Bağlantı ${istanbulTime(downSince)} itibarıyla kesik.`,
          "Site bu sürede ürün ve sipariş gösteremeyebilir.",
          "MongoDB Atlas panelini ve sunucunun bağlantısını kontrol edin.",
        ],
      }).catch((error) => console.error("[db-watch] uyarı e-postası gönderilemedi:", error?.message || error));
    }, afterMs);
    timer.unref?.();
  };

  const onUp = () => {
    clearTimeout(timer);
    if (alerted) {
      send({
        to,
        subject: "OLDSOCKS: veritabanı bağlantısı düzeldi",
        lines: [`Kesinti: ${istanbulTime(downSince)} – ${istanbulTime(new Date())}.`],
      }).catch((error) => console.error("[db-watch] düzelme e-postası gönderilemedi:", error?.message || error));
    }
    downSince = null;
    alerted = false;
  };

  connection.on("disconnected", onDown);
  connection.on("connected", onUp);
  connection.on("reconnected", onUp);
  return () => {
    clearTimeout(timer);
    connection.off("disconnected", onDown);
    connection.off("connected", onUp);
    connection.off("reconnected", onUp);
  };
}

module.exports = { startDbWatch };
