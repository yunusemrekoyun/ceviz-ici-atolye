const net = require("net");

// Cloudflare'in yayımladığı adres blokları (https://www.cloudflare.com/ips-v4 ve ips-v6).
const CLOUDFLARE_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const cloudflareBlocks = new net.BlockList();
for (const range of CLOUDFLARE_RANGES) {
  const [address, prefix] = range.split("/");
  cloudflareBlocks.addSubnet(address, Number(prefix), net.isIPv6(address) ? "ipv6" : "ipv4");
}

function isCloudflareAddress(value) {
  const address = String(value || "").replace(/^::ffff:/i, "");
  const family = net.isIP(address);
  if (!family) return false;
  return cloudflareBlocks.check(address, family === 6 ? "ipv6" : "ipv4");
}

// Site Cloudflare arkasındayken Nginx'in gördüğü adres Cloudflare sunucusudur; hız
// sınırları, misafir ödeme sınırı ve PayTR'a giden müşteri IP'si bütün ziyaretçileri
// aynı kişi sayardı. İstek gerçekten bir Cloudflare adresinden geldiyse ziyaretçinin
// adresi Cloudflare'in yazdığı CF-Connecting-IP başlığındadır. Doğrudan sunucuya gelen
// biri bu başlığı yazsa da adresi Cloudflare'e ait olmadığı için dikkate alınmaz.
function cloudflareClientIp(req, _res, next) {
  const header = String(req.get("cf-connecting-ip") || "").trim();
  if (header && net.isIP(header) && isCloudflareAddress(req.ip)) {
    Object.defineProperty(req, "ip", { value: header, configurable: true, enumerable: true });
  }
  next();
}

// Cloudflare önbelleği yanıtları Origin başlığına göre ayırmaz. Origin'siz bir isteğin
// (arama botu, curl) yanıtı önbelleğe girerse CORS izni taşımaz ve sonraki birkaç saniye
// sitedeki tarayıcılar o yanıtı reddeder. Bu yüzden yalnızca sitenin kendi adresinden
// gelen okumalar paylaşılan önbelleğe açıktır; diğerleri "private" olarak döner.
function edgeCacheOnlyForSite(siteOrigin) {
  return (req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.get("origin") === siteOrigin) {
      return next();
    }
    const setHeader = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === "cache-control" && /\bpublic\b/i.test(String(value))) {
        value = String(value)
          .replace(/\bpublic\b/i, "private")
          .replace(/,\s*s-maxage=\d+/i, "")
          .replace(/s-maxage=\d+\s*,\s*/i, "");
      }
      return setHeader(name, value);
    };
    next();
  };
}

module.exports = { cloudflareClientIp, edgeCacheOnlyForSite, isCloudflareAddress, CLOUDFLARE_RANGES };
