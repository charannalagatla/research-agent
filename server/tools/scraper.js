const axios = require('axios');
const cheerio = require('cheerio');
// cheerio is like jQuery for the server — it lets you parse HTML and extract text
// without it, you'd get raw HTML full of <div>, <span>, <script> tags — unusable

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function scrapeUrl(url) {
  // fetch the raw HTML of the page
  const response = await axios.get(url, {
    timeout: 8000,
    // 8 seconds max — some sites are slow, we don't want the agent hanging forever
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      // pretend to be a real browser — many sites block requests that don't have this
    }
  });

  // load the HTML into cheerio so we can traverse it like a DOM
  const $ = cheerio.load(response.data);

  // remove tags that are never useful content
  $('script, style, nav, footer, header, aside').remove();
  // ↑ scripts = code, style = CSS, nav/footer/header/aside = site chrome
  // keeping these would pollute the text the LLM reads

  // extract all paragraph text and join into one string
  const text = $('p')
    .map((i, el) => $(el).text().trim())
    .get()
    .filter(p => p.length > 50)
    // ↑ filter out tiny paragraphs like "Click here" or "Share this"
    .join('\n\n');

  // LLMs have token limits — we slice to ~3000 chars to stay safe
  // 3000 chars ≈ 700 tokens, leaves room for the prompt and response
  return text.slice(0, 3000);
}

module.exports = { scrapeUrl };