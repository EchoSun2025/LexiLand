import emojilib from 'emojilib';

// 构建索引
const keywordToEmoji = new Map<string, string>();
const emojiData = emojilib as Record<string, string[]>;

for (const [emoji, keywords] of Object.entries(emojiData)) {
  if (Array.isArray(keywords)) {
    keywords.forEach(keyword => {
      const key = keyword.toLowerCase().trim();
      if (key && !keywordToEmoji.has(key)) {
        keywordToEmoji.set(key, emoji);
      }
    });
  }
}

console.log(`Total keywords: ${keywordToEmoji.size}`);
console.log(`Total emojis: ${Object.keys(emojiData).length}`);
console.log('\n=== Testing Common Words ===');

// 测试单词
const testWords = [
  'cat', 'dog', 'sun', 'moon', 'star',
  'happy', 'sad', 'love', 'book', 'computer',
  'elephant', 'umbrella', 'rocket', 'pizza',
  'running', 'walked', 'beautiful', 'quickly',
  'government', 'landmark', 'keyboard'
];

testWords.forEach(word => {
  const emoji = keywordToEmoji.get(word.toLowerCase());
  console.log(`${word.padEnd(15)} → ${emoji || '❌ not found'}`);
});

console.log('\n=== Sample Keywords for 🐱 ===');
const catKeywords = emojiData['🐱'];
console.log(catKeywords);

console.log('\n=== Sample Keywords for 🚗 ===');
const carKeywords = emojiData['🚗'];
console.log(carKeywords);
