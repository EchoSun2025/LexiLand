import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 4321);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function json(reply, statusCode, payload) {
  reply.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  reply.end(JSON.stringify(payload));
}

function getStaticPath(requestUrl) {
  const pathname = new URL(requestUrl, `http://localhost:${PORT}`).pathname;
  const safePath = pathname === '/' ? '/index.html' : pathname;
  return path.join(__dirname, safePath);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Body too large'));
      }
    });

    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function extractJsonFromText(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error('No JSON object returned by Ollama');
    }
    return JSON.parse(objectMatch[0]);
  }
}

function buildFallbackAnalysis(sentence, focusWords, reason) {
  return {
    source: reason ? `fallback:${reason}` : 'fallback',
    translation: '未连接到 Ollama，当前返回的是占位分析。',
    overallNote: '句子和目标词已保存，后续接入本地模型后可以重新分析。',
    words: focusWords.map((word) => ({
      word,
      meaning: `请结合上下文确认 ${word} 在本句中的义项。`,
      grammarNote: '回退模式未生成详细语法解释。',
      collocationNote: '',
    })),
    sentenceText: sentence,
  };
}

async function analyzeWithOllama(sentence, focusWords, model) {
  const prompt = `你是一个帮助中文学习者阅读英文的助手。请分析下面这个句子，只关注这些目标词在该句中的含义和语法作用。

句子：
${sentence}

目标词：
${focusWords.join(', ')}

请严格返回 JSON：
{
  "translation": "整句自然中文翻译",
  "overallNote": "一句简短说明，概括本句最关键的语义或语法信息",
  "words": [
    {
      "word": "目标词原样返回",
      "meaning": "该词在本句中的中文意思",
      "grammarNote": "该词在本句中的语法功能或变形说明",
      "collocationNote": "如果有固定搭配或语块就写，没有则留空字符串"
    }
  ]
}

要求：
- 只分析目标词，不要扩写成词典全文。
- 返回的 words 数组必须覆盖所有目标词。
- 不要输出 JSON 以外的任何内容。`;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      format: 'json',
      stream: false,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.message?.content;
  if (!content) {
    throw new Error('Ollama returned no content');
  }

  const parsed = extractJsonFromText(content);
  return {
    source: `ollama:${model || OLLAMA_MODEL}`,
    translation: parsed.translation || '',
    overallNote: parsed.overallNote || '',
    words: Array.isArray(parsed.words) ? parsed.words : [],
    sentenceText: sentence,
  };
}

createServer(async (request, reply) => {
  try {
    const method = request.method || 'GET';
    const pathname = new URL(request.url || '/', `http://localhost:${PORT}`).pathname;

    if (method === 'GET' && pathname === '/api/health') {
      return json(reply, 200, {
        success: true,
        data: {
          port: PORT,
          ollamaBaseUrl: OLLAMA_BASE_URL,
          defaultModel: OLLAMA_MODEL,
        },
      });
    }

    if (method === 'POST' && pathname === '/api/analyze-sentence') {
      const body = await readJsonBody(request);
      const sentence = typeof body.sentence === 'string' ? body.sentence.trim() : '';
      const focusWords = Array.isArray(body.focusWords)
        ? body.focusWords.filter((item) => typeof item === 'string' && item.trim())
        : [];
      const model = typeof body.model === 'string' ? body.model.trim() : OLLAMA_MODEL;

      if (!sentence || focusWords.length === 0) {
        return json(reply, 400, {
          success: false,
          error: 'sentence and focusWords are required',
        });
      }

      try {
        const data = await analyzeWithOllama(sentence, focusWords, model);
        return json(reply, 200, {
          success: true,
          data,
        });
      } catch (error) {
        return json(reply, 200, {
          success: true,
          data: buildFallbackAnalysis(sentence, focusWords, error.message),
        });
      }
    }

    if (method !== 'GET') {
      return json(reply, 404, {
        success: false,
        error: 'Not found',
      });
    }

    const filePath = getStaticPath(request.url || '/');
    if (!filePath.startsWith(__dirname) || !existsSync(filePath)) {
      return json(reply, 404, {
        success: false,
        error: 'Static file not found',
      });
    }

    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || 'application/octet-stream';

    reply.writeHead(200, {
      'Content-Type': type,
    });

    createReadStream(filePath).pipe(reply);
  } catch (error) {
    json(reply, 500, {
      success: false,
      error: error.message,
    });
  }
}).listen(PORT, () => {
  console.log(`DesktopWord prototype running at http://localhost:${PORT}`);
});
