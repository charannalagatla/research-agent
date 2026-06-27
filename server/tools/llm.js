const Groq = require('groq-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function extractInsights(content, topic, model = 'llama-3.1-8b-instant') {
  const response = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a research assistant. Extract the most important insights 
        from the provided content about the given topic. Be concise and factual.
        Format your response as 3-5 bullet points.`
      },
      {
        role: 'user',
        content: `Topic: ${topic}\n\nContent:\n${content}`
      }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  return response.choices[0].message.content;
}

async function assessComplexity(topic) {
  // dedicated function for classification — no system prompt baggage from extractInsights
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: `Classify this research topic complexity. Reply with ONLY a single number: 3, 5, or 8.
3 = simple, single concept (photosynthesis, what is RAM)
5 = moderate complexity (impact of social media, climate change causes)
8 = complex, multi-domain (geopolitical impact of semiconductors, AI on global economy)

Topic: "${topic}"

Reply with only the number 3, 5, or 8.`
      }
    ],
    temperature: 0.1, // very low temperature — we want deterministic classification
    max_tokens: 5     // only needs to return one digit
  });

  const count = parseInt(response.choices[0].message.content.trim());
  return [3, 5, 8].includes(count) ? count : 5;
}

async function checkAmbiguity(topic) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: `Is this research topic ambiguous or too vague to search accurately?
Topic: "${topic}"

A topic is ambiguous if it's an acronym with multiple meanings, a single word with multiple unrelated domains, or too vague to know what the user wants.

Reply with ONLY valid JSON in this exact format:
{ "ambiguous": false }
OR
{ "ambiguous": true, "question": "Did you mean X or Y?" }

Examples:
"SDN" → { "ambiguous": true, "question": "Did you mean Software-Defined Networking or Student Doctor Network?" }
"photosynthesis" → { "ambiguous": false }
"ML" → { "ambiguous": true, "question": "Did you mean Machine Learning or Maximum Likelihood?" }
"impact of AI on jobs" → { "ambiguous": false }

Reply with JSON only. No explanation.`
      }
    ],
    temperature: 0.1,
    max_tokens: 100
  });

  try {
    const raw = response.choices[0].message.content.trim();
    return JSON.parse(raw);
    // if LLM returns valid JSON, we get { ambiguous, question }
  } catch {
    return { ambiguous: false };
    // if parsing fails, assume not ambiguous and proceed normally
    // never block the user because of a JSON parse failure
  }
}

async function checkRelevance(content, topic) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: `Is the following content relevant to the research topic "${topic}"?
Reply with ONLY valid JSON: { "relevant": true } or { "relevant": false }

Content:
${content.slice(0, 500)}
// only send first 500 chars — enough to judge relevance, saves tokens

Reply with JSON only.`
      }
    ],
    temperature: 0.1,
    max_tokens: 20
  });

  try {
    const raw = response.choices[0].message.content.trim();
    return JSON.parse(raw);
  } catch {
    return { relevant: true };
    // if parsing fails, assume relevant — don't discard content unnecessarily
  }
}

module.exports = { extractInsights, assessComplexity, checkAmbiguity, checkRelevance };