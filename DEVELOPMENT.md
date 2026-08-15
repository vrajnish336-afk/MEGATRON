# MEGADRONE Development Guide

## 1. Local Environment Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment File**:
   Copy `.env.example` to `.env` and verify settings:
   ```bash
   cp .env.example .env
   ```

3. **Seed Verified Demo Database**:
   ```bash
   npm run seed
   ```

4. **Run Server**:
   ```bash
   npm start
   ```

---

## 2. Running Automated Tests

Run the built-in test suite:
```bash
npm test
```

To run a specific test file:
```bash
node --test backend/tests/megadrone.test.js
```

---

## 3. Connecting Local Ollama

To enable zero-cost, private local AI:
1. Install Ollama: `https://ollama.com`
2. Pull model: `ollama pull llama3.2:latest`
3. Ollama runs on `http://127.0.0.1:11434`
4. In `.env`:
   ```env
   LOCAL_OLLAMA_BASE_URL=http://127.0.0.1:11434
   LOCAL_OLLAMA_MODEL=llama3.2:latest
   ```

---

## 4. Connecting Cloud AI (Optional)

To enable Cloud AI reasoning:
1. In `.env`:
   ```env
   CLOUD_AI_API_KEY=your_openai_or_compatible_api_key
   CLOUD_AI_BASE_URL=https://api.openai.com/v1
   CLOUD_AI_MODEL=gpt-4o-mini
   ```
