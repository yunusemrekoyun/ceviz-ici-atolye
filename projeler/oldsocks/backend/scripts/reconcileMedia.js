require("../config/env").loadEnv();

const mongoose = require("mongoose");
const { reconcileMedia } = require("../services/media/reconciliation");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI ayarlı değil.");
  const repair = process.argv.includes("--repair");
  await mongoose.connect(process.env.MONGO_URI);
  const report = await reconcileMedia({ repair });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await mongoose.connection.close();
  process.exitCode = report.healthy ? 0 : repair ? 0 : 2;
}

main().catch(async (error) => {
  console.error("Medya uzlaştırması çalıştırılamadı:", error?.message || error);
  await mongoose.connection.close().catch(() => {});
  process.exitCode = 1;
});
