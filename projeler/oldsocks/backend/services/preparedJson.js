// Önbellekteki büyük JSON yanıtlarını bir kez serileştirip gerekirse bir kez
// sıkıştırır. Her istekte yeniden JSON üretmek ve sıkıştırmak tek çekirdekte en
// pahalı işti. Aynı veri tarayıcıda varsa ETag ile 304 döner.
const crypto = require("node:crypto");
const zlib = require("node:zlib");

function prepareJson(value) {
  const body = Buffer.from(JSON.stringify(value));
  const etag = `W/"${crypto.createHash("sha1").update(body).digest("base64url")}"`;
  return { body, etag, encoded: {} };
}

function encode(prepared, encoding) {
  if (!prepared.encoded[encoding]) {
    prepared.encoded[encoding] =
      encoding === "br"
        ? zlib.brotliCompressSync(prepared.body, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: prepared.body.length,
            },
          })
        : zlib.gzipSync(prepared.body, { level: 6 });
  }
  return prepared.encoded[encoding];
}

function sendPreparedJson(req, res, prepared, { cacheControl } = {}) {
  if (cacheControl) res.set("Cache-Control", cacheControl);
  res.set("ETag", prepared.etag);
  res.vary("Accept-Encoding");
  if (req.fresh) return res.status(304).end();

  res.type("application/json; charset=utf-8");
  const encoding = req.acceptsEncodings("br", "gzip", "identity");
  if (encoding === "br" || encoding === "gzip") {
    const payload = encode(prepared, encoding);
    res.set("Content-Encoding", encoding);
    res.set("Content-Length", String(payload.length));
    return res.end(payload);
  }
  res.set("Content-Length", String(prepared.body.length));
  return res.end(prepared.body);
}

module.exports = { prepareJson, sendPreparedJson };
