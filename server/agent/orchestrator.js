const { searchWeb } = require('../tools/search');
const { scrapeUrl } = require('../tools/scraper');
const { extractInsights, assessComplexity, checkAmbiguity, checkRelevance } = require('../tools/llm');

// and replace assessTopicComplexity function with:
async function assessTopicComplexity(topic) {
  return await assessComplexity(topic);
}

async function runResearchAgent(topic, onStep) {
  const results = [];

  // ── STEP 0: AMBIGUITY CHECK ──────────────────────────────────
  const ambiguityCheck = await checkAmbiguity(topic);
  if (ambiguityCheck.ambiguous) {
    onStep({ type: 'clarification', message: ambiguityCheck.question });
    return { clarification: ambiguityCheck.question };
  }

  // ── STEP 1: ASSESS COMPLEXITY ─── (rest stays the same)
  onStep({ type: 'search', message: `Assessing topic complexity...` });
  const sourceCount = await assessTopicComplexity(topic);
  onStep({ type: 'search_done', message: `Topic complexity assessed — reading ${sourceCount} sources` });
  // agent is now making a decision, not following a fixed script

  // ── STEP 2: SEARCH ───────────────────────────────────────────
  onStep({ type: 'search', message: `Searching for: ${topic}` });
  const searchResults = await searchWeb(topic, sourceCount);
  onStep({ type: 'search_done', message: `Found ${searchResults.length} sources` });

  // ── STEP 3: SCRAPE + REASON (per source) ────────────────────
  let relevantCount = 0;
  // tracks how many sources passed the relevance check

  for (const result of searchResults.slice(0, sourceCount)) {
    try {
      onStep({ type: 'scrape', message: `Reading: ${result.title}`, url: result.url });
      const content = await scrapeUrl(result.url);

      // check if scraped content is actually relevant before extracting insights
      const relevanceCheck = await checkRelevance(content, topic);
      if (!relevanceCheck.relevant) {
        onStep({ type: 'error', message: `Skipped: ${result.title} — not relevant to topic` });
        continue;
        // skip this source, move to next one
      }

      relevantCount++;
      onStep({ type: 'reason', message: `Extracting insights from: ${result.title}` });
      const insights = await extractInsights(content, topic);

      results.push({
        source: result.title,
        url: result.url,
        insights
      });

      onStep({ type: 'reason_done', message: `Got insights from: ${result.title}` });

    } catch (err) {
      onStep({ type: 'error', message: `Skipped: ${result.title} — ${err.message}` });
    }
  }

  // ── STEP 3.5: RE-SEARCH IF TOO FEW RELEVANT SOURCES ─────────
  if (relevantCount < 2) {
    // if fewer than 2 sources passed relevance check, results will be poor
    // rephrase the query and try again once
    onStep({ type: 'search', message: `Too few relevant sources found — retrying with refined query...` });
    
    const refinedQuery = `${topic} explained comprehensive guide`;
    // simple rephrasing — adds context words to get better search results
    
    const retryResults = await searchWeb(refinedQuery, sourceCount);
    onStep({ type: 'search_done', message: `Found ${retryResults.length} new sources` });

    for (const result of retryResults.slice(0, sourceCount)) {
      try {
        onStep({ type: 'scrape', message: `Reading: ${result.title}` });
        const content = await scrapeUrl(result.url);

        const relevanceCheck = await checkRelevance(content, topic);
        if (!relevanceCheck.relevant) {
          onStep({ type: 'error', message: `Skipped: ${result.title} — not relevant` });
          continue;
        }

        onStep({ type: 'reason', message: `Extracting insights from: ${result.title}` });
        const insights = await extractInsights(content, topic);

        results.push({
          source: result.title,
          url: result.url,
          insights
        });

        onStep({ type: 'reason_done', message: `Got insights from: ${result.title}` });

      } catch (err) {
        onStep({ type: 'error', message: `Skipped: ${result.title} — ${err.message}` });
      }
    }
  }

  // ── STEP 4: SYNTHESIZE ───────────────────────────────────────
  onStep({ type: 'synthesize', message: 'Writing final report...' });
  const finalReport = await synthesizeReport(topic, results);
  onStep({ type: 'done', message: 'Research complete' });

  return { topic, sources: results, report: finalReport };
}

async function synthesizeReport(topic, results) {
  const { extractInsights } = require('../tools/llm');

  // build numbered source list so LLM can cite by number
  const sourcesReference = results
    .map((r, i) => `[${i + 1}] ${r.source}`)
    .join('\n');
  // produces: "[1] GeeksforGeeks\n[2] Cisco\n[3] IBM"

  const allInsights = results
    .map((r, i) => `Source [${i + 1}] - ${r.source}:\n${r.insights}`)
    .join('\n\n');
  // labels each source's insights with its number
  // so the LLM knows insight X came from source [2]

  const prompt = `Based on research from multiple sources, write a comprehensive 
research report about "${topic}". Include key findings, important context, 
and actionable insights. Structure it with clear sections.

After each key claim or fact, add a citation like [1] or [2] referring to the source number below.

Sources:
${sourcesReference}`;

  const rawReport = await extractInsights(allInsights, prompt, 'llama-3.3-70b-versatile');

  // post-process: replace [1] with [[1]](url) so ReactMarkdown renders it as a clickable link
  let report = rawReport;
  results.forEach((r, i) => {
    const citationNumber = i + 1;
    const markdownLink = `[[${citationNumber}]](${r.url})`;
    // [[1]](https://...) = markdown link syntax, text is [1], href is the url
    report = report.replaceAll(`[${citationNumber}]`, markdownLink);
    // replaceAll handles multiple occurrences of [1] throughout the report
  });

  return report;
}

module.exports = { runResearchAgent };