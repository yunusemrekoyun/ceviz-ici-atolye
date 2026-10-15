import connectToDatabase from "@/lib/mongodb.js";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbReady = false;
  let dbName = null;

  const connection = await connectToDatabase();
  if (connection?.connection?.readyState === 1) {
    dbReady = true;
    dbName = connection.connection.name ?? null;
  }

  return Response.json({
    ok: true,
    dbReady,
    dbName,
    timestamp: new Date().toISOString(),
  });
}
