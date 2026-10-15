const nodemailer = require("nodemailer");
const User = require("../models/User");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const {
  clampText,
  escapeHtml,
  isValidEmailAddress,
  normalizeEmailAddress,
  sanitizeHeaderValue,
  splitEmailList,
  stripHtml,
} = require("./email");

const from = normalizeEmailAddress(process.env.MAIL_FROM);
const pass = process.env.MAIL_PASS || "";
const transportUser = process.env.SMTP_USER || from;
const transportPass = process.env.SMTP_PASS || pass;
const fallbackTo = normalizeEmailAddress(process.env.MAIL_TO || from);
const frontendOrigin = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)[0] || "http://localhost:5173";

const adminList = splitEmailList(process.env.ADMIN_EMAILS || fallbackTo || "");

function createTransporter() {
  const transportOptions = {
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      ...transportOptions,
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: {
        user: transportUser,
        pass: transportPass,
      },
    });
  }

  return nodemailer.createTransport({
    ...transportOptions,
    service: "gmail",
    auth: { user: transportUser, pass: transportPass },
  });
}

const transporter = createTransporter();

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatMoney(value) {
  return `₺${moneyFormatter.format(Number(value || 0))}`;
}

function formatDate(value) {
  const parsed = value ? new Date(value) : new Date();
  return dateFormatter.format(parsed);
}

function formatAddress(order) {
  const address = order?.address || {};
  return [
    address.title,
    address.mainaddress,
    address.street,
    [address.district, address.city].filter(Boolean).join(" / "),
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildTransportError() {
  const err = new Error("Mail servisi yapılandırılmamış.");
  err.code = "MAIL_NOT_CONFIGURED";
  return err;
}

function getMailSender() {
  if (!from || !transportPass) {
    throw buildTransportError();
  }

  return {
    from: `"Oldsocks" <${from}>`,
  };
}

function resolveRecipients(input) {
  const list = Array.isArray(input) ? input : [input];
  const normalized = list
    .flatMap((entry) => splitEmailList(entry))
    .filter((entry, index, arr) => arr.indexOf(entry) === index);

  if (!normalized.length) {
    throw new Error("Geçerli alıcı e-posta adresi bulunamadı.");
  }

  return normalized;
}

async function safeSend({ to, subject, html, text, replyTo, bcc }) {
  const sender = getMailSender();
  const recipients = resolveRecipients(to);
  const hasBcc = Array.isArray(bcc) ? bcc.length > 0 : Boolean(bcc);
  const bccList = hasBcc ? resolveRecipients(bcc) : undefined;
  const payload = {
    ...sender,
    to: recipients,
    subject: sanitizeHeaderValue(subject, 180),
    html,
    text,
  };

  if (bccList?.length) payload.bcc = bccList;

  if (replyTo && isValidEmailAddress(replyTo)) {
    payload.replyTo = normalizeEmailAddress(replyTo);
  }

  return transporter.sendMail(payload);
}

function getAdminRecipients() {
  return adminList.length ? adminList : fallbackTo ? [fallbackTo] : [];
}

function baseEmailLayout({ preheader, eyebrow, title, subtitle, bodyHtml, footerHtml }) {
  const safePreheader = escapeHtml(preheader || "");
  return `
  <!doctype html>
  <html lang="tr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f1ea;color:#111827;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(17,24,39,0.08);">
              <tr>
                <td style="padding:36px 40px;background:linear-gradient(135deg,#111827 0%,#1f2937 100%);color:#ffffff;">
                  <div style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.72;margin-bottom:12px;">${escapeHtml(
                    eyebrow || "Oldsocks"
                  )}</div>
                  <div style="font-size:34px;line-height:1.1;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(
                    title
                  )}</div>
                  ${
                    subtitle
                      ? `<div style="margin-top:12px;font-size:15px;line-height:1.7;opacity:0.88;">${escapeHtml(
                          subtitle
                        )}</div>`
                      : ""
                  }
                </td>
              </tr>
              <tr>
                <td style="padding:32px 40px 20px;">
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px 32px;color:#6b7280;font-size:12px;line-height:1.7;">
                  ${
                    footerHtml ||
                    "Bu e-posta Oldsocks sistemleri tarafından otomatik olarak oluşturulmuştur."
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function summaryCard(label, value, tone = "dark") {
  const colors = {
    dark: { bg: "#f9fafb", text: "#111827", border: "#e5e7eb" },
    success: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    accent: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  };
  const palette = colors[tone] || colors.dark;
  return `
    <td style="padding:0 6px 12px 0;">
      <div style="border:1px solid ${palette.border};background:${palette.bg};border-radius:16px;padding:16px 18px;min-width:120px;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">${escapeHtml(
          label
        )}</div>
        <div style="font-size:20px;font-weight:700;color:${palette.text};">${escapeHtml(
          value
        )}</div>
      </div>
    </td>`;
}

function buildItemsTable(order) {
  const rows = (order.items || [])
    .map((item) => {
      const meta = [item.size ? `Beden: ${item.size}` : "", item.color ? `Renk: ${item.color}` : ""]
        .filter(Boolean)
        .join(" • ");

      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <div style="font-weight:600;color:#111827;">${escapeHtml(item.name)}</div>
            ${
              meta
                ? `<div style="margin-top:6px;font-size:12px;color:#6b7280;">${escapeHtml(meta)}</div>`
                : ""
            }
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;vertical-align:top;">
            ${escapeHtml(String(item.qty || 0))}
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;vertical-align:top;">
            ${escapeHtml(formatMoney(item.price))}
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;vertical-align:top;">
            ${escapeHtml(formatMoney(Number(item.qty || 0) * Number(item.price || 0)))}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #111827;">Ürün</th>
          <th align="center" style="padding:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #111827;">Adet</th>
          <th align="right" style="padding:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #111827;">Birim</th>
          <th align="right" style="padding:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #111827;">Toplam</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildPricingTable(order) {
  const pricing = order?.pricing || {};
  const campaignSavings = Number(order?.campaign?.savings || pricing.campaignDiscount || 0);
  const couponSavings = Number(order?.coupon?.savings || pricing.couponDiscount || 0);
  const shippingFee = Number(pricing.shippingFee ?? order?.shipping?.fee ?? 0);
  const subTotal = Number(pricing.subTotal || order.totalPrice || 0);
  const discountedSubTotal = Number(pricing.discountedSubTotal || order.totalPrice || 0);
  const grandTotal = Number(pricing.grandTotal || order.totalPrice || 0);

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Ara Toplam</td>
        <td align="right" style="padding:6px 0;color:#111827;">${escapeHtml(formatMoney(subTotal))}</td>
      </tr>
      ${
        campaignSavings > 0
          ? `<tr>
              <td style="padding:6px 0;color:#047857;">Kampanya İndirimi${
                order?.campaign?.name ? ` (${escapeHtml(order.campaign.name)})` : ""
              }</td>
              <td align="right" style="padding:6px 0;color:#047857;">-${escapeHtml(
                formatMoney(campaignSavings)
              )}</td>
            </tr>`
          : ""
      }
      ${
        couponSavings > 0
          ? `<tr>
              <td style="padding:6px 0;color:#1d4ed8;">Kupon İndirimi${
                order?.coupon?.code ? ` (${escapeHtml(order.coupon.code)})` : ""
              }</td>
              <td align="right" style="padding:6px 0;color:#1d4ed8;">-${escapeHtml(
                formatMoney(couponSavings)
              )}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Ürünler Toplamı</td>
        <td align="right" style="padding:6px 0;color:#111827;">${escapeHtml(
          formatMoney(discountedSubTotal)
        )}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Kargo</td>
        <td align="right" style="padding:6px 0;color:#111827;">${escapeHtml(
          shippingFee > 0 ? formatMoney(shippingFee) : "Ücretsiz"
        )}</td>
      </tr>
      <tr>
        <td style="padding-top:14px;border-top:1px solid #e5e7eb;font-size:16px;font-weight:700;color:#111827;">Genel Toplam</td>
        <td align="right" style="padding-top:14px;border-top:1px solid #e5e7eb;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(
          formatMoney(grandTotal)
        )}</td>
      </tr>
    </table>`;
}

async function resolveOrderContext(order) {
  let userDoc = null;

  if (order?.user && typeof order.user === "object" && order.user.email) {
    userDoc = order.user;
  } else if (order?.user) {
    userDoc = await User.findById(order.user)
      .select("firstName lastName email phone")
      .lean();
  }

  const guest = order?.guest || null;
  const customerEmail = normalizeEmailAddress(guest?.email || userDoc?.email || "");
  const customerName =
    [guest?.firstName || userDoc?.firstName || "", guest?.lastName || userDoc?.lastName || ""]
      .join(" ")
      .trim() || "Değerli Müşterimiz";
  const customerPhone = guest?.phone || userDoc?.phone || "-";

  return {
    userDoc,
    guest,
    customerEmail,
    customerName,
    customerPhone,
    addressText: formatAddress(order),
    orderNumber: order?.orderNumber || order?._id,
    createdAtText: formatDate(order?.createdAt),
  };
}

// Siparişte kayıtlı mesafeli satış onayı (varsa) e-postada belgelenir.
function consentLine(order) {
  const consent = order?.consent;
  if (!consent?.distanceSalesAcceptedAt) return null;
  return `Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi ${formatDate(consent.distanceSalesAcceptedAt)} tarihinde onaylandı (metin sürümü: ${consent.version || "-"}). Sözleşme: ${frontendOrigin}/agreement`;
}

function buildOrderCustomerHtml(order, context) {
  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#374151;">
      Merhaba <strong>${escapeHtml(context.customerName)}</strong>, siparişiniz başarıyla alındı.
      Kargoya verildiğinde takip numarasıyla birlikte ayrıca bilgilendireceğiz.
      Siparişinizin durumunu <a href="${escapeHtml(orderTrackingLink())}" style="color:#111827;">sipariş takip sayfasından</a>
      sipariş numaranız ve e-posta adresinizle sorgulayabilirsiniz.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin-bottom:18px;">
      <tr>
        ${summaryCard("Sipariş No", `#${context.orderNumber}`)}
        ${summaryCard("Sipariş Tarihi", context.createdAtText, "accent")}
        ${summaryCard("Toplam", formatMoney(order?.pricing?.grandTotal || order?.totalPrice || 0), "success")}
      </tr>
    </table>

    <div style="margin:24px 0 14px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Sipariş İçeriği</div>
    ${buildItemsTable(order)}
    ${buildPricingTable(order)}

    <div style="margin-top:28px;padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#faf7f2;">
      <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;margin-bottom:10px;">Teslimat Bilgileri</div>
      <div style="font-size:15px;line-height:1.8;color:#111827;">
        ${escapeHtml(context.customerName)}<br/>
        ${escapeHtml(context.customerEmail || "-")}<br/>
        ${escapeHtml(context.customerPhone)}<br/>
        ${escapeHtml(context.addressText || "-")}
      </div>
    </div>
    ${
      consentLine(order)
        ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">${escapeHtml(consentLine(order))}</p>`
        : ""
    }
  `;

  return baseEmailLayout({
    preheader: `Siparişiniz alındı. Sipariş no: ${context.orderNumber}`,
    eyebrow: "Sipariş Onayı",
    title: "Siparişiniz Alındı",
    subtitle: `Sipariş numaranız #${context.orderNumber}. Tüm detaylar aşağıdadır.`,
    bodyHtml,
  });
}

function buildOrderCustomerText(order, context) {
  const itemLines = (order.items || [])
    .map((item) => {
      const extras = [item.size ? `Beden: ${item.size}` : "", item.color ? `Renk: ${item.color}` : ""]
        .filter(Boolean)
        .join(" / ");
      return `- ${item.name}${extras ? ` (${extras})` : ""} | ${item.qty} x ${formatMoney(
        item.price
      )} = ${formatMoney(Number(item.qty || 0) * Number(item.price || 0))}`;
    })
    .join("\n");

  return [
    "Oldsocks - Sipariş Onayı",
    "",
    `Merhaba ${context.customerName},`,
    `Siparişiniz başarıyla alındı.`,
    `Kargoya verildiğinde takip numarasıyla birlikte ayrıca bilgilendireceğiz.`,
    `Sipariş takibi: ${orderTrackingLink()}`,
    "",
    `Sipariş No: #${context.orderNumber}`,
    `Sipariş Tarihi: ${context.createdAtText}`,
    "",
    "Sipariş İçeriği:",
    itemLines,
    "",
    `Ara Toplam: ${formatMoney(order?.pricing?.subTotal || order.totalPrice || 0)}`,
    Number(order?.campaign?.savings || order?.pricing?.campaignDiscount || 0) > 0
      ? `Kampanya İndirimi: -${formatMoney(
          order?.campaign?.savings || order?.pricing?.campaignDiscount || 0
        )}`
      : null,
    Number(order?.coupon?.savings || order?.pricing?.couponDiscount || 0) > 0
      ? `Kupon İndirimi${
          order?.coupon?.code ? ` (${order.coupon.code})` : ""
        }: -${formatMoney(
          order?.coupon?.savings || order?.pricing?.couponDiscount || 0
        )}`
      : null,
    `Kargo: ${Number(order?.pricing?.shippingFee || order?.shipping?.fee || 0) > 0 ? formatMoney(
      order?.pricing?.shippingFee || order?.shipping?.fee || 0
    ) : "Ücretsiz"}`,
    `Genel Toplam: ${formatMoney(order?.pricing?.grandTotal || order.totalPrice || 0)}`,
    "",
    "Teslimat Bilgileri:",
    context.customerName,
    context.customerEmail || "-",
    context.customerPhone,
    context.addressText || "-",
    consentLine(order) ? "" : null,
    consentLine(order),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildOrderAdminHtml(order, context) {
  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#374151;">
      Sisteme yeni bir sipariş düştü. Sipariş ve müşteri detayları aşağıdadır.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin-bottom:18px;">
      <tr>
        ${summaryCard("Sipariş No", `#${context.orderNumber}`)}
        ${summaryCard("Müşteri", context.customerName, "accent")}
        ${summaryCard("Toplam", formatMoney(order?.pricing?.grandTotal || order?.totalPrice || 0), "success")}
      </tr>
    </table>

    <div style="margin:24px 0 14px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Müşteri Bilgileri</div>
    <div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;font-size:15px;line-height:1.8;color:#111827;">
      ${escapeHtml(context.customerName)}<br/>
      ${escapeHtml(context.customerEmail || "-")}<br/>
      ${escapeHtml(context.customerPhone)}<br/>
      ${escapeHtml(context.addressText || "-")}
    </div>

    <div style="margin:24px 0 14px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Sipariş İçeriği</div>
    ${buildItemsTable(order)}
    ${buildPricingTable(order)}
  `;

  return baseEmailLayout({
    preheader: `Yeni sipariş geldi. Sipariş no: ${context.orderNumber}`,
    eyebrow: "Yeni Sipariş",
    title: "Yeni Sipariş Bildirimi",
    subtitle: `${context.customerName} tarafından oluşturulan sipariş detayları.`,
    bodyHtml,
  });
}

function buildOrderAdminText(order, context) {
  return [
    `Yeni Sipariş: #${context.orderNumber}`,
    `Tarih: ${context.createdAtText}`,
    `Müşteri: ${context.customerName}`,
    `E-posta: ${context.customerEmail || "-"}`,
    `Telefon: ${context.customerPhone}`,
    `Adres: ${context.addressText || "-"}`,
    "",
    buildOrderCustomerText(order, context),
  ].join("\n");
}

async function sendOrderPlacedMail(order, options = {}) {
  const context = await resolveOrderContext(order);
  const customerRecipient = isValidEmailAddress(context.customerEmail)
    ? context.customerEmail
    : null;
  const adminRecipients = getAdminRecipients();

  const result = {
    customerSent: false,
    customerSkipped: Boolean(options.skipCustomer) || !customerRecipient,
    adminSent: false,
    adminSkipped: Boolean(options.skipAdmin) || adminRecipients.length === 0,
    errors: [],
  };

  if (!options.skipCustomer && customerRecipient) {
    try {
      await safeSend({
        to: customerRecipient,
        subject: `Siparişiniz alındı: #${context.orderNumber}`,
        html: buildOrderCustomerHtml(order, context),
        text: buildOrderCustomerText(order, context),
      });
      result.customerSent = true;
      result.customerSkipped = false;
    } catch (error) {
      result.errors.push({
        target: "customer",
        message: error?.message || "Müşteri maili gönderilemedi.",
      });
    }
  }

  if (!options.skipAdmin && adminRecipients.length) {
    try {
      await safeSend({
        to: adminRecipients[0],
        bcc: adminRecipients.slice(1),
        subject: `Yeni Sipariş: #${context.orderNumber}`,
        html: buildOrderAdminHtml(order, context),
        text: buildOrderAdminText(order, context),
      });
      result.adminSent = true;
      result.adminSkipped = false;
    } catch (error) {
      result.errors.push({
        target: "admin",
        message: error?.message || "Admin maili gönderilemedi.",
      });
    }
  }

  if (!result.customerSent && !result.adminSent && result.errors.length > 0) {
    const error = new Error(result.errors.map((entry) => entry.message).join(" | "));
    error.code = "ORDER_MAIL_FAILED";
    error.details = result.errors;
    throw error;
  }

  return result;
}

function applyOrderMailResult(order, result, date = new Date()) {
  if (result.customerSent || result.customerSkipped) {
    order.customerMailSentAt = order.customerMailSentAt || date;
  }
  if (result.adminSent || result.adminSkipped) {
    order.adminMailSentAt = order.adminMailSentAt || date;
  }

  const customerDone = Boolean(order.customerMailSentAt);
  const adminDone = Boolean(order.adminMailSentAt);

  if (customerDone && adminDone) {
    order.orderMailSentAt = order.orderMailSentAt || date;
  }

  return order;
}

function buildPasswordResetHtml({ user, resetLink, expiresAt }) {
  const fullName =
    [user?.firstName || "", user?.lastName || ""].join(" ").trim() ||
    "Değerli Müşterimiz";

  return baseEmailLayout({
    preheader: "Şifre sıfırlama talebiniz alındı.",
    eyebrow: "Hesap Güvenliği",
    title: "Şifrenizi Yenileyin",
    subtitle: "Bu talep size aitse aşağıdaki bağlantıyı kullanarak yeni şifrenizi belirleyebilirsiniz.",
    bodyHtml: `
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#374151;">
        Merhaba <strong>${escapeHtml(fullName)}</strong>, hesabınız için bir şifre sıfırlama talebi alındı.
      </p>
      <div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Geçerlilik Süresi</div>
        <div style="font-size:15px;line-height:1.8;color:#111827;">${escapeHtml(
          formatDate(expiresAt)
        )} tarihine kadar</div>
      </div>
      <div style="margin-top:24px;">
        <a href="${escapeHtml(
          resetLink
        )}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">
          Şifreyi Yenile
        </a>
      </div>
      <p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#6b7280;">
        Bu talep size ait değilse bu e-postayı dikkate almayabilirsiniz. Mevcut şifreniz değişmez.
      </p>
    `,
  });
}

function buildPasswordResetText({ user, resetLink, expiresAt }) {
  const fullName =
    [user?.firstName || "", user?.lastName || ""].join(" ").trim() ||
    "Değerli Müşterimiz";

  return [
    "Oldsocks - Şifre Sıfırlama",
    "",
    `Merhaba ${fullName},`,
    "Hesabınız için bir şifre sıfırlama talebi alındı.",
    `Bağlantı geçerlilik süresi: ${formatDate(expiresAt)}`,
    "",
    resetLink,
    "",
    "Bu talep size ait değilse bu e-postayı dikkate almayabilirsiniz.",
  ].join("\n");
}

async function sendPasswordResetMail({ user, resetLink, expiresAt }) {
  const email = normalizeEmailAddress(user?.email);
  if (!isValidEmailAddress(email)) {
    throw new Error("Geçerli alıcı e-posta adresi bulunamadı.");
  }

  await safeSend({
    to: email,
    subject: "Şifre sıfırlama bağlantınız",
    html: buildPasswordResetHtml({ user, resetLink, expiresAt }),
    text: buildPasswordResetText({ user, resetLink, expiresAt }),
  });
}

function buildCommentModerationHtml({ title, subtitle, contentBlocks }) {
  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(
      subtitle
    )}</p>
    ${contentBlocks.join("")}
  `;

  return baseEmailLayout({
    preheader: title,
    eyebrow: "İçerik Moderasyonu",
    title,
    subtitle,
    bodyHtml,
  });
}

async function sendPendingCommentMail({ comment, post }) {
  const recipients = getAdminRecipients();
  if (!recipients.length) return;

  const html = buildCommentModerationHtml({
    title: "Onay Bekleyen Yorum",
    subtitle: `${post?.title || "İçerik"} başlıklı gönderi için yeni bir yorum var.`,
    contentBlocks: [
      `<div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Gönderen</div>
        <div style="font-size:15px;color:#111827;font-weight:600;">${escapeHtml(
          comment?.authorName || comment?.authorEmail || "Ziyaretçi"
        )}</div>
        <div style="margin-top:14px;font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(
          clampText(comment?.content || "", 600)
        )}</div>
      </div>`,
    ],
  });

  await safeSend({
    to: recipients[0],
    bcc: recipients.slice(1),
    subject: "Onay Bekleyen Yorum",
    html,
    text: `Onay Bekleyen Yorum\nGönderi: ${post?.title || "-"}\nYazan: ${
      comment?.authorName || comment?.authorEmail || "Ziyaretçi"
    }\n\n${clampText(comment?.content || "", 600)}`,
  });
}

async function sendPendingReplyMail({ reply, post, parentComment }) {
  const recipients = getAdminRecipients();
  if (!recipients.length) return;

  const html = buildCommentModerationHtml({
    title: "Onay Bekleyen Yanıt",
    subtitle: `${post?.title || "İçerik"} gönderisine yeni bir yanıt geldi.`,
    contentBlocks: [
      `<div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;margin-bottom:16px;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Yanıtlayan</div>
        <div style="font-size:15px;color:#111827;font-weight:600;">${escapeHtml(
          reply?.authorName || reply?.authorEmail || "Ziyaretçi"
        )}</div>
      </div>`,
      `<div style="padding:18px;border:1px dashed #d1d5db;border-radius:18px;background:#ffffff;margin-bottom:16px;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Yanıtlanan Yorum</div>
        <div style="font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(
          clampText(parentComment?.content || "", 400)
        )}</div>
      </div>`,
      `<div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Yanıt</div>
        <div style="font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(
          clampText(reply?.content || "", 600)
        )}</div>
      </div>`,
    ],
  });

  await safeSend({
    to: recipients[0],
    bcc: recipients.slice(1),
    subject: "Onay Bekleyen Yanıt",
    html,
    text: `Onay Bekleyen Yanıt\nGönderi: ${post?.title || "-"}\nYanıtlayan: ${
      reply?.authorName || reply?.authorEmail || "Ziyaretçi"
    }\n\nYanıtlanan yorum:\n${clampText(parentComment?.content || "", 400)}\n\nYanıt:\n${clampText(
      reply?.content || "",
      600
    )}`,
  });
}

async function sendContactMail({ name, email, subject, message }) {
  const recipients = getAdminRecipients();
  if (!recipients.length) {
    throw buildTransportError();
  }

  const safeName = clampText(name, 120);
  const safeSubject = sanitizeHeaderValue(subject, 140);
  const safeMessage = String(message || "").trim().slice(0, 5000);

  const html = baseEmailLayout({
    preheader: `Yeni iletişim formu mesajı: ${safeSubject}`,
    eyebrow: "İletişim Formu",
    title: "Yeni Mesaj",
    subtitle: `${safeName} tarafından gönderilen iletişim formu mesajı.`,
    bodyHtml: `
      <div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;margin-bottom:18px;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Gönderen</div>
        <div style="font-size:15px;line-height:1.8;color:#111827;">
          ${escapeHtml(safeName)}<br/>
          ${escapeHtml(email)}
        </div>
      </div>
      <div style="padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Mesaj</div>
        <div style="font-size:15px;line-height:1.9;color:#374151;white-space:pre-wrap;">${escapeHtml(
          safeMessage
        )}</div>
      </div>
    `,
  });

  await safeSend({
    to: recipients[0],
    bcc: recipients.slice(1),
    subject: `İletişim: ${safeSubject}`,
    html,
    text: `İletişim Formu\nGönderen: ${safeName} <${email}>\nKonu: ${safeSubject}\n\n${safeMessage}`,
    replyTo: email,
  });
}

function buildNewsletterNewBlogHtml({ post, link }) {
  const title = clampText(post?.title || "Yeni Blog Yazısı", 160);
  const excerpt = clampText(stripHtml(post?.content || ""), 260);

  return baseEmailLayout({
    preheader: title,
    eyebrow: "Oldsocks Bülten",
    title,
    subtitle: excerpt || "Yeni blog içeriğimizi incelemek için bağlantıyı kullanabilirsiniz.",
    bodyHtml: `
      <div style="padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;">
        <div style="font-size:15px;line-height:1.9;color:#374151;">
          ${escapeHtml(excerpt || "Yeni blog yazımız yayında.")}
        </div>
      </div>
      <div style="margin-top:24px;">
        <a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">
          Yazıyı Oku
        </a>
      </div>
    `,
  });
}

async function sendNewsletterNewBlog(post, providedFrontendOrigin, pathTemplate = "/blog/:id") {
  const subs = await NewsletterSubscriber.find().select("email -_id").lean();
  const recipients = subs
    .map((entry) => normalizeEmailAddress(entry.email))
    .filter((entry, index, arr) => isValidEmailAddress(entry) && arr.indexOf(entry) === index);

  if (!recipients.length) return;

  const base = String(providedFrontendOrigin || frontendOrigin || "").split(",")[0].trim();
  const path = String(pathTemplate || "/blog/:id").replace(":id", String(post._id));
  const link = `${base}${path}`;
  const html = buildNewsletterNewBlogHtml({ post, link });

  // Aboneler birbirinin adresini görmesin: Kime alanı işletme adresi, aboneler gizli alıcı.
  await safeSend({
    to: from,
    bcc: recipients,
    subject: `Yeni Blog: ${sanitizeHeaderValue(post?.title || "Yeni Yazı", 140)}`,
    html,
    text: `${post?.title || "Yeni Yazı"}\n\n${clampText(stripHtml(post?.content || ""), 260)}\n\n${link}`,
  });
}

// Hesap güvenliği bildirimi (parola veya e-posta değişti): kullanıcının kendisine.
const ACCOUNT_NOTICE_FOOTER = "Bu işlemi siz yapmadıysanız hemen şifrenizi sıfırlayın ve bize yazın.";

async function sendAccountNoticeMail({ to, subject, lines = [], footer = ACCOUNT_NOTICE_FOOTER }) {
  const email = normalizeEmailAddress(to);
  if (!isValidEmailAddress(email)) return;
  const safeLines = lines.map((line) => clampText(String(line || ""), 400));
  const html = baseEmailLayout({
    preheader: subject,
    eyebrow: "Oldsocks Hesap Güvenliği",
    title: subject,
    subtitle: footer,
    bodyHtml: `<div style="font-size:15px;line-height:1.8;color:#374151;">${safeLines
      .map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`)
      .join("")}</div>`,
  });
  await safeSend({
    to: email,
    subject: sanitizeHeaderValue(subject, 160),
    html,
    text: `${subject}\n\n${safeLines.join("\n")}\n\n${footer}`,
  });
}

// Sistem uyarısı (ör. yedek başarısız): yalnız yöneticilere (ya da verilen adrese), düz ve kısa.
async function sendAdminAlertMail({ subject, lines = [], to = null }) {
  const recipients = to ? [to] : getAdminRecipients();
  if (!recipients.length) return;
  const safeLines = lines.map((line) => clampText(String(line || ""), 400));
  const html = baseEmailLayout({
    preheader: subject,
    eyebrow: "Oldsocks Sistem Uyarısı",
    title: subject,
    subtitle: "Bu e-posta sistem tarafından otomatik gönderildi.",
    bodyHtml: `<ul style="padding-left:18px;font-size:15px;line-height:1.8;color:#374151;">${safeLines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("")}</ul>`,
  });
  await safeSend({
    to: recipients,
    subject: sanitizeHeaderValue(subject, 160),
    html,
    text: `${subject}\n\n${safeLines.join("\n")}`,
  });
}

function orderTrackingLink() {
  return `${frontendOrigin}/siparis-takip`;
}

const STATUS_MAILS = {
  shipped: {
    subject: (no) => `Siparişiniz kargoya verildi: #${no}`,
    eyebrow: "Kargo Bilgisi",
    title: "Siparişiniz Kargoya Verildi",
    intro: "Siparişiniz kargoya teslim edildi.",
  },
  delivered: {
    subject: (no) => `Siparişiniz tamamlandı: #${no}`,
    eyebrow: "Sipariş Tamamlandı",
    title: "Siparişiniz Tamamlandı",
    intro: "Siparişiniz tamamlandı. Bizi tercih ettiğiniz için teşekkür ederiz.",
  },
  cancelled: {
    subject: (no) => `Siparişiniz iptal edildi: #${no}`,
    eyebrow: "Sipariş İptali",
    title: "Siparişiniz İptal Edildi",
    intro: "Siparişiniz iptal edildi.",
  },
};

// Kargo ve teslim bildirimi: yalnız müşteriye. kind: "shipped" | "delivered".
async function sendOrderStatusMail(order, kind) {
  const template = STATUS_MAILS[kind];
  if (!template) throw new Error(`Bilinmeyen durum e-postası: ${kind}`);
  const context = await resolveOrderContext(order);
  if (!isValidEmailAddress(context.customerEmail)) return false;

  const carrier = clampText(String(order?.shipping?.carrier || ""), 60);
  const trackingNumber = clampText(String(order?.shipping?.trackingNumber || ""), 60);
  const lines = [template.intro];
  if (kind === "cancelled" && Number(order?.refund?.amount) > 0) {
    lines.push(`İade tutarı: ${formatMoney(order.refund.amount)}`);
    lines.push("İade ödemede kullandığınız karta yapılır. Bankanıza bağlı olarak hesabınıza yansıması birkaç iş günü sürebilir.");
  }
  if (kind === "shipped") {
    if (carrier) lines.push(`Kargo firması: ${carrier}`);
    if (trackingNumber) {
      lines.push(`Takip numarası: ${trackingNumber}`);
      lines.push(`Gönderinizi ${carrier || "kargo firmasının"} sitesinden bu numarayla sorgulayabilirsiniz.`);
    }
  }
  const trackingLine = `Sipariş durumunu ${orderTrackingLink()} adresinden de görebilirsiniz.`;

  const html = baseEmailLayout({
    preheader: template.subject(context.orderNumber),
    eyebrow: template.eyebrow,
    title: template.title,
    subtitle: `Sipariş numaranız #${context.orderNumber}.`,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#374151;">
        Merhaba <strong>${escapeHtml(context.customerName)}</strong>,
      </p>
      <div style="font-size:15px;line-height:1.8;color:#374151;">${lines
        .map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`)
        .join("")}
        <p style="margin:0 0 8px;">Sipariş durumunu <a href="${escapeHtml(orderTrackingLink())}" style="color:#111827;">sipariş takip sayfasından</a> da görebilirsiniz.</p>
      </div>
      <div style="margin:24px 0 14px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Sipariş İçeriği</div>
      ${buildItemsTable(order)}`,
  });
  await safeSend({
    to: context.customerEmail,
    subject: sanitizeHeaderValue(template.subject(context.orderNumber), 160),
    html,
    text: [`Merhaba ${context.customerName},`, "", ...lines, trackingLine].join("\n"),
  });
  return true;
}

module.exports = {
  applyOrderMailResult,
  sendOrderStatusMail,
  sendAccountNoticeMail,
  sendAdminAlertMail,
  getAdminRecipients,
  sendContactMail,
  sendNewsletterNewBlog,
  sendPasswordResetMail,
  sendOrderPlacedMail,
  sendPendingCommentMail,
  sendPendingReplyMail,
};
