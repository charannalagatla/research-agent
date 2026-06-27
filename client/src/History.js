import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Link for the "back to research" nav — no page reload
import ReactMarkdown from 'react-markdown';

function History() {
  const [sessions, setSessions] = useState([]);
  // holds the list of past sessions fetched from MongoDB

  const [selected, setSelected] = useState(null);
  // holds the full session object when user clicks one
  // null = no session selected, show the list

  const [loading, setLoading] = useState(true);
  // true while fetching sessions, flips to false when done

  const [copied, setCopied] = useState(false);
  // tracks whether copy succeeded — drives the button label change

  useEffect(() => {
    // useEffect with empty [] runs once when component mounts
    // this is where you fetch data on page load
    fetch('http://localhost:5000/api/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        // data is the array of sessions from MongoDB
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch sessions:', err);
        setLoading(false);
      });
  }, []);
  // [] = no dependencies, run once on mount, never re-run

  const openSession = (id) => {
    // when user clicks a session, fetch the full document by id
    fetch(`http://localhost:5000/api/sessions/${id}`)
      .then(res => res.json())
      .then(data => setSelected(data));
      // sets selected — triggers re-render to show full report
  };

  if (loading) return <div className="app"><p>Loading history...</p></div>;

  if (selected) {
    // user clicked a session — show the full report
    return (
      <div className="app">
        <nav className="nav">
          <Link to="/">Research</Link>
          <Link to="/history">History</Link>
        </nav>

        <button onClick={() => setSelected(null)}>← Back to History</button>
        {/* clicking back sets selected to null, list view re-renders */}

        <h2>{selected.topic}</h2>
        <p className="subtitle">{new Date(selected.createdAt).toLocaleString()}</p>
        {/* toLocaleString converts ISO date to human readable format */}

        <div className="report">
          <div className="report-content">
            <ReactMarkdown>{selected.report}</ReactMarkdown>
            {/* identical pattern to App.js — raw markdown string as children */}
            {/* ReactMarkdown handles ## headers, **bold**, bullet lists */}
            </div>
            <button
                onClick={() => {
                    navigator.clipboard.writeText(selected.report);
                    // copies the raw markdown string to clipboard
                    // navigator.clipboard is the modern browser clipboard API
                    setCopied(true);
                    // flips label to "Copied!" so user gets feedback
                    setTimeout(() => setCopied(false), 2000);
                    // resets back to "Copy Report" after 2 seconds
                }}
                >
                {copied ? 'Copied!' : 'Copy Report'}
                {/* toggles label based on copied state */}
                </button>
          <h3>Sources</h3>
          <ul className="sources">
            {selected.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.source}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/">Research</Link>
        <Link to="/history">History</Link>
      </nav>

      <h1>Research History</h1>
      <p className="subtitle">{sessions.length} past session{sessions.length !== 1 ? 's' : ''}</p>
      {/* pluralize correctly — "1 session" not "1 sessions" */}

      {sessions.length === 0 && <p>No research sessions yet.</p>}

      <div className="sessions-list">
        {sessions.map(session => (
          <div
            key={session._id}
            className="session-card"
            onClick={() => openSession(session._id)}
            // _id is MongoDB's auto-generated unique id — use it as the React key
          >
            <h3>{session.topic}</h3>
            <p>{new Date(session.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;