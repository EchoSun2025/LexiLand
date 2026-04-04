import type { WordAnnotation } from '../api';

// 本地词典条目接口
export interface LocalDictEntry {
  word: string;
  ipa: string;
  pos: string;  // part of speech
  level: string;
  chinese: string;
  definition: string;
  examples?: string[];
}

// 核心 5000 词词典（精简版，实际项目中应该从文件加载）
// 这里只展示数据结构，实际数据应该从 public/dictionaries/core-5000.json 加载
// const coreDictionary = new Map<string, LocalDictEntry>();

class LocalDictionaryService {
  private isLoaded = false;
  private dictionary = new Map<string, LocalDictEntry>();
  private wordForms = new Map<string, string>();  // 词形映射: {变形词: 原型词}

  /**
   * 初始化本地词典
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // 从 public 文件夹加载核心词典
      // 尝试多个词典文件（从大到小）
      const dictionaries = [
        '/dictionaries/core-30000.json',  // 基于 BNC 的 30000 词
        '/dictionaries/core-10000.json',
        '/dictionaries/core-5000.json', 
        '/dictionaries/core-1000.json',
      ];
      
      let loaded = false;
      for (const dictPath of dictionaries) {
        try {
          const response = await fetch(dictPath);
          if (!response.ok) continue;
          
          const data: Record<string, LocalDictEntry> = await response.json();
          
          // 转换为 Map 以提高查询性能
          Object.entries(data).forEach(([word, entry]) => {
            this.dictionary.set(word.toLowerCase(), entry);
          });

          this.isLoaded = true;
          console.log(`[LocalDict] Loaded ${this.dictionary.size} words from ${dictPath}`);
          loaded = true;
          break;
        } catch (err) {
          continue;
        }
      }
      
      if (!loaded) {
        console.warn('[LocalDict] No dictionary file found, will fallback to AI');
      }
      
      // 尝试加载词形映射
      if (loaded) {
        try {
          const formsResponse = await fetch('/dictionaries/word-forms.json');
          if (formsResponse.ok) {
            const forms: Record<string, string> = await formsResponse.json();
            Object.entries(forms).forEach(([form, base]) => {
              this.wordForms.set(form.toLowerCase(), base.toLowerCase());
            });
            console.log(`[LocalDict] Loaded ${this.wordForms.size} word forms`);
          }
        } catch (err) {
          console.log('[LocalDict] No word forms file, using rules only');
        }
      }
    } catch (error) {
      console.error('Failed to load local dictionary:', error);
    }
  }

  /**
   * 查询单词
   */
  async lookup(word: string): Promise<WordAnnotation | null> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    const lowerWord = word.toLowerCase();
    
    // 1. 直接查询原词
    let entry = this.dictionary.get(lowerWord);
    
    // 2. 如果找不到，尝试词形还原
    if (!entry) {
      const baseForm = this.findBaseForm(lowerWord);
      if (baseForm) {
        entry = this.dictionary.get(baseForm);
      }
    }
    
    if (!entry) {
      return null;
    }

    // 转换为 WordAnnotation 格式
    // word 使用原词，baseForm 使用找到的词典中的词
    const wordForms = this.getWordForms(entry.word);
    
    return {
      word: lowerWord,
      baseForm: entry.word,  // 实际找到的原型词
      ipa: entry.ipa || '',
      chinese: entry.chinese || '',
      definition: entry.definition || '',
      example: entry.examples?.[0] || '',
      level: entry.level || 'B2',
      partOfSpeech: entry.pos || 'unknown',
      wordForms: wordForms.length > 0 ? wordForms : undefined,  // 词形变化
    };
  }

  /**
   * 词形还原：尝试将变形词还原为原型
   */
  private findBaseForm(word: string): string | null {
    // 1. 先查映射表（最准确，来自 ECDICT exchange 字段）
    const mapped = this.wordForms.get(word);
    if (mapped && this.dictionary.has(mapped)) {
      console.log(`[LocalDict] Found in forms map: "${word}" → "${mapped}"`);
      return mapped;
    }
    
    // 2. 回退到规则匹配
    const rules = [
      // 现在分词 -ing
      { pattern: /ing$/, replacements: ['', 'e'] },
      // 过去式/过去分词 -ed
      { pattern: /ed$/, replacements: ['', 'e'] },
      // 复数 -s/-es
      { pattern: /s$/, replacements: [''] },
      { pattern: /es$/, replacements: ['', 'e'] },
      { pattern: /ies$/, replacements: ['y'] },
      // 比较级/最高级
      { pattern: /er$/, replacements: ['', 'e'] },
      { pattern: /est$/, replacements: ['', 'e'] },
      // 双写辅音字母 + ing/ed (如 running → run, stopped → stop)
      { pattern: /([^aeiou])\1ing$/, replacements: ['$1'] },
      { pattern: /([^aeiou])\1ed$/, replacements: ['$1'] },
    ];

    for (const rule of rules) {
      for (const replacement of rule.replacements) {
        const candidate = word.replace(rule.pattern, replacement);
        if (candidate !== word && this.dictionary.has(candidate)) {
          console.log(`[LocalDict] Lemmatized by rule: "${word}" → "${candidate}"`);
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * 批量查询
   */
  async lookupBatch(words: string[]): Promise<Map<string, WordAnnotation>> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    const results = new Map<string, WordAnnotation>();
    
    for (const word of words) {
      const result = await this.lookup(word);
      if (result) {
        results.set(word.toLowerCase(), result);
      }
    }

    return results;
  }

  /**
   * 检查单词是否存在
   */
  has(word: string): boolean {
    return this.dictionary.has(word.toLowerCase());
  }

  /**
   * 获取词典大小
   */
  size(): number {
    return this.dictionary.size;
  }

  /**
   * 获取单词的所有词形变化
   * 返回从 word-forms.json 中找到的该单词的所有变形
   */
  getWordForms(baseWord: string): string[] {
    if (!this.isLoaded) {
      return [];
    }
    
    const forms: string[] = [];
    const baseLower = baseWord.toLowerCase();
    
    // 遍历词形映射，找到所有指向这个基础词的变形
    this.wordForms.forEach((base, form) => {
      if (base === baseLower && form !== baseLower) {
        forms.push(form);
      }
    });
    
    return forms;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalWords: this.dictionary.size,
      isLoaded: this.isLoaded,
    };
  }
}

// 导出单例
export const localDictionary = new LocalDictionaryService();
