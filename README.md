# Firefox Tab Organizer

AI-powered Firefox WebExtension that automatically organizes open tabs into Tab Groups using LLM intelligence.

## 🎯 Features

- **AI-Powered Categorization**: Automatically groups tabs by topic, project, or domain similarity
- **Multiple LLM Providers**: Support for AWS Bedrock, Claude API, and OpenAI
- **TypeScript**: Fully typed codebase with strict type checking
- **Provider-Agnostic**: Easy to switch between LLM providers
- **Custom Prompts**: Optional user guidance for organization (e.g., "organize by project")
- **Smart Group Handling**: Choose to clear existing groups or only organize ungrouped tabs

## 🚀 Tech Stack

- **Runtime & Build**: Bun (native TypeScript bundler)
- **Language**: TypeScript (strict mode)
- **Code Quality**: Biome (linter + formatter)
- **Browser API**: webextension-polyfill
- **LLM Integration**: [Vercel AI SDK](https://ai-sdk.dev/)

## 📋 Implementation Status

🔄 **Status**: Project Setup Complete

See [PLAN.md](./PLAN.md) for the complete implementation plan.

## 🏗️ Project Structure

```
firefox-tab-organizer/
├── src/
│   ├── background.ts
│   ├── popup/
│   ├── options/
│   └── lib/
│       ├── types.ts
│       ├── llm-provider.ts
│       ├── provider-registry.ts
│       └── providers/
├── dist/
├── manifest.json
├── package.json
└── tsconfig.json
```

## 🔐 Privacy & Security

- All API keys are stored locally in browser storage (encrypted by Firefox)
- Tab data is only sent to your chosen LLM provider
- No third-party tracking or data collection

## 📚 Documentation

- [Implementation Plan](./PLAN.md) - Detailed technical plan and architecture
- [Development Guide](./CLAUDE.md) - Developer guidelines and best practices
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview) - LLM abstraction library
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group) - Browser API reference
- [MDN WebExtensions Examples](https://github.com/mdn/webextensions-examples) - Official Firefox extension examples

## 📝 License

TBD

## 👨‍💻 Author

[bhanutejags](https://github.com/bhanutejags)
