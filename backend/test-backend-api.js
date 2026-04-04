// 测试后端 API 端点并显示完整错误
// 运行: node test-backend-api.js

async function testBackendAPI() {
  const url = 'http://localhost:3000/api/search-image';
  const body = {
    word: 'apple',
    definition: 'n. fruit'
  };

  console.log('🧪 Testing backend API endpoint...\n');
  console.log('URL:', url);
  console.log('Body:', JSON.stringify(body, null, 2));
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('');

    const text = await response.text();
    console.log('📄 Response Body:');
    console.log(text);
    console.log('');

    if (response.ok) {
      console.log('✅ Success!');
      const data = JSON.parse(text);
      console.log('Image URL:', data.data?.imageUrl);
    } else {
      console.log('❌ Error Response');
      try {
        const errorData = JSON.parse(text);
        console.log('Error Details:');
        console.log(JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log('Could not parse error as JSON');
      }
    }

  } catch (error) {
    console.error('❌ Request Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBackendAPI();
