import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import OpenAI from 'openai';

const fastify = Fastify({
  logger: true
});

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

// 生词注释 API
interface AnnotateRequest {
  word: string;
  level?: string;
  context?: string;
}

fastify.post<{ Body: AnnotateRequest }>('/api/annotate', async (request, reply) => {
  const { word, level = 'B2', context } = request.body;

  if (!word || typeof word !== 'string') {
    return reply.code(400).send({ error: 'Word is required' });
  }

  try {
    const prompt = `You are a language learning assistant. Provide comprehensive annotation for the English word "${word}" suitable for a ${level} level learner.
${context ? `\nContext: "${context}"` : ''}

Please provide the following information in JSON format:
{
  "word": "${word}",
  "baseForm": "base form of the word if it's an inflected form (e.g., 'run' for 'ran', 'be' for 'was'), otherwise leave empty",
  "ipa": "International Phonetic Alphabet pronunciation (without slashes)",
  "chinese": "Concise Chinese translation - ONE SHORT WORD OR PHRASE ONLY, no semicolons, no extra explanations (简体中文)",
  "definition": "Clear English definition",
  "example": "A natural example sentence using this word",
  "level": "CEFR level (A1/A2/B1/B2/C1/C2)",
  "partOfSpeech": "Part of speech (noun/verb/adjective/etc.)"
}

Important: 
- If the word is an irregular past tense (e.g., 'ran'), past participle (e.g., 'spoken'), or other inflected form, provide the baseForm.
- The "example" field MUST contain a complete, natural sentence demonstrating the word's usage. NEVER leave it empty.
- Return ONLY the JSON object, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const annotation = JSON.parse(content);

    // Validate required fields
    if (!annotation.example || annotation.example.trim() === '') {
      throw new Error('Generated annotation missing example sentence');
    }
    return {
      success: true,
      data: annotation,
      usage: completion.usage,
    };
  } catch (error: any) {
    fastify.log.error('Annotation error:', error);
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to generate annotation',
    });
  }
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
