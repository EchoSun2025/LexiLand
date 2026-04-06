import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import 'dotenv/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_DATA_DIR = 'D:\\0_EnglishLearning';
const LEARNING_DATA_DIR = path.resolve(process.env.LEARNING_DATA_DIR || DEFAULT_DATA_DIR);
const LEARNING_IMAGES_DIR = path.join(LEARNING_DATA_DIR, 'images');
const LEARNING_BACKUPS_DIR = path.join(LEARNING_DATA_DIR, 'backups');

for (const dir of [LEARNING_DATA_DIR, LEARNING_IMAGES_DIR, LEARNING_BACKUPS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

// Serve learning images from fixed data directory
await fastify.register(staticPlugin, {
  root: LEARNING_IMAGES_DIR,
  prefix: '/learning-images/',
});

// 健康检查路由
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: Date.now(),
    dataDir: LEARNING_DATA_DIR,
  };
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

// 短语注释 API
interface AnnotatePhraseRequest {
  phrase: string;
  sentenceContext: string;
  level?: string;
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

// 短语注释 API
fastify.post<{ Body: AnnotatePhraseRequest }>('/api/annotate-phrase', async (request, reply) => {
  const { phrase, sentenceContext, level = 'B2' } = request.body;

  fastify.log.info({ phrase, sentenceContext, level }, 'Phrase annotation request');

  if (!phrase || typeof phrase !== 'string') {
    fastify.log.error({ phrase }, 'Invalid phrase');
    return reply.code(400).send({ success: false, error: 'Phrase is required' });
  }

  if (!sentenceContext || typeof sentenceContext !== 'string') {
    fastify.log.error({ sentenceContext }, 'Invalid sentenceContext');
    return reply.code(400).send({ success: false, error: 'Sentence context is required' });
  }

  try {
    const prompt = `You are a language learning assistant. Provide annotation for the English phrase or expression "${phrase}" suitable for a ${level} level learner.

The phrase appears in this sentence:
"${sentenceContext}"

Please provide the following information in JSON format:
{
  "phrase": "${phrase}",
  "chinese": "Concise Chinese translation of this phrase in this context (简体中文)",
  "explanation": "If this is a fixed expression, idiom, or common collocation, explain its meaning and usage. If it's just a regular phrase, leave this field empty or null.",
  "sentenceContext": "${sentenceContext}"
}

Important:
- Focus on translating the phrase accurately based on the sentence context
- If it's a fixed expression (idiom, phrasal verb, collocation), provide an explanation
- If it's just a regular phrase with no special meaning, you can leave "explanation" empty
- Do NOT include IPA pronunciation
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

    fastify.log.info({ annotation }, 'Phrase annotation success');

    return {
      success: true,
      data: annotation,
      usage: completion.usage,
    };
  } catch (error: any) {
    fastify.log.error({ error, stack: error.stack }, 'Phrase annotation error');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to generate phrase annotation',
    });
  }
});

// Unsplash 图片搜索 API
interface SearchImageRequest {
  word: string;
  definition?: string;
}

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: {
      regular?: string;
    };
    user?: {
      name?: string;
      links?: {
        html?: string;
      };
    };
  }>;
}

function buildSearchQueries(word: string, definition?: string): string[] {
  const queries: string[] = [];
  if (definition) {
    if (definition.includes('n. ') && !definition.includes('v. ')) {
      queries.push(`${word} photo`, `${word}`);
    } else if (definition.includes('v. ')) {
      queries.push(`${word} action photo`, `${word} photo`, `${word}`);
    } else if (definition.includes('adj. ')) {
      queries.push(`${word} feeling`, `${word} emotion`, `${word} photo`, `${word}`);
    } else {
      queries.push(`${word} photo`, `${word}`);
    }
  } else {
    queries.push(`${word} photo`, `${word}`);
  }
  return queries;
}

async function downloadImageToLocal(imageUrl: string, word: string): Promise<string> {
  const sanitizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const extension = imageUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const filename = `${sanitizedWord}_${Date.now()}.${extension}`;
  const filepath = path.join(LEARNING_IMAGES_DIR, filename);

  const imageData = await fetch(imageUrl);
  if (!imageData.ok) {
    throw new Error(`Failed to download image: ${imageData.statusText}`);
  }

  const buffer = Buffer.from(await imageData.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return `/learning-images/${filename}`;
}

fastify.post<{ Body: SearchImageRequest }>('/api/search-image', async (request, reply) => {
  const { word, definition } = request.body;

  if (!word || typeof word !== 'string') {
    return reply.code(400).send({
      success: false,
      error: 'Word is required',
    });
  }

  try {
    const searchQueries = buildSearchQueries(word, definition);
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

    let remoteImageUrl: string | null = null;
    const source: 'unsplash' = 'unsplash';
    let successQuery = '';
    let photographerName: string | undefined;
    let photographerUrl: string | undefined;
    if (!unsplashKey || unsplashKey === 'your_unsplash_access_key_here') {
      throw new Error('Unsplash API key not configured');
    }

    for (const searchQuery of searchQueries) {
      fastify.log.info({ word, searchQuery }, 'Searching Unsplash');

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=squarish`,
        {
          headers: {
            Authorization: `Client-ID ${unsplashKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      const data = (await response.json()) as UnsplashSearchResponse;
      if (data.results && data.results.length > 0) {
        const photo = data.results[0];
        if (!photo.urls?.regular) {
          continue;
        }
        remoteImageUrl = photo.urls.regular;
        successQuery = searchQuery;
        photographerName = photo.user?.name;
        photographerUrl = photo.user?.links?.html;
        fastify.log.info({ word, searchQuery, resultsCount: data.results.length }, 'Found image from Unsplash');
        break;
      } else {
        fastify.log.info({ word, searchQuery }, 'No results on Unsplash, trying next query');
      }
    }

    if (!remoteImageUrl) {
      throw new Error('No images found from Unsplash');
    }

    const localPath = await downloadImageToLocal(remoteImageUrl, word);
    fastify.log.info({ word, localPath, source, successQuery }, 'Saved search image locally');

    return {
      success: true,
      data: {
        word,
        imageUrl: localPath,
        source,
        searchQuery: successQuery,
        photographer: photographerName,
        photographerUrl,
      },
    };
  } catch (error: any) {
    fastify.log.error({ 
      error: error.message, 
      stack: error.stack,
      word,
      searchQuery: `${word} photo`
    }, 'Image search error');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to search image',
    });
  }
});

interface SavePastedImageRequest {
  word: string;
  imageData: string; // data URL, e.g. data:image/png;base64,...
}

fastify.post<{ Body: SavePastedImageRequest }>('/api/save-pasted-image', async (request, reply) => {
  const { word, imageData } = request.body;

  if (!word || typeof word !== 'string') {
    return reply.code(400).send({ success: false, error: 'Word is required' });
  }
  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    return reply.code(400).send({ success: false, error: 'Invalid image data. Expected data:image/* base64.' });
  }

  try {
    const match = imageData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return reply.code(400).send({ success: false, error: 'Malformed image data URL.' });
    }

    const extRaw = match[1].toLowerCase();
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const base64 = match[2];
    const allowed = new Set(['png', 'jpg', 'webp', 'gif']);
    if (!allowed.has(ext)) {
      return reply.code(400).send({ success: false, error: `Unsupported image format: ${ext}` });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return reply.code(400).send({ success: false, error: 'Empty image data.' });
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return reply.code(400).send({ success: false, error: 'Image too large. Max 10MB.' });
    }

    const sanitizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${sanitizedWord}_${Date.now()}.${ext}`;
    const filepath = path.join(LEARNING_IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const localPath = `/learning-images/${filename}`;
    fastify.log.info({ word, localPath, size: buffer.length }, 'Saved pasted image locally');
    return {
      success: true,
      data: {
        word,
        imageUrl: localPath,
        source: 'clipboard',
      },
    };
  } catch (error: any) {
    fastify.log.error({ error: error.message, stack: error.stack, word }, 'Save pasted image error');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to save pasted image',
    });
  }
});

interface SaveUserBackupRequest {
  jsonData: string;
}

fastify.post<{ Body: SaveUserBackupRequest }>('/api/user-backup/save', async (request, reply) => {
  const { jsonData } = request.body;
  if (!jsonData || typeof jsonData !== 'string') {
    return reply.code(400).send({ success: false, error: 'jsonData is required' });
  }

  try {
    // validate json before saving
    JSON.parse(jsonData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(LEARNING_BACKUPS_DIR, `userdata-${timestamp}.json`);
    const latestPath = path.join(LEARNING_BACKUPS_DIR, 'userdata-latest.json');
    fs.writeFileSync(snapshotPath, jsonData, 'utf-8');
    fs.writeFileSync(latestPath, jsonData, 'utf-8');

    return {
      success: true,
      data: {
        savedAt: new Date().toISOString(),
        snapshotPath,
        latestPath,
      },
    };
  } catch (error: any) {
    fastify.log.error({ error: error.message }, 'Failed to save user backup');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to save user backup',
    });
  }
});

fastify.get('/api/user-backup/load', async (request, reply) => {
  try {
    const latestPath = path.join(LEARNING_BACKUPS_DIR, 'userdata-latest.json');
    if (!fs.existsSync(latestPath)) {
      return reply.code(404).send({
        success: false,
        error: `No backup found in ${LEARNING_BACKUPS_DIR}`,
      });
    }
    const jsonData = fs.readFileSync(latestPath, 'utf-8');
    return {
      success: true,
      data: {
        jsonData,
        path: latestPath,
      },
    };
  } catch (error: any) {
    fastify.log.error({ error: error.message }, 'Failed to load user backup');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to load user backup',
    });
  }
});

fastify.get('/api/user-backup/status', async () => {
  const latestPath = path.join(LEARNING_BACKUPS_DIR, 'userdata-latest.json');
  return {
    success: true,
    data: {
      dataDir: LEARNING_DATA_DIR,
      imagesDir: LEARNING_IMAGES_DIR,
      backupsDir: LEARNING_BACKUPS_DIR,
      hasLatestBackup: fs.existsSync(latestPath),
    },
  };
});

// AI 生成 Emoji 图片 API
interface GenerateEmojiRequest {
  word: string;
  definition: string;
  sentenceContext?: string;
}

fastify.post<{ Body: GenerateEmojiRequest }>('/api/generate-emoji', async (request, reply) => {
  const { word, definition, sentenceContext } = request.body;

  if (!word || typeof word !== 'string') {
    return reply.code(400).send({
      success: false,
      error: 'Word is required',
    });
  }

  try {
    // Step 1: 生成 visual hint
    const hintPrompt = `For the English word "${word}" (definition: ${definition})${sentenceContext ? ` used in context: "${sentenceContext}"` : ''}, generate a SHORT visual description (max 10 words) that could be used to create a simple emoji/icon representing this word's meaning. Focus on ONE clear, recognizable visual element.

Examples:
- "book" → "open book with visible pages"
- "run" → "person running with motion lines"
- "happy" → "smiling face with bright eyes"

Return ONLY the visual description, no explanation.`;

    const hintCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: hintPrompt }],
      temperature: 0.5,
      max_tokens: 30,
    });

    const visualHint = hintCompletion.choices[0]?.message?.content?.trim();
    if (!visualHint) {
      throw new Error('Failed to generate visual hint');
    }

    fastify.log.info({ word, visualHint }, 'Generated visual hint');

    // Step 2: 生成图片（带回退机制）
    const imagePrompt = `A simple, clean emoji-style icon: ${visualHint}. Minimalist design, solid colors, white background, centered, no text.`;
    
    let imageUrl: string | undefined;
    let modelUsed: string;
    let imageResponse: any;

    // 尝试模型列表（从最便宜到较贵）
    const modelsToTry = [
      { model: 'gpt-image-1-mini', quality: 'low' },
      { model: 'gpt-image-1', quality: 'low' },
      { model: 'dall-e-2', quality: undefined }, // dall-e-2 不支持 quality
    ];

    for (const config of modelsToTry) {
      try {
        fastify.log.info({ model: config.model, quality: config.quality }, 'Trying image generation');
        
        const params: any = {
          model: config.model,
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'url',
        };
        
        if (config.quality) {
          params.quality = config.quality;
        }
        
        imageResponse = await openai.images.generate(params);

        if (imageResponse.data && imageResponse.data.length > 0) {
          imageUrl = imageResponse.data[0]?.url;
          if (imageUrl) {
            modelUsed = config.model;
            fastify.log.info({ word, imageUrl, model: modelUsed }, 'Successfully generated image');
            break;
          }
        }
      } catch (modelError: any) {
        fastify.log.warn({ 
          model: config.model, 
          error: modelError.message,
          code: modelError.code 
        }, 'Model failed, trying next');
        continue;
      }
    }

    if (!imageUrl) {
      throw new Error('All image generation models failed');
    }

    // Step 3: 下载图片到本地
    const sanitizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${sanitizedWord}_${Date.now()}.png`;
    const filepath = path.join(LEARNING_IMAGES_DIR, filename);

    // 下载图片
    fastify.log.info({ imageUrl, filepath }, 'Downloading image');
    const imageData = await fetch(imageUrl);
    if (!imageData.ok) {
      throw new Error(`Failed to download image: ${imageData.statusText}`);
    }
    
    const buffer = Buffer.from(await imageData.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    
    const localPath = `/learning-images/${filename}`;
    fastify.log.info({ word, localPath, model: modelUsed! }, 'Saved emoji image locally');

    return {
      success: true,
      data: {
        word,
        visualHint,
        imageUrl: localPath, // 返回本地路径
        originalUrl: imageUrl, // 保留原始 URL 用于调试
        model: modelUsed!, // 返回实际使用的模型
      },
      usage: {
        hint: hintCompletion.usage,
        image: imageResponse,
      },
    };
  } catch (error: any) {
    fastify.log.error({ error, stack: error.stack }, 'Emoji generation error');
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to generate emoji',
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
