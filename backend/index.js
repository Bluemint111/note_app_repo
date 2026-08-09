const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const notesFile = path.join(__dirname, 'notes.json');
const authSecret = process.env.AUTH_SECRET || 'default_auth_secret';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gjeqvnyufzmrpoedralf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZXF2bnl1ZnptcnBvZWRyYWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc3NDQ1MywiZXhwIjoyMDk5MzUwNDUzfQ.jqbFv31ZZn5DqN7kIjLaLOlWRIuo0qHRVcSISYzJfy4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(`${String(password)}:${authSecret}`)
    .digest('hex');
}

function makeAuthToken(user) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(`${user.password_hash}:${authSecret}`)
    .digest('hex');

  return Buffer.from(`${user.id}:${tokenHash}`).toString('base64');
}

async function verifyAuthToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    const id = decoded.slice(0, separatorIndex);
    const tokenHash = decoded.slice(separatorIndex + 1);
    if (!id || !tokenHash) return null;

    const { data, error } = await supabase.from('users').select('id,username,password_hash').eq('id', id).maybeSingle();
    if (error || !data) return null;

    const expectedHash = crypto
      .createHash('sha256')
      .update(`${data.password_hash}:${authSecret}`)
      .digest('hex');

    return expectedHash === tokenHash ? data : null;
  } catch (err) {
    return null;
  }
}

const authenticate = async (req, res, next) => {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const user = await verifyAuthToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid auth token.' });
  }

  req.user = user;
  next();
};

const runFetch = (...args) => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available in this Node runtime. Please use Node 18+ or install node-fetch.');
  }
  return fetch(...args);
};

function normalizeLabels(labels) {
  if (Array.isArray(labels)) {
    return labels.map((label) => String(label).trim()).filter(Boolean);
  }
  if (typeof labels === 'string') {
    return labels
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
  }
  return [];
}

function readFallbackNotes() {
  if (!fs.existsSync(notesFile)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return [data];
    return [];
  } catch (err) {
    return [];
  }
}

function writeFallbackNotes(notes) {
  fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2), 'utf8');
  return notes;
}

function getFallbackNoteById(id) {
  const notes = readFallbackNotes();
  return notes.find((note) => String(note.id) === String(id)) || null;
}

function saveFallbackNote(noteData, id) {
  const notes = readFallbackNotes();
  const normalized = {
    title: String(noteData.title || 'My Note'),
    grid: Array.isArray(noteData.grid) ? noteData.grid : Array.from({ length: 10 }, () => Array.from({ length: 5 }, () => '')),
    labels: normalizeLabels(noteData.labels)
  };
  const now = new Date().toISOString();

  if (id != null) {
    const foundIndex = notes.findIndex((note) => String(note.id) === String(id));
    if (foundIndex >= 0) {
      const updated = {
        ...notes[foundIndex],
        ...normalized,
        id: notes[foundIndex].id,
        updated_at: now,
        created_at: notes[foundIndex].created_at || now
      };
      notes[foundIndex] = updated;
      writeFallbackNotes(notes);
      return updated;
    }
  }

  const nextId = notes.reduce((max, note) => Math.max(max, Number(note.id) || 0), 0) + 1;
  const created = {
    id: nextId,
    ...normalized,
    created_at: now,
    updated_at: now
  };
  notes.push(created);
  writeFallbackNotes(notes);
  return created;
}

function deleteFallbackNote(id) {
  const notes = readFallbackNotes();
  const updated = notes.filter((note) => String(note.id) !== String(id));
  writeFallbackNotes(updated);
  return updated.length < notes.length;
}

function sendFallback(res, note, id) {
  const fallbackNote = saveFallbackNote(note, id);
  return res.status(200).json({ ...fallbackNote, fallback: true });
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const passwordHash = hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .select('id,username,password_hash')
      .eq('username', String(username).trim().toLowerCase())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    return res.json({
      user: { id: data.id, username: data.username },
      token: makeAuthToken(data)
    });
  } catch (err) {
    console.error('Login error:', err.message || err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const normalizedUsername = String(username).trim().toLowerCase();
    const passwordHash = hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .insert([{ username: normalizedUsername, password_hash: passwordHash }])
      .select('id,username,password_hash')
      .single();

    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      throw error;
    }

    return res.status(201).json({
      user: { id: data.id, username: data.username },
      token: makeAuthToken(data)
    });
  } catch (err) {
    console.error('Register error:', err.message || err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractValuesFromTranscript(transcript, headers) {
  const text = String(transcript || '').trim();
  const normalizedHeaders = headers.map((header, index) => String(header || '').trim() || `Column ${index + 1}`);

  return normalizedHeaders.map((header) => {
    const lowerHeader = header.toLowerCase();
    const headerPattern = new RegExp(`${escapeRegExp(header)}\\s*[:=-]\\s*([^\\n]+)`, 'i');
    const directMatch = text.match(headerPattern);
    if (directMatch) {
      return directMatch[1].trim();
    }

    if (lowerHeader.includes('email')) {
      const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
      if (emailMatch) return emailMatch[0];
    }

    if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('number')) {
      const phoneMatch = text.match(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/);
      if (phoneMatch) return phoneMatch[0];
    }

    if (lowerHeader.includes('name')) {
      const nameMatch = text.match(/\b(?:name|called|i am|my name is)\s+([a-z0-9 .,'-]+)/i);
      if (nameMatch) return nameMatch[1].trim();
    }

    if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
      const companyMatch = text.match(/\b(?:company|organization|works at|work at)\s+([a-z0-9 .,'-]+)/i);
      if (companyMatch) return companyMatch[1].trim();
    }

    if (lowerHeader.includes('address') || lowerHeader.includes('location')) {
      const addressMatch = text.match(/\b(?:address|located at|live at)\s+([a-z0-9 ,.-]+)/i);
      if (addressMatch) return addressMatch[1].trim();
    }

    return '';
  });
}

app.post('/ai-summary', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    const trimmedTranscript = String(transcript || '').trim();

    if (!trimmedTranscript) {
      return res.status(400).json({ error: 'Transcript is required.' });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY is not configured on the server.' });
    }

    let summary = '';
    try {
      const prompt = [
        'You are a helpful assistant. Summarize the transcript below in 2-3 short sentences.',
        'Return only the summary text with no markdown, explanation, or extra commentary.',
        `Transcript: ${trimmedTranscript}`
      ].join('\n\n');

      const geminiResponse = await runFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256
          }
        })
      });

      const geminiData = await geminiResponse.json();
      if (!geminiResponse.ok) {
        throw new Error(geminiData.error?.message || 'Gemini request failed.');
      }

      summary = String(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      if (!summary) {
        throw new Error('Gemini returned an empty summary.');
      }
    } catch (geminiErr) {
      console.error('Gemini summary failed:', geminiErr.message);
      return res.status(500).json({ error: 'Unable to generate transcript summary with Gemini.' });
    }

    return res.json({ summary });
  } catch (err) {
    console.error('AI summary error:', err.message);
    return res.status(500).json({ error: err.message || 'Unable to generate transcript summary.' });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Notes API is running.',
    routes: ['GET /notes', 'GET /note/:id', 'POST /note', 'PUT /note/:id', 'DELETE /note/:id']
  });
});

app.get('/notes', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', req.user.id);
    if (error) {
      throw error;
    }
    return res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Supabase GET /notes error:', err.message);
    return res.json(readFallbackNotes());
  }
});

app.get('/note/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      const fallback = getFallbackNoteById(id);
      return fallback ? res.json(fallback) : res.status(404).json({ error: 'Note not found.' });
    }
    return res.json(data);
  } catch (err) {
    console.error(`Supabase GET /note/${id} error:`, err.message);
    const fallback = getFallbackNoteById(id);
    return fallback ? res.json(fallback) : res.status(500).json({ error: err.message });
  }
});

app.post('/note', authenticate, async (req, res) => {
  const { title, grid, labels } = req.body;
  const note = { title, grid, labels: normalizeLabels(labels), user_id: req.user.id };

  try {
    const { data, error } = await supabase.from('notes').insert([note]).select().single();
    if (error || !data) {
      return sendFallback(res, note);
    }
    saveFallbackNote({ id: data.id, ...note }, data.id);
    return res.json({ ...data, labels: normalizeLabels(labels) });
  } catch (err) {
    return sendFallback(res, note);
  }
});

app.put('/note/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, grid, labels } = req.body;
  const note = { title, grid, labels: normalizeLabels(labels) };

  try {
    const { data, error } = await supabase
      .from('notes')
      .update({ title, grid, labels: normalizeLabels(labels) })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error || !data) {
      return sendFallback(res, { id, ...note }, id);
    }
    saveFallbackNote({ id, ...note }, id);
    return res.json({ ...data, labels: normalizeLabels(labels) });
  } catch (err) {
    return sendFallback(res, { id, ...note }, id);
  }
});

app.delete('/note/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) {
      throw error;
    }
    deleteFallbackNote(id);
    return res.json({ success: true, note: data });
  } catch (err) {
    console.error(`Supabase DELETE /note/${id} error:`, err.message);
    const deleted = deleteFallbackNote(id);
    if (deleted) {
      return res.json({ success: true, fallback: true });
    }
    return res.status(500).json({ error: err.message || 'Unable to delete note.' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
