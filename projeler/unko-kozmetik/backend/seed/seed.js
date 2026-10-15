/********************************************************
 * backend/seed/seed.js
 *
 * Kullanım:  npm run seed
 * Eksik olan admin/demo kullanıcıyı, kategorileri, kuponları ve
 * (veritabanında hiç ürün yoksa) demo ürünlerini ekler.
 * Var olan kayıtlara dokunmaz; tekrar çalıştırmak güvenlidir.
 ********************************************************/
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const config = require("../config");
const User = require("../models/User");
const Address = require("../models/Address");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const data = require("./data");

const ADMIN_EMAIL = (
  process.env.SEED_ADMIN_EMAIL || "admin@unkokozmetik.com"
).toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const DEMO_EMAIL = "kullanici@unkokozmetik.com";
const DEMO_PASSWORD = "kullanici123";

const log = (msg) => console.log(`  ${msg}`);

const ensureUser = async ({ email, password, username, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
      log(`${email} rolü "${role}" yapıldı`);
    } else {
      log(`${email} zaten var`);
    }
    return existing;
  }
  const user = await User.create({
    email,
    username,
    role,
    password: await bcrypt.hash(password, 10),
  });
  log(`${email} oluşturuldu (şifre: ${password})`);
  return user;
};

const readImages = (key) =>
  [1, 2]
    .map((n) => path.join(__dirname, "images", `${key}-${n}.jpg`))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({
      data: fs.readFileSync(file),
      contentType: "image/jpeg",
    }));

const run = async () => {
  if (config.isProduction) {
    throw new Error("Demo verisi production ortamında oluşturulamaz.");
  }

  let uri;
  try {
    uri = new URL(config.mongoUri);
  } catch {
    throw new Error("Demo verisi için geçerli bir yerel MONGO_URI tanımlayın.");
  }
  const localHosts = new Set([
    "localhost",
    "127.0.0.1",
    "[::1]",
    "mongo",
    "unko-mongo",
  ]);
  if (uri.protocol !== "mongodb:" || !localHosts.has(uri.hostname.toLowerCase())) {
    throw new Error(
      "Demo verisi yalnızca yerel MongoDB üzerinde oluşturulabilir. Uzak veritabanları ve Atlas bağlantıları kabul edilmez."
    );
  }

  await mongoose.connect(config.mongoUri);
  console.log("Yerel demo veritabanına bağlanıldı.");

  console.log("Kullanıcılar");
  await ensureUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    username: "Admin",
    role: "admin",
  });
  const demoUser = await ensureUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    username: "Ayşe Yılmaz",
    role: "user",
  });
  if (!(await Address.exists({ userId: demoUser._id }))) {
    await Address.create({
      userId: demoUser._id,
      email: demoUser.email,
      name: "Ayşe Yılmaz",
      phone: "905551112233",
      address: "Eryaman Mah. 2. Cd. No:11 D:9",
      district: "Etimesgut",
      city: "Ankara",
    });
    log("demo kullanıcıya adres eklendi");
  }

  console.log("Kategoriler");
  const categoryIds = {};
  for (const cat of data.categories) {
    let doc = await Category.findOne({ name: cat.name });
    if (!doc) {
      doc = await Category.create(cat);
      log(`${cat.name} oluşturuldu`);
    }
    categoryIds[cat.name] = doc._id;
  }

  console.log("Kuponlar");
  for (const coupon of data.coupons) {
    if (await Coupon.exists({ code: coupon.code })) {
      log(`${coupon.code} zaten var`);
    } else {
      await Coupon.create(coupon);
      log(`${coupon.code} oluşturuldu (%${coupon.discountPercent})`);
    }
  }

  console.log("Ürünler");
  if (await Product.exists({})) {
    log("veritabanında ürün olduğu için demo ürünler eklenmedi");
  } else {
    // Ters sırada eklenir: listedeki ilk ürünler "yeni gelenler"de önde görünür
    for (const p of [...data.products].reverse()) {
      const productReviews = data.reviews
        .filter((r) => r.image === p.image)
        .map((r) => ({
          text: r.text,
          rating: r.rating,
          user: demoUser._id,
          approved: true,
        }));

      // pre("save") hook'u puan ortalamasını hesaplar
      await new Product({
        name: p.name,
        category: categoryIds[p.category],
        brand: p.brand.toLowerCase(),
        description: p.description,
        price: p.price,
        colors: p.colors || [],
        sizes: p.sizes || [],
        img: readImages(p.image),
        reviews: productReviews,
      }).save();
    }
    log(`${data.products.length} demo ürün eklendi`);
  }

  console.log("\nTamamlandı.");
  console.log(`  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Demo:   ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
};

run()
  .catch((err) => {
    console.error("Seed hatası:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
