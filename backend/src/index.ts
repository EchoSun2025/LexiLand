import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';

const fastify = Fastify({
  logger: true
});

// 注册 CORS
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://lexiland.app'
    : 'http://localhost:5173',
  credentials: true,
});

// 健康检查路由
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: Date.now() };
});

// 测试路由
fastify.get('/api/test', async (request, reply) => {
  return { message: 'LexiLand Read Backend is running!' };
});

// 启动服务器
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Backend server is running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
