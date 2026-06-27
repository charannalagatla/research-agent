const { scrapeUrl } = require('./scraper');

async function test() {
  const text = await scrapeUrl('https://www.ibm.com/think/topics/quantum-computing');
  console.log(text);
}

test();