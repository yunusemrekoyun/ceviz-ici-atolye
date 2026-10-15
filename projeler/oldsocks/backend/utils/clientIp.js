const net = require("node:net");

// PayTR'ye gönderilecek müşteri IP'si. Nginx gerçek istemci adresini
// X-Forwarded-For'un sonuna ekler ve app "trust proxy 1" ile req.ip'i buradan alır.
// Başlığın ilk değeri istemcinin kendisinin yazabildiği değerdir, kullanılmaz.
function getClientIp(req) {
  let ip = String(req?.ip || req?.socket?.remoteAddress || "").trim();
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  // IPv6 zone kimliği sağlayıcıya gönderilmez.
  ip = ip.split("%")[0];
  return net.isIP(ip) ? ip : "127.0.0.1";
}

module.exports = { getClientIp };
