const { runResearchAgent } = require('./orchestrator');

async function test() {
  const report = await runResearchAgent('quantum computing', (step) => {
    // this is our onStep callback — just printing each step for now
    // later this becomes a Server-Sent Event that streams to the React frontend
    console.log(`[${step.type}] ${step.message}`);
  });

  console.log('\n====== FINAL REPORT ======\n');
  console.log(report.report);
  console.log('\n====== SOURCES USED ======\n');
  report.sources.forEach(s => console.log(`- ${s.source}: ${s.url}`));
}

test();