// Önceki sürüme dönmeden hemen önce çalışır (deploy/scripts/geri-al.sh): önceki sürüm
// stok ayrımını tanımaz, açık ayrımların stoğu takılı kalırdı. Açık ayrımların stoğunu
// geri verir, siparişleri kapatır ve PayTR ile karşılaştırmak için listeler.
require("../config/env").loadEnv();

const mongoose = require("mongoose");
const Order = require("../models/Order");
const { releaseReservation } = require("../services/stockReservation");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI ayarlı değil.");
  await mongoose.connect(process.env.MONGO_URI);
  const open = await Order.find({ status: "pending", stockUpdated: true, stockReservedUntil: { $ne: null } })
    .select("_id orderNumber conversationId")
    .lean();
  for (const order of open) await releaseReservation(order._id, "reservation_expired");
  console.log(`ACIK_AYRIM_BIRAKILDI=${open.length}`);
  for (const order of open) console.log(`  #${order.orderNumber} ${order.conversationId}`);
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("[releaseOpenHolds]", error?.message || error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
