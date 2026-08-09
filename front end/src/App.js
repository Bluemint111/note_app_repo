import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const exportBaseUrl = process.env.REACT_APP_EXPORT_URL || 'http://localhost:5000';
const defaultGrid = Array.from({ length: 10 }, () => Array.from({ length: 5 }, () => ''));

const parseLabels = (value) => {
  if (Array.isArray(value)) {
    return value.map((label) => String(label).trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
};

function App() {
  const [view, setView] = useState('list');
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('My Note');
  const [labelsInput, setLabelsInput] = useState('');
  const [grid, setGrid] = useState(defaultGrid);
  const [noteId, setNoteId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const savingRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (transcript.trim()) {
      setSummary('');
    }
  }, [transcript]);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('authUsername');
    if (storedToken && storedUsername) {
      setAuthToken(storedToken);
      setUser({ username: storedUsername });
    }
  }, []);

  useEffect(() => {
    if (!authToken) {
      delete axios.defaults.headers.common.Authorization;
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    fetchNotes();
  }, [authToken]);

  useEffect(() => {
    if (view !== 'editor') return undefined;

    const interval = setInterval(async () => {
      if (!isDirty || savingRef.current) return;
      savingRef.current = true;
      setIsSaving(true);
      try {
        await saveNote(true);
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [view, isDirty]);

  const fetchNotes = async () => {
    if (!authToken) return;

    try {
      const res = await axios.get(`${apiBaseUrl}/notes`);
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load notes', err.response?.data?.error || err.message || err);
      setNotes([]);
    }
  };

  const loadNote = (note) => {
    setTitle(note.title || 'My Note');
    setLabelsInput(parseLabels(note.labels).join(', '));
    setGrid(Array.isArray(note.grid) ? note.grid : defaultGrid);
    setNoteId(note.id ?? null);
    setIsDirty(false);
    setView('editor');
  };

  const createNewNote = () => {
    setTitle('My Note');
    setLabelsInput('');
    setGrid(defaultGrid);
    setNoteId(null);
    setIsDirty(false);
    setView('editor');
  };

  const updateCell = (rowIndex, colIndex, value) => {
    setGrid((prevGrid) =>
      prevGrid.map((row, r) =>
        row.map((cell, c) => (r === rowIndex && c === colIndex ? value : cell))
      )
    );
    setIsDirty(true);
  };

  const addRow = () => {
    setGrid((prevGrid) => {
      const columnCount = prevGrid[0]?.length || 1;
      return [...prevGrid, Array.from({ length: columnCount }, () => '')];
    });
  };

  const addColumn = () => {
    setGrid((prevGrid) => prevGrid.map((row) => [...row, '']));
  };

  const deleteLastRow = () => {
    if (grid.length === 0) return;

    const lastRowIndex = grid.length - 1;
    const hasContent = grid[lastRowIndex]?.some((cell) => String(cell || '').trim());
    const confirmed = hasContent
      ? window.confirm('Delete the last row and its contents?')
      : true;

    if (!confirmed) return;

    setGrid((prevGrid) => prevGrid.slice(0, -1));
  };

  const deleteLastColumn = () => {
    if (grid.length === 0 || grid[0].length === 0) return;

    const lastColIndex = grid[0].length - 1;
    const hasContent = grid.some((row) => String(row[lastColIndex] || '').trim());
    const confirmed = hasContent
      ? window.confirm('Delete the last column and its contents?')
      : true;

    if (!confirmed) return;

    setGrid((prevGrid) => prevGrid.map((row) => row.slice(0, -1)));
  };

  const summarizeTranscript = async () => {
    if (!transcript.trim()) {
      alert('Record or paste a transcript first.');
      return;
    }

    try {
      setSummaryLoading(true);
      const res = await axios.post(`${apiBaseUrl}/ai-summary`, {
        transcript
      });

      setSummary(res?.data?.summary || 'No summary was generated.');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Transcript summarization failed: ${message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const login = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await axios.post(`${apiBaseUrl}/login`, {
        username: authUsername,
        password: authPassword
      });

      setUser(res.data.user);
      setAuthToken(res.data.token);
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('authUsername', res.data.user.username);
      setView('list');
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await axios.post(`${apiBaseUrl}/register`, {
        username: authUsername,
        password: authPassword
      });

      setUser(res.data.user);
      setAuthToken(res.data.token);
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('authUsername', res.data.user.username);
      setView('list');
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken('');
    setAuthUsername('');
    setAuthPassword('');
    setNotes([]);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUsername');
  };

  const startRecording = async () => {
    try {
      setRecordingError('');
      setTranscript('');
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Voice recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          const interimText = Array.from(event.results)
            .map((result) => result[0]?.transcript || '')
            .join(' ')
            .trim();
          setTranscript(interimText);
        };
        recognition.onerror = () => {
          setRecordingError('Speech recognition was interrupted.');
        };
        recognition.onend = () => {
          if (isRecording) {
            recognition.start();
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
    } catch (err) {
      setRecordingError(err.message || 'Unable to start recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const saveNote = async (silent = false) => {
    try {
      const payload = {
        title,
        grid,
        labels: parseLabels(labelsInput)
      };

      const res = noteId
        ? await axios.put(`${apiBaseUrl}/note/${noteId}`, payload)
        : await axios.post(`${apiBaseUrl}/note`, payload);

      if (res?.data?.id) {
        setNoteId(res.data.id);
      }

      setIsDirty(false);
      if (!silent) {
        await fetchNotes();
        alert('Saved successfully');
      }
    } catch (err) {
      setIsDirty(true);
      const message = err.response?.data?.error || err.message || 'Unknown error';
      if (!silent) {
        alert(`Save failed: ${message}`);
      } else {
        console.warn('Autosave failed:', message);
      }
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      await axios.delete(`${apiBaseUrl}/note/${id}`);
      if (noteId === id) {
        createNewNote();
      }
      await fetchNotes();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Delete failed: ${message}`);
    }
  };

  const exportExcel = async () => {
    try {
      const res = await axios.post(`${exportBaseUrl}/export`, { title, grid }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'note'}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    }
  };

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>{authMode === 'register' ? 'Create account' : 'Sign in'}</h1>
          <p>
            {authMode === 'register'
              ? 'Choose a username and password to create your note account.'
              : 'Sign in with your username and password.'}
          </p>
          {authError ? <div className="auth-error">{authError}</div> : null}

          <label className="auth-field">
            Username
            <input
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
            />
          </label>

          <label className="auth-field">
            Password
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="password"
              autoComplete="current-password"
            />
          </label>

          <div className="auth-action-row">
            <button onClick={authMode === 'register' ? register : login} disabled={authLoading}>
              {authLoading ? (authMode === 'register' ? 'Creating…' : 'Signing in…') : authMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
            <button
              className="auth-toggle"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'register' ? 'login' : 'register');
                setAuthError('');
              }}
            >
              {authMode === 'register' ? 'Have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <h1>{view === 'list' ? 'Notes' : noteId ? 'Edit Note' : 'New Note'}</h1>
          {view === 'list' ? <p className="note-count">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p> : null}
          <p className="signed-in-as">Signed in as {user.username}</p>
        </div>

        <div className="action-row">
          <button onClick={createNewNote}>New Note</button>
          {view === 'editor' ? <button onClick={() => setView('list')}>Back to Notes</button> : null}
          {view === 'editor' ? <button onClick={saveNote}>Save</button> : null}
          {view === 'editor' ? <button onClick={exportExcel}>Export XLSX</button> : null}
          <button onClick={handleLogout}>Logout</button>
          {view === 'editor' ? (
            <div className={`save-indicator ${isSaving ? 'saving' : isDirty ? 'unsaved' : 'saved'}`}>
              {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'All changes saved'}
            </div>
          ) : null}
        </div>
      </header>

      {view === 'list' ? (
        <main className="notes-page">
          {notes.length === 0 ? (
            <section className="empty-state">
              <h2>No notes yet</h2>
              <p>Click New Note to create a note and add a label so you can organize it later.</p>
            </section>
          ) : (
            <div className="notes-grid">
              {notes.map((note, index) => (
                <article className="note-card" key={`note-${note.id ?? index}`}>
                  <div className="note-card-header">
                    <div>
                      <h2>{note.title || 'Untitled'}</h2>
                      <div className="note-labels">
                        {parseLabels(note.labels).length > 0 ? (
                          parseLabels(note.labels).map((label) => (
                            <span key={label} className="label-pill">
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="label-pill empty">No labels</span>
                        )}
                      </div>
                    </div>
                    <div className="note-card-actions">
                      <button onClick={() => loadNote(note)}>Open</button>
                      {note.id != null ? (
                        <button className="delete-button" onClick={() => deleteNote(note.id)}>
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="note-preview">
                    {Array.isArray(note.grid) && note.grid[0]
                      ? note.grid[0].join(' • ')
                      : 'No grid headers yet.'}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      ) : (
        <main className="grid-scroll-area">
          <section className="metadata-panel">
            <input
              className="title-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Note title"
            />
            <input
              className="labels-input"
              value={labelsInput}
              onChange={(e) => {
                setLabelsInput(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Labels, comma separated"
            />
          </section>

          {showTranscript && (
            <section className="transcript-panel">
              <h3>Transcript</h3>
              <p>{transcript || 'No transcript yet.'}</p>
              {recordingError ? <p className="transcript-error">{recordingError}</p> : null}
              {summary ? (
                <div className="transcript-summary">
                  <h4>Summary</h4>
                  <p>{summary}</p>
                </div>
              ) : null}
            </section>
          )}

          <section className="editor-actions">
            <button onClick={addRow}>+ Row</button>
            <button onClick={deleteLastRow}>- Last Row</button>
            <button onClick={addColumn}>+ Column</button>
            <button onClick={deleteLastColumn}>- Last Column</button>
            <button
              className={isRecording ? 'recording-button' : ''}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button onClick={() => setShowTranscript((value) => !value)}>Transcript</button>
            <button onClick={summarizeTranscript} disabled={summaryLoading}>
              {summaryLoading ? 'Summarizing...' : 'Summarize Transcript'}
            </button>
          </section>

          <div className="grid-container">
            {grid.map((row, rowIndex) => (
              <div className="grid-row" key={rowIndex} style={{ '--grid-columns': row.length || 1 }}>
                {row.map((cell, colIndex) => (
                  <input
                    key={`${rowIndex}-${colIndex}`}
                    className="grid-cell"
                    value={cell}
                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                  />
                ))}
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
