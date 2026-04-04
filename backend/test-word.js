// 测试特定单词的 Unsplash 搜索
// 运行: node test-word.js giddy

import 'dotenv/config';

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const testWord = process.argv[2] || 'giddy';

console.log(`🔍 Testing word: "${testWord}"\n`);

async function searchWord() {
  const searchQuery = `${testWord} photo`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=squarish`;
  
  console.log('📡 Searching:', searchQuery);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_KEY}`
      }
    });

    const data = await response.json();
    
    console.log('📊 Results:');
    console.log('  Total found:', data.total);
    console.log('  Returned:', data.results.length);
    console.log('');

    if (data.results.length === 0) {
      console.log('❌ No photos found for:', testWord);
      console.log('');
      
      // 尝试其他搜索词
      console.log('🔄 Trying alternative searches...\n');
      
      const alternatives = [
        `${testWord}`,           // 不加 photo
        `${testWord} feeling`,   // 加 feeling（适合情感词）
        `${testWord} emotion`,   // 加 emotion
        `${testWord} people`,    // 加 people
        `${testWord} concept`,   // 加 concept（适合抽象词）
      ];
      
      for (const alt of alternatives) {
        const altUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(alt)}&per_page=1`;
        const altResponse = await fetch(altUrl, {
          headers: { 'Authorization': `Client-ID ${UNSPLASH_KEY}` }
        });
        const altData = await altResponse.json();
        
        console.log(`  "${alt}": ${altData.total} photos`);
        
        if (altData.total > 0 && altData.results[0]) {
          console.log(`    ✅ Found: ${altData.results[0].alt_description || 'No description'}`);
          console.log(`    URL: ${altData.results[0].urls.small}`);
        }
      }
    } else {
      console.log('✅ Photos found:\n');
      data.results.forEach((photo, i) => {
        console.log(`${i + 1}. ${photo.alt_description || 'No description'}`);
        console.log(`   By: ${photo.user.name}`);
        console.log(`   URL: ${photo.urls.small}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

searchWord();
