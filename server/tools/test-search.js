const { searchWeb } = require('./search');
// search.js loads dotenv itself, so we don't need to do it here

async function test() {
  const results = await searchWeb('quantum computing explained');
  console.log(JSON.stringify(results, null, 2));
  // JSON.stringify with null, 2 = pretty prints the JSON with 2-space indentation
  // makes it readable instead of one giant line
}

test();