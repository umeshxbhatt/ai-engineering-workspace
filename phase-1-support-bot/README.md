# 🤖 Phase 1 Capstone: Context-Aware Customer Support Bot

> **Mission:** Build a production-grade, low-latency customer support engine featuring Server-Sent Events (SSE) streaming, prompt defense guardrails, session memory management, and deterministic structured outputs.

---

## 🏗️ Architecture & Component Overview

```text
┌─────────────────────────────────────────────────────────────┐
│ React Streaming UI (Client)                                 │
│ - AbortController cancellation                              │
│ - Real-time token cadence rendering                         │
│ - Sentiment & Intent visualization                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE Stream
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Express.js Backend Service                                  │
│ - Dynamic System Prompt Conditioning & Context Injection    │
│ - Sliding-Window Session Memory Buffer                      │
│ - Structured JSON Ticket Extraction (JSON Schema Mode)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ LLM SDK / API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LLM Provider (OpenAI / Anthropic / Gemini)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Milestones

- [x] **Mission 1:** Backend environment initialization & Express setup (`express`, `cors`, `dotenv`).
- [ ] **Mission 2:** Direct LLM SDK integration & system persona conditioning.
- [ ] **Mission 3:** Low-latency Server-Sent Events (SSE) token streaming endpoint.
- [ ] **Mission 4:** Multi-turn session memory with token budget sliding window.
- [ ] **Mission 5:** Structured outputs: Deterministic JSON ticket extraction & sentiment scoring.
- [ ] **Mission 6:** React client streaming interface with markdown formatting & typing animation.

---

## 📂 Directory Layout

```text
phase-1-support-bot/
├── backend/                  # Node.js + Express API
│   ├── .env.example          # Environment variable template
│   ├── package.json          # Dependencies
│   └── src/                  # Server logic, routes, and LLM controllers
├── frontend/                 # React client application (Vite)
└── README.md                 # Project documentation
```

---

## 🚀 Local Development Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env          # Set your LLM API Key
npm run dev
```

### Frontend
```bash
cd frontend
# Scaffold or start the client app
npm install
npm run dev
```
