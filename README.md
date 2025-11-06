# Firefox Tab Organizer

**For everyone who opens 50+ tabs and loses track of which tabs are where.**

This Firefox extension uses AI to automatically sort your tab chaos into organized Tab Groups. Click a button, let the LLM do its thing.

> ⚠️ Mostly vibe coded. It works, but don't expect enterprise polish.

## What it does

- AI categorizes your tabs by topic, project, or domain
- Supports Claude, AWS Bedrock, OpenAI, or local Ollama
- Optional: tell it how to organize ("by project", "work vs personal", etc.)
- Your API keys stay local, encrypted by Firefox

## Status

MVP complete, end-to-end testing in progress. See [TODO.md](./TODO.md) for details.

## Dev stuff

Built with Bun + TypeScript + [Vercel AI SDK](https://ai-sdk.dev/).

```bash
bun install
bun run dev
```

## References

- [TODO.md](./TODO.md) - Task tracking and roadmap
- [docs/DESIGN.md](./docs/DESIGN.md) - Architecture & implementation details
- [CLAUDE.md](./CLAUDE.md) - Context for Claude Code / LLMs
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview) - LLM abstraction
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group) - Browser API
- [MDN WebExtensions Examples](https://github.com/mdn/webextensions-examples) - Extension patterns

## License & Copyright

Licensed under [Apache License 2.0](./LICENSE). Note: This project was LLM-generated with human review and guidance, so not sure to what extent any copyright exists on it.

---

by [bhanutejags](https://github.com/bhanutejags)
