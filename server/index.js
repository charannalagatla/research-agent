const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const mongoose = require('mongoose');

// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));
// .then/.catch because connect() returns a promise
// if connection fails, we log the error but the server still starts
// agent can still run — saving to DB is non-critical

const app = express();
app.use(cors());
// cors allows the React frontend (running on port 3000) to talk to this server
// without it, the browser blocks the request for security reasons

app.use(express.json());
// this lets Express read JSON from request bodies
// without it, req.body would be undefined

// ── RATE LIMITING ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' }
});

app.use('/api/research', limiter);
// scoped to /api/research only — history/session routes are cheap DB reads, no need to restrict

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── RESEARCH ENDPOINT ─────────────────────────────────────────
app.post('/api/research', async (req, res) => {
  // POST because we're sending data (the topic) to the server
  // GET is for fetching data, POST is for triggering an action with input

  const { topic } = req.body;
  // destructure topic from the request body
  // frontend will send: { "topic": "quantum computing" }

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
    // always validate input — never trust what comes from the client
  }

  try {
    const { runResearchAgent } = require('./agent/orchestrator');

    const steps = [];
    // collect every step the agent takes
    // we'll send them all back in the response so the frontend knows what happened

    const result = await runResearchAgent(topic, (step) => {
      steps.push(step);
      console.log(`[${step.type}] ${step.message}`);
      // still logging to console for debugging
    });

    res.json({
      success: true,
      topic,
      steps,       // all the steps the agent took
      sources: result.sources,  // the 3 sources it read
      report: result.report     // the final synthesized report
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Research failed', details: err.message });
    // always return a clean error to the client — never expose raw stack traces
  }
});

// ── STREAMING RESEARCH ENDPOINT ──────────────────────────────
app.get('/api/research/stream', async (req, res) => {
  // GET not POST — SSE requires GET because browsers open SSE with EventSource
  // which only supports GET requests, not POST
  
  const { topic } = req.query;
  // topic comes from query string: /api/research/stream?topic=quantum computing
  // not from req.body because SSE is a GET request, GET requests have no body

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // ── SET SSE HEADERS ────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  // tells the browser "this is a stream, keep the connection open"
  
  res.setHeader('Cache-Control', 'no-cache');
  // tells browser and proxies: don't cache this, every byte is fresh data
  
  res.setHeader('Connection', 'keep-alive');
  // keeps the TCP connection open so we can keep sending data
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  // cors for SSE — needed separately from the cors middleware above

  // helper function to send one SSE event
  // SSE format is strict: must be "data: <json>\n\n"
  // the double newline \n\n signals end of one event to the browser
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { runResearchAgent } = require('./agent/orchestrator');

    // every time the agent does something, stream it to the frontend immediately
    const result = await runResearchAgent(topic, (step) => {
      if (step.type === 'clarification') {
        sendEvent({ type: 'clarification', payload: step });
        // clarification needs its own event type so frontend can handle it separately
      } else {
        sendEvent({ type: 'step', payload: step });
      }
    });

    // save to MongoDB after agent finishes
  // only save and complete if research actually finished — not if waiting for clarification
  if (!result.clarification) {
    try {
      const Research = require('./models/Research');
      await Research.create({
        topic,
        sources: result.sources,
        report: result.report
      });
      console.log('Session saved to MongoDB');
    } catch (dbErr) {
      console.error('Failed to save session:', dbErr.message);
    }

    sendEvent({ type: 'complete', payload: result });
  }

  } catch (err) {
    sendEvent({ type: 'error', payload: { message: err.message } });
  } finally {
    res.end();
    // close the stream — connection is done
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const Research = require('./models/Research');
    // requiring here instead of top-level — consistent with how you've done it elsewhere in this file

    const sessions = await Research.find({}, 'topic createdAt report')
      // first arg {} = no filter, get all documents
      // second arg = projection — only return these three fields, not the full sources array
      .sort({ createdAt: -1 })
      // -1 = descending, newest first
      .limit(20);
      // cap at 20 — no reason to send 500 sessions to the frontend at once

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const Research = require('./models/Research');

    const session = await Research.findById(req.params.id);
    // req.params.id captures whatever comes after /api/sessions/ in the URL
    // MongoDB's _id field is what React will pass here

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));