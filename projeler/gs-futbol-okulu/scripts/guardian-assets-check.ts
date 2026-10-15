import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

// Browsers fetch install metadata without cookies; only school branding may bypass the login gate.
for (const pathname of ["/veli/manifest.webmanifest", "/veli/ikon/180", "/veli/ikon/192", "/veli/ikon/512"]) {
  const response = proxy(new NextRequest(`https://example.test${pathname}`));
  assert.equal(response.headers.get("x-middleware-next"), "1", pathname);
  assert.equal(response.headers.get("set-cookie"), null, "public assets must not refresh sessions");
}
for (const pathname of ["/veli", "/veli/kart", "/veli/antrenmanlar", "/veli/bilgiler", "/veli/kart/indir?ogrenci=1", "/veli/ikon/192/private", "/veli/manifest.webmanifest/private", "/veli/ikon/999"]) {
  const response = proxy(new NextRequest(`https://example.test${pathname}`));
  assert.equal(response.status, 307, pathname);
  const target = new URL(response.headers.get("location")!);
  assert.equal(target.pathname, "/giris", pathname);
  assert.equal(target.searchParams.get("next"), pathname, "the requested student page survives login");
}
console.log("Guardian install assets are public; student pages and card downloads still require a session.");
