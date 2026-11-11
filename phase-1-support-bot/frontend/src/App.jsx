import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Zap
} from 'lucide-react';

const API_BASE = 'http://localhost:5001';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Real-Time Stream Consumer (The AI Frontend Core)
   * Consumes HTTP SSE stream via fetch() and ReadableStream reader
   */
  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || input.trim();
    if (!textToSend || isStreaming) return;

    setErrorMsg(null);
    setInput('');

    // 1. Snapshot previous history for sliding window buffer
    const currentHistory = [...messages];

    // 2. Optimistically append User message and empty Assistant message
    const userMsg = { role: 'user', text: textToSend };
    const assistantPlaceholder = { role: 'model', text: '' };
    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    // 3. Setup AbortController for stream cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: currentHistory,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! Status: ${response.status}`);
      }

      // 4. Connect to HTTP Chunked ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode incoming raw binary bytes into string
        buffer += decoder.decode(value, { stream: true });

        // Split buffer by SSE event boundaries (\n\n)
        const parts = buffer.split('\n\n');
        // Keep incomplete trailing segment in buffer
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;

          const dataPayload = line.replace(/^data:\s*/, '').trim();

          // Stream completed sentinel
          if (dataPayload === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.text) {
              // Incrementally append new token chunk to the active assistant bubble
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    text: updated[lastIdx].text + parsed.text,
                  };
                }
                return updated;
              });
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore non-JSON ping/heartbeat chunks
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream cancelled by user.');
      } else {
        console.error('Streaming error:', err);
        setErrorMsg(err.message || 'Failed to stream response.');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Stop Generating Action
   * Aborts client fetch, triggering server res.on('close')
   */
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  /**
   * Reset Session
   */
  const handleResetSession = () => {
    if (isStreaming) handleStopGenerating();
    setMessages([]);
    setTicket(null);
    setErrorMsg(null);
  };

  /**
   * Structured Output Ticket Extraction Trigger
   * Calls POST /api/chat/analyze-ticket
   */
  const handleExtractTicket = async () => {
    if (messages.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE}/api/chat/analyze-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: messages }),
      });

      const data = await response.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
      } else {
        throw new Error(data.error || 'Failed to extract ticket.');
      }
    } catch (err) {
      console.error('Ticket analysis error:', err);
      setErrorMsg(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      {/* ── Left / Main Chat Surface ───────────────────────────── */}
      <main className="chat-main">
        <header className="chat-header">
          <div className="brand-badge">
            <div className="brand-icon">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="brand-title">Nova Support AI</h1>
              <p className="brand-subtitle">CloudPeak Solutions • Real-Time SSE Stream</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              onClick={handleResetSession}
              className="btn-icon"
              title="Reset Conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <section className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Sparkles size={28} />
              </div>
              <h2 className="empty-title">How can Nova assist you today?</h2>
              <p className="empty-desc">
                Test our context-aware agent with dynamic guardrails, token streaming, and automatic CRM ticket extraction.
              </p>

              <div className="prompt-suggestions">
                <button
                  className="suggestion-btn"
                  onClick={() => handleSendMessage('What is your refund policy?')}
                >
                  <span>"What is your refund policy?"</span>
                  <Zap size={14} className="text-muted" />
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => handleSendMessage('My production database crashed 2 hours ago! Give me refund immediately!')}
                >
                  <span>"My database crashed! I need a human & refund!"</span>
                  <ShieldAlert size={14} className="text-rose" />
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => handleSendMessage('What subscription plans do you offer for teams?')}
                >
                  <span>"What subscription plans do you offer?"</span>
                  <Zap size={14} className="text-muted" />
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <div className={`message-avatar ${msg.role}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="message-bubble">
                  {msg.text}
                  {isStreaming && idx === messages.length - 1 && msg.role === 'model' && (
                    <span className="streaming-cursor" />
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </section>

        {errorMsg && (
          <div style={{ margin: '0 32px 12px', padding: '10px 16px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', color: '#fb7185', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Chat Input Section */}
        <footer className="chat-input-section">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="input-container"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Nova about pricing, technical issues, or refunds..."
              disabled={isStreaming}
              className="chat-input"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGenerating}
                className="btn-icon btn-stop"
                title="Stop Generating"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-icon btn-send"
                title="Send Message"
              >
                <Send size={16} />
              </button>
            )}
          </form>
        </footer>
      </main>

      {/* ── Right / CRM Structured Metadata Sidebar ───────────── */}
      <aside className="ticket-sidebar">
        <header className="sidebar-header">
          <div className="sidebar-title">
            <FileText size={18} className="text-indigo" />
            <span>CRM Ticket Intelligence</span>
          </div>
        </header>

        <div className="sidebar-content">
          <button
            onClick={handleExtractTicket}
            disabled={messages.length === 0 || isAnalyzing || isStreaming}
            className="btn-analyze"
          >
            {isAnalyzing ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                <span>Extracting Schema...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Support Ticket</span>
              </>
            )}
          </button>

          {ticket ? (
            <div className="ticket-card">
              <div className="ticket-row">
                <span className="ticket-label">Intent</span>
                <span className="badge badge-intent">{ticket.intent}</span>
              </div>

              <div className="ticket-row">
                <span className="ticket-label">Urgency</span>
                <span className={`badge badge-${ticket.urgency.toLowerCase()}`}>
                  {ticket.urgency}
                </span>
              </div>

              <div className="ticket-row">
                <span className="ticket-label">Sentiment</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ticket.sentiment < 0 ? '#fb7185' : '#34d399' }}>
                  {ticket.sentiment.toFixed(2)} ({ticket.sentiment < 0 ? 'Negative' : 'Positive'})
                </span>
              </div>

              <div className={`escalation-box ${ticket.requiresEscalation ? 'escalated' : 'normal'}`}>
                {ticket.requiresEscalation ? (
                  <>
                    <ShieldAlert size={16} />
                    <span>Human Escalation Required</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Automated Handling OK</span>
                  </>
                )}
              </div>

              <div>
                <span className="ticket-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Executive Summary
                </span>
                <p className="summary-box">{ticket.summary}</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>Chat with Nova and click "Generate Support Ticket" to extract structured JSON metadata.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

