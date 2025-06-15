# 🧠 Company Intelligence Enrichment App

This is a prototype app that allows a user to enter a company name, verifies the correct company via website and logo, then uses AI agents and web scraping to auto-fill relevant information about the company and its executives. The enriched data will later be used to trigger alerts when online mentions match tracked entities.

---

## 🚀 Features

- ✍️ Input a company name
- 🌐 Identify and verify the correct company website and logo
- 🧑‍💼 Fetch executive names and titles (e.g., from LinkedIn or search results)
- 📎 Extract and store key executive info and role-based keywords
- 🧠 Use AI agents (e.g., n8n or LangChain) to coordinate API calls and data validation
- 📦 Save all structured data in a format usable for monitoring and alerts

---

## 🏗️ Architecture Overview

- **Frontend**: Simple form UI (React / HTML)
- **Backend**: AI agent to handle logic (n8n or Node.js with LLM integration)
- **APIs**:
  - [SerpAPI](https://serpapi.com/) – Search engine scraping
  - [Clearbit](https://clearbit.com/) – Company data enrichment (optional)
  - [OpenAI API](https://platform.openai.com/) – LLM for reasoning and summarization
- **Database**: Local JSON, SQLite, or Supabase (TBD)
- **Future**:
  - Alerts via RSS or social media triggers
  - Custom monitoring rules per entity

---

## 🛠️ Project Setup

### 1. Clone This Repo
```bash
git clone https://github.com/yourname/company-enrichment-app.git
cd company-enrichment-app
