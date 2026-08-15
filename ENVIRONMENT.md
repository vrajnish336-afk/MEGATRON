# MEGADRONE Environment Variables Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | String | `development` | Runtime environment (`development` or `production`) |
| `PORT` | Integer | `5000` | Port for the Express server |
| `HOST` | String | `0.0.0.0` | Bind host IP address |
| `JWT_SECRET` | String | `[REQUIRED IN PROD]` | Secret key used for signing JWT access tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Lifetime of authentication sessions |
| `BCRYPT_SALT_ROUNDS` | Integer | `10` | Salt rounds for password hashing |
| `DATABASE_TYPE` | String | `sqlite` | Database engine (`sqlite` or `postgres`) |
| `DATABASE_FILE` | String | `./data/megadrone.sqlite` | SQLite database file location |
| `CLOUD_AI_PROVIDER` | String | `openai_compatible` | Cloud AI API format (`openai_compatible`) |
| `CLOUD_AI_API_KEY` | String | `""` | API Key for external Cloud AI reasoning |
| `CLOUD_AI_BASE_URL` | String | `https://api.openai.com/v1` | Cloud AI base endpoint URL |
| `CLOUD_AI_MODEL` | String | `gpt-4o-mini` | Model name for Cloud AI requests |
| `CLOUD_AI_TIMEOUT_MS` | Integer | `30000` | Cloud AI HTTP timeout in milliseconds |
| `CLOUD_AI_MAX_RETRIES` | Integer | `2` | Number of automatic retries on failure/rate-limit |
| `LOCAL_OLLAMA_BASE_URL` | String | `http://127.0.0.1:11434` | Ollama local endpoint URL |
| `LOCAL_OLLAMA_MODEL` | String | `llama3.2:latest` | Local model tag name |
| `AI_ROUTING_STRATEGY` | String | `dynamic` | `dynamic`, `prefer_local`, `prefer_cloud`, `force_local`, `force_cloud` |
| `ALLOW_CLOUD_FOR_PUBLIC` | Boolean | `true` | Permits Cloud processing for PUBLIC data |
| `ALLOW_CLOUD_FOR_INTERNAL` | Boolean | `true` | Permits Cloud processing for INTERNAL data |
| `ALLOW_CLOUD_FOR_CONFIDENTIAL` | Boolean | `false` | Permits Cloud processing for CONFIDENTIAL data |
| `ALLOW_CLOUD_FOR_SENSITIVE` | Boolean | `false` | Permits Cloud processing for SENSITIVE data |
| `LOG_LEVEL` | String | `info` | Minimum log severity (`debug`, `info`, `warn`, `error`) |
| `SANITIZE_SECRETS_IN_LOGS` | Boolean | `true` | Enables automatic secret scrubbing in logs and audits |
