const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const zlib = require("node:zlib");
const mongoose = require("mongoose");

const { EJSON } = mongoose.mongo.BSON;
const FORMAT = "oldscks-mongodb-ejson-v1";

async function writeDatabaseArchive(db, outputPath) {
  const infos = (await db.listCollections({}, { nameOnly: false }).toArray())
    .filter((entry) => entry.type === "collection" && !entry.name.startsWith("system."))
    .sort((left, right) => left.name.localeCompare(right.name));
  const createdAt = new Date().toISOString();
  const counts = {};
  const ejson = (value) => EJSON.stringify(value, { relaxed: false });

  async function* chunks() {
    yield `{"format":${JSON.stringify(FORMAT)},"database":${JSON.stringify(
      db.databaseName
    )},"createdAt":${JSON.stringify(createdAt)},"collections":[`;
    for (let i = 0; i < infos.length; i += 1) {
      const info = infos[i];
      const collection = db.collection(info.name);
      const indexes = await collection.indexes();
      if (i) yield ",";
      yield `{"name":${JSON.stringify(info.name)},"options":${ejson(
        info.options || {}
      )},"indexes":${ejson(indexes)},"documents":[`;
      let count = 0;
      const cursor = collection.find({}).batchSize(250);
      try {
        for await (const document of cursor) {
          if (count) yield ",";
          yield ejson(document);
          count += 1;
        }
      } finally {
        await cursor.close();
      }
      counts[info.name] = count;
      yield "]}";
    }
    yield "]}";
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await pipeline(
    Readable.from(chunks()),
    zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION }),
    fs.createWriteStream(outputPath, { flags: "wx", mode: 0o600 })
  );
  return { createdAt, database: db.databaseName, counts };
}

async function readDatabaseArchive(filePath) {
  const compressed = await fsp.readFile(filePath);
  const archive = EJSON.parse(zlib.gunzipSync(compressed).toString("utf8"), {
    relaxed: false,
  });
  if (archive.format !== FORMAT || !Array.isArray(archive.collections)) {
    throw new Error("Unsupported database archive");
  }
  for (const collection of archive.collections) {
    if (
      !/^[a-z][a-z0-9]*$/.test(collection.name) ||
      !Array.isArray(collection.documents) ||
      !Array.isArray(collection.indexes)
    ) {
      throw new Error("Invalid database archive collection");
    }
  }
  return archive;
}

module.exports = { FORMAT, readDatabaseArchive, writeDatabaseArchive };
