const https = require('https');

// List of possible deployment URLs to check
const possibleUrls = [
  'https://scoresheets-cryborg.vercel.app',
  'https://scoresheets-git-main-cryborg.vercel.app', 
  'https://scoresheets.vercel.app',
  'https://scoresheets-nine.vercel.app',
  'https://scoresheets-eta.vercel.app'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(`${url}/api/games`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({ url, status: 'SUCCESS', data: json });
          } catch {
            resolve({ url, status: 'INVALID_JSON', statusCode: res.statusCode });
          }
        } else {
          resolve({ url, status: 'ERROR', statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ url, status: 'NETWORK_ERROR', error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT' });
    });
  });
}

async function main() {
  console.log('🔍 Checking possible deployment URLs...\n');
  
  for (const url of possibleUrls) {
    const result = await checkUrl(url);
    console.log(`${result.status === 'SUCCESS' ? '✅' : '❌'} ${url}`);
    console.log(`   Status: ${result.status}`);
    if (result.statusCode) console.log(`   HTTP: ${result.statusCode}`);
    if (result.data?.games) console.log(`   Games: ${result.data.games.length} found`);
    if (result.error) console.log(`   Error: ${result.error}`);
    console.log();
  }
}

main().catch(console.error);