/**
 * Node.js script to create a root API key
 * Run with: node scripts/create-api-key.js
 */

const https = require('https');
const http = require('http');

async function createRootApiKey() {
  // Load environment variables from .env.local if available
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // dotenv not available, continue
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error('❌ ADMIN_SECRET environment variable is required');
    console.error('Please add it to your .env.local file:');
    console.error('ADMIN_SECRET=your_super_secret_admin_key_here');
    process.exit(1);
  }

  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const apiKeyName = process.argv[3] || `Root API Key ${new Date().toISOString().slice(0, 19)}`;
  const role = process.argv[4] || 'root'; // Default to root role

  console.log('🔑 Creating Root API Key for Weather App');
  console.log('========================================');
  console.log(`📡 API endpoint: ${baseUrl}`);
  console.log(`🏷️  API key name: ${apiKeyName}`);
  console.log(`👤 Role: ${role}`);
  console.log('');

  const postData = JSON.stringify({
    name: apiKeyName,
    role: role,
    expiresInDays: 365
  });

  const url = new URL(`${baseUrl}/api/admin/api-keys`);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 3000),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': adminSecret,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.success) {
            console.log('✅ API Key created successfully!');
            console.log('');
            console.log('📋 API Key Details:');
            console.log(`   ID: ${response.apiKey.id}`);
            console.log(`   Key: ${response.apiKey.key}`);
            console.log(`   Expires: ${response.apiKey.expires_at}`);
            console.log('');
            console.log('🔐 IMPORTANT: Store this API key securely - it will not be shown again!');
            console.log('');
            console.log('📝 Save to .env.local:');
            console.log(`   WEATHER_API_KEY=${response.apiKey.key}`);
            console.log('');
            console.log('🧪 Test the geocoding API:');
            console.log(`   curl -H "Authorization: Bearer ${response.apiKey.key}" \\`);
            console.log(`     "${baseUrl}/api/geocoding?latitude=40.4637&longitude=-3.7492"`);
            console.log('');
            console.log('🌍 Test country search:');
            console.log(`   curl -H "Authorization: Bearer ${response.apiKey.key}" \\`);
            console.log(`     "${baseUrl}/api/geocoding?search=Spain"`);

            // Save to file
            require('fs').writeFileSync('.api-key.txt', response.apiKey.key);
            console.log('');
            console.log('💾 API key also saved to .api-key.txt (add to .gitignore)');
            
            resolve(response.apiKey);
          } else {
            console.error('❌ Failed to create API key');
            console.error('Response:', JSON.stringify(response, null, 2));
            
            if (data.includes('Unauthorized')) {
              console.error('');
              console.error('💡 Make sure ADMIN_SECRET is set correctly in your .env.local');
            }
            
            reject(new Error('Failed to create API key'));
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('');
        console.error('💡 Make sure your Next.js development server is running:');
        console.error('   pnpm dev');
      }
      
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the script
if (require.main === module) {
  createRootApiKey()
    .then(() => {
      console.log('');
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createRootApiKey };
