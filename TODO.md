# TODO

Task tracking for Firefox Tab Organizer. See [docs/DESIGN.md](./docs/DESIGN.md) for completed work and architecture details.

---

## P0 - Critical (MVP Completion)

**Goal:** Complete end-to-end validation before v0.1.0 release

- [ ] **End-to-end testing with actual tab organization**
  - [ ] Test with 5-10 tabs (basic functionality)
  - [ ] Test with 30-50 tabs (typical user scenario)
  - [ ] Test with 100+ tabs (stress test, performance validation)
  - [ ] Verify Claude API provider works end-to-end
  - [ ] Verify AWS Bedrock provider works end-to-end (bearer token auth)
  - [ ] Verify OpenAI provider works end-to-end
  - [ ] Test custom prompts ("organize by project", "work vs personal", etc.)
  - [ ] Test error handling (API failures, invalid credentials, network issues)

---

## P1 - High Priority (Phase 1 Enhancements)

**Goal:** Improve reliability and user experience for v0.2.0

### Reliability

- [ ] **Improve JSON parsing reliability**
  - [ ] Handle LLM response variations (extra text, markdown formatting)
  - [ ] Add fallback parsing strategies if primary regex fails
  - [ ] Log parsing failures for debugging
  - [ ] Add retry with simplified prompt if parsing fails

- [ ] **Implement retry logic for API failures**
  - [ ] Exponential backoff for transient errors (429, 503, network timeouts)
  - [ ] User-facing retry button on failure
  - [ ] Persist failed requests for manual retry
  - [ ] Display clear error messages with troubleshooting hints

### User Experience

- [ ] **Add preview UI (show proposed groups before applying)**
  - [ ] Display LLM's proposed groups in modal/panel
  - [ ] Allow user to approve/reject before applying
  - [ ] Option to edit group names/colors before applying
  - [ ] "Apply" and "Cancel" buttons

- [ ] **Add loading states with animations**
  - [ ] Show spinner/progress indicator during LLM call
  - [ ] Display "Analyzing tabs..." status message
  - [ ] Disable "Organize" button during processing
  - [ ] Estimated time remaining (based on tab count)

- [ ] **Handle existing tab groups dialog**
  - [ ] Detect pre-existing tab groups in current window
  - [ ] Offer options: "Merge", "Replace", "Cancel"
  - [ ] Preserve existing groups if user chooses "Merge"
  - [ ] Warn user before destroying existing organization

- [ ] **Add keyboard shortcuts**
  - [ ] Configurable shortcut for "Organize Tabs" (e.g., Ctrl+Shift+O)
  - [ ] Register shortcuts in manifest.json with `commands` API
  - [ ] Add shortcuts documentation in options page

- [ ] **Prompt-based tab management**
  - [ ] Natural language queries: "show me all tabs about Python", "find shopping tabs"
  - [ ] Actions: "close all tabs related to X", "bookmark tabs matching Y"
  - [ ] LLM-powered tab search and filtering
  - [ ] Bulk actions on matched tabs (close, bookmark, move to group)
  - [ ] Query history and saved queries

### Performance

- [ ] **Optimize performance for 50+ tabs**
  - [ ] Profile LLM prompt size (title + URL length)
  - [ ] Truncate very long titles/URLs to fit token limits
  - [ ] Batch tab processing if count exceeds threshold
  - [ ] Consider streaming responses for large tab counts

---

## P2 - Future (Phase 2 Advanced Features)

**Goal:** Advanced capabilities for power users (v0.3.0+)

### Code Refactoring & Simplification

- [ ] **Remove Bedrock bearer token authentication (deferred from refactoring)**
  - Simplify to only use AWS SDK with temporary credentials (via sessionToken)
  - Already supports `awsSessionToken` for AWS STS temporary credentials
  - Migration path: Users should use `aws sts get-session-token` or AWS SSO
  - Estimated ~100 line reduction in bedrock-provider.ts
  - Document AWS temporary credentials usage in CLAUDE.md
  - Remove custom HTTP client (`callBedrockWithBearerToken`)
  - See `docs/REFACTORING_PLAN.md` for context

### Automation

- [ ] **Auto-organize on schedule**
  - [ ] Background job to organize tabs periodically (daily, weekly)
  - [ ] User-configurable schedule in options page
  - [ ] Opt-in feature with notifications
  - [ ] Alarm API for scheduled execution

### Intelligence

- [ ] **Pattern learning from user adjustments**
  - [ ] Track when user manually re-organizes tabs after AI suggestion
  - [ ] Store user preferences (preferred group names, color patterns)
  - [ ] Use historical patterns to improve future categorizations
  - [ ] Privacy-preserving local learning (no data sent to servers)

### Collaboration

- [ ] **Export/import grouping templates**
  - [ ] Save grouping rules as JSON templates
  - [ ] Import templates from file or URL
  - [ ] Share templates with team members
  - [ ] Template marketplace/gallery

### Multi-Window Support

- [ ] **Organize tabs across multiple windows**
  - [ ] Option to organize all windows or just current
  - [ ] Visual indicator showing which window each group will go to
  - [ ] Move tabs between windows as part of organization

### Conversational Refinement

- [ ] **Multi-turn conversation with LLM**
  - [ ] User provides feedback: "Too many groups", "Merge shopping and personal"
  - [ ] LLM refines categorization based on feedback
  - [ ] Iterative loop until user satisfied
  - [ ] Consider LangGraph.js for agent workflow

---

## Development Workflow

```bash
# Run tests (when implemented)
bun test

# Type checking
bun run type-check

# Linting
bun run lint

# Build and load in Firefox
bun run start
```

---

## Notes

- **MVP Status:** 95% complete (end-to-end testing in progress)
- **Last Updated:** 2025-10-25
- **See also:** [docs/DESIGN.md](./docs/DESIGN.md) for completed architecture and implementation details
