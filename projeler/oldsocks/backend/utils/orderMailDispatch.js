const { applyOrderMailResult, sendOrderPlacedMail } = require("./mailer");

async function dispatchOrderPlacedMail(order) {
  if (
    order?.orderMailSentAt &&
    !order?.customerMailSentAt &&
    !order?.adminMailSentAt
  ) {
    order.customerMailSentAt = order.orderMailSentAt;
    order.adminMailSentAt = order.orderMailSentAt;
    return {
      customerSent: false,
      customerSkipped: true,
      adminSent: false,
      adminSkipped: true,
      errors: [],
    };
  }

  const result = await sendOrderPlacedMail(order, {
    skipCustomer: Boolean(order?.customerMailSentAt),
    skipAdmin: Boolean(order?.adminMailSentAt),
  });

  applyOrderMailResult(order, result);
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    console.warn(
      "[order-mail] partial delivery:",
      result.errors.map((entry) => `${entry.target}:${entry.message}`).join(" | ")
    );
  }
  return result;
}

module.exports = { dispatchOrderPlacedMail };
