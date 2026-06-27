const { extractInsights } = require('./llm');

const sampleContent = `Quantum computing is an emergent field that harnesses quantum 
mechanics to solve problems beyond classical computers. Quantum computers use qubits 
instead of bits. Unlike bits which are 0 or 1, qubits can exist in superposition — 
both 0 and 1 simultaneously. This allows quantum computers to process many possibilities 
at once. IBM, Google, and Microsoft are investing heavily. The market is estimated to 
reach USD 1.3 trillion by 2035.`;

async function test() {
  console.log('--- Testing llama-3.1-8b-instant ---');
  const result1 = await extractInsights(sampleContent, 'quantum computing', 'llama-3.1-8b-instant');
  console.log(result1);

  console.log('\n--- Testing llama-3.3-70b-versatile ---');
  const result2 = await extractInsights(sampleContent, 'quantum computing', 'llama-3.3-70b-versatile');
  console.log(result2);
}

test();