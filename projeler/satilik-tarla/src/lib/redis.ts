import IORedis from 'ioredis';

const globalForRedis = globalThis as unknown as { redisConnection?: IORedis };

export const redisConnection =
  globalForRedis.redisConnection ??
  new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    // Next.js modül yüklemede (build/route-collection sırasında) hemen bağlanmayı
    // dener — Redis o an ayakta olmayabilir (ör. Docker build aşaması). Bağlantı
    // yalnızca ilk gerçek kuyruk işleminde kurulsun.
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisConnection = redisConnection;
}
