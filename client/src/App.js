import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import './App.css';
import History from './History';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Research />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

function Research() {
  const [topic, setTopic] = useState('');
  const [steps, setSteps] = useState([]);
  const [report, setReport] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clarification, setClarification] = useState(null);
  const [clarificationInput, setClarificationInput] = useState('');

  const startResearchWithTopic = (topicToSearch) => {
    if (!topicToSearch.trim()) return;
    setSteps([]);
    setReport(null);
    setSources([]);
    setClarification(null);
    setLoading(true);

    const eventSource = new EventSource(
      `https://research-agent-backend-wyuo.onrender.com/api/research/stream?topic=${encodeURIComponent(topicToSearch)}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'step') {
        setSteps(prev => [...prev, data.payload]);
      }

      if (data.type === 'clarification') {
        // agent detected ambiguous topic — pause and ask user
        setClarification(data.payload.message);
        setLoading(false);
        eventSource.close();
      }

      if (data.type === 'complete') {
        setReport(data.payload.report);
        setSources(data.payload.sources);
        setLoading(false);
        eventSource.close();
      }

      if (data.type === 'error') {
        console.error(data.payload.message);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setLoading(false);
      eventSource.close();
    };
  };

  const startResearch = () => startResearchWithTopic(topic);
  // button and Enter key call this — uses the input value

  const submitClarification = () => {
    const refinedTopic = `${topic} — ${clarificationInput}`;
    // combines "SDN" + "Software-Defined Networking" into one clear query
    setClarification(null);
    setClarificationInput('');
    setTopic(refinedTopic);
    startResearchWithTopic(refinedTopic);
  };

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/">Research</Link>
        <Link to="/history">History</Link>
      </nav>

      <h1>Research Agent</h1>
      <p className="subtitle">Powered by Llama 3 + Groq</p>

      <div className="search-box">
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && startResearch()}
          placeholder="Enter a research topic..."
          disabled={loading}
        />
        <button onClick={startResearch} disabled={loading}>
          {loading ? 'Researching...' : 'Research'}
        </button>
      </div>

      {clarification && (
        // shown when agent detects ambiguous query
        <div className="clarification">
          <p>{clarification}</p>
          <input
            type="text"
            value={clarificationInput}
            onChange={e => setClarificationInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitClarification()}
            placeholder="Type your answer..."
          />
          <button onClick={submitClarification}>Continue</button>
        </div>
      )}

      {steps.length > 0 && (
        <div className="steps">
          <h2>Agent Activity</h2>
          {steps.map((step, i) => (
            <div key={i} className={`step step-${step.type}`}>
              <span className="step-icon">{getStepIcon(step.type)}</span>
              <span>{step.message}</span>
            </div>
          ))}
        </div>
      )}

      {report && (
        <div className="report">
          <h2>Research Report</h2>
          <div className="report-content">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(report);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied!' : 'Copy Report'}
          </button>

          <button
            onClick={() => {
              setReport(null);
              setSources([]);
              setSteps([]);
              // clear everything — fresh slate
              startResearchWithTopic(topic);
              // re-run with the same topic — agent will search again from scratch
            }}
          >
            Re-search
          </button>
          <h3>Sources</h3>
          <ul className="sources">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.source}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getStepIcon(type) {
  const icons = {
    search: '🔍',
    search_done: '✅',
    scrape: '📄',
    reason: '🧠',
    reason_done: '✅',
    synthesize: '✍️',
    done: '🎉',
    error: '❌',
    clarification: '❓'
  };
  return icons[type] || '•';
}

export default App;