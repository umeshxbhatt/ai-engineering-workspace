# 🧠 AI Engineering Odyssey

[![Status](https://img.shields.io/badge/Status-Active%20Learning-00E5FF?style=for-the-badge&logo=rocket)](https://github.com/)
[![Track](https://img.shields.io/badge/Track-Full--Stack%20to%20AI-FF6B6B?style=for-the-badge)](./AI_Engineering_Roadmap.md)
[![Profile](https://img.shields.io/badge/Progression-Level%201%20Novice-4ECDC4?style=for-the-badge)](./Developer_Profile.md)

> A rigorous, hands-on transition from MERN stack development to production AI Systems Engineering. This repository tracks daily implementation, architectural mental models, benchmarks, and 4 production-grade portfolio capstone projects.

---

## 🗺️ Roadmap & Project Matrix

| Phase | Core Domain | Portfolio Capstone Project | Key Stack & Concepts | Status |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **API Integrations & Streaming** | [Context-Aware Support Bot](./phase-1-support-bot/) | Node.js, React, SSE, Tokenomics, Structured Outputs | 🟡 **In Progress** |
| **02** | **RAG & Vector Databases** | Full-Stack Document Intelligence | ChromaDB/Pinecone, Semantic Chunking, Cross-Encoders | ⚪ Locked |
| **03** | **Autonomous Agentic Loops** | Autonomous Code & API Assistant | ReAct State Machine, Function Calling, Tool Dispatch | ⚪ Locked |
| **04** | **Production MLOps & Evals** | Enterprise RAG with Evals | LLM-as-a-Judge, Langfuse, CI/CD Automated Benchmarks | ⚪ Locked |

*Full curriculum breakdown and architectural deep-dives: [AI Engineering Roadmap](./AI_Engineering_Roadmap.md)*

---

## 🎮 Live Progression & Profile
Current level, XP, daily streak, and unlocked badges are actively tracked in:
👉 **[View Developer Profile & Activity Log](./Developer_Profile.md)**

```
Level 1 (AI Intern): [===-----------------] 15% (15 / 100 XP to Level 2)
```

---

## 📂 Repository Layout

```text
├── AI_Engineering_Roadmap.md     # Detailed curriculum from MERN to AI Systems
├── Developer_Profile.md          # Gamified XP tracker, streak, badges & activity log
├── phase-1-support-bot/          # Phase 1 Capstone: Streaming Customer Support Engine
│   ├── backend/                  # Express.js API, token streaming, context management
│   └── frontend/                 # React UI, real-time typing cadence & cancellation
├── .gitignore                    # Comprehensive secrets, node_modules, and vector store rules
└── README.md                     # You are here
```

---

## 🌉 Key MERN ➔ AI Mental Models

| MERN World | AI Engineering Equivalent | Why It Matters |
| :--- | :--- | :--- |
| **Middleware & Request Prep** | **Prompt Engineering & Context Injection** | Prompts are runtime middleware that condition model behavior prior to token generation. |
| **REST `res.json()`** | **SSE / Chunked Token Streaming** | Streaming reduces Time-to-First-Token (TTFT) from seconds to single-digit milliseconds. |
| **Joi / Zod Validation** | **Structured Outputs & JSON Mode** | Constrains stochastic model completions into strictly typed, guaranteed JSON contracts. |
| **MongoDB B-Tree Indexes** | **Vector Databases & HNSW Graphs** | B-Trees find exact matches; Vector stores index semantic proximity in high-dimensional space. |
| **Express Controllers / Routers** | **Agentic Tool Dispatchers** | The model dynamically chooses and invokes functions based on OpenAPI/JSON schemas. |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Valid API keys (e.g., OpenAI / Anthropic)

### Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Explore Phase 1 (Support Bot):**
   ```bash
   cd phase-1-support-bot/backend
   npm install
   cp .env.example .env   # Add your API key
   npm run dev
   ```

---

## 📜 License
MIT © 2026. Built with precision for production AI engineering.
