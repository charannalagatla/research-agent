require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

async function searchWeb(query, num = 5) {
  // num defaults to 5 if not passed — backwards compatible
  // when orchestrator passes sourceCount, Serper fetches that many results
  const response = await axios.post(
    'https://google.serper.dev/search',
    { q: query, num },
    // num replaces the hardcoded 5 — now controlled by the agent
    {
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const results = response.data.organic.map(result => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet
  }));

  return results;
}

module.exports = { searchWeb };