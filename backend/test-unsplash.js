// 测试 Unsplash API 的独立脚本
// 运行: node test-unsplash.js

import 'dotenv/config';

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const testWord = 'apple';

console.log('🔍 Testing Unsplash API...\n');
console.log('API Key:', UNSPLASH_KEY ? `${UNSPLASH_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('Test word:', testWord);
console.log('');

async function testUnsplash() {
  if (!UNSPLASH_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY not found in .env file');
    return;
  }

  const searchQuery = `${testWord} photo`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=squarish`;
  
  console.log('📡 Making request to Unsplash...');
  console.log('URL:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_KEY}`
      }
    });

    console.log('📊 Response status:', response.status, response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Unsplash API Error:');
      console.error(errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Success!');
    console.log('Total results:', data.total);
    console.log('Results returned:', data.results.length);
    
    if (data.results.length > 0) {
      const photo = data.results[0];
      console.log('');
      console.log('📷 First photo:');
      console.log('  - URL:', photo.urls.regular);
      console.log('  - Photographer:', photo.user.name);
      console.log('  - Description:', photo.description || photo.alt_description || 'N/A');
    } else {
      console.log('⚠️  No results found for:', searchQuery);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUnsplash();
