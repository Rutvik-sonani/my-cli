# @mycli-cli/ai-manager

AI-assisted scaffolding: client setup, prompts, and generation planning for OpenAI, Anthropic, and Ollama.

## CLI commands

| Command | Description |
|---------|-------------|
| `my add ai` | Scaffold `src/ai/` client and env vars |
| `my ai generate module user` | Plan AI generation for a module |
| `my ai generate crud product --fields name,price` | Plan CRUD generation |
| `my ai generate module user --dry-run` | Preview prompt without calling provider |

## Outputs

| Path | Purpose |
|------|---------|
| `src/ai/client.ts` | Provider-agnostic AI client |
| `src/ai/prompts.ts` | Prompt templates |
| `src/ai/index.ts` | Barrel export |
| `docs/ai.md` | Setup and usage documentation |
| `.env.example` | `AI_PROVIDER`, API keys, model names |

Templates: `apps/cli/templates/features/ai/`.

## Tests

```bash
pnpm --filter @mycli-cli/ai-manager test
```

See [PLUGIN_GUIDE.md](../../PLUGIN_GUIDE.md).
