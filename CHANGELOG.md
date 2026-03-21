# **Changelog**

All notable changes to Skales will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v7.2.0 — "The Next Chapter" (March 2026)

### New Features
- **🌐 Built-in Browser (Beta):** AI-assisted web browsing inside a built-in webview. Navigate, scroll, click, extract content. DOM-to-Markdown extraction, cookie banner auto-accept, conversation log, session export as Markdown, browser history with persistence. Agentic loop supports multi-step commands (up to 10 turns).
- **🎨 4 Themes:** Skales (default, light/dark toggle, full sidebar), Obsidian (dark, top navigation bar), Snowfield (light, icon rail), Neon (dark vibrant, icon rail). ThemeProvider with CSS variables. User preference preserved across theme switches.
- **📊 Dashboard Builder:** Customizable dashboard with v7.1.0-style status cards (online, sessions, connections, personality), connections overview, memory word cloud, recent sessions, capabilities grid, quick actions. Optional widgets below (calendar, weather, buddy, email, tasks, plan, stats) — toggle on/off in edit mode. No drag-and-drop, clean CSS grid.
- **⚡ Always-On Agent (Beta):** Cron-based task scheduling with natural language or 5-field cron syntax. Add Job wizard, log viewer, API routes (CRUD + run + logs). Identity Maintenance protected from toggle deactivation via `isSystemJob` guard.
- **📞 Live Duplex Voice (Beta):** Real-time STT via Groq Whisper, OpenAI Whisper, Azure Speech. TTS via ElevenLabs, OpenAI TTS, Azure Speech. Voice Activity Detection (VAD) with WASM for hands-free conversations. Browser Web Speech API as fallback.
- **📱 PWA Mobile Access (Beta):** Progressive Web App with manifest.json, mobile-optimized page, Tailscale wizard with QR code, auto-detect Tailscale IP.
- **🤖 Agent Swarm (Alpha):** mDNS-based multi-instance discovery via bonjour-service. Agent sync routes (discover/status/task). Enable in Settings → Network.
- **📧 Newsletter:** Opt-in update notifications with explicit consent ("Save and agree" button). Email transmitted securely, only for updates. User can delete anytime. All 9 languages.
- **💬 Feedback System:** In-app bug reporting with status tracking. User sees own reports with status badges (Open / In Progress / Closed). Optional email field. Bug reports always saved locally AND sent to server.
- **✅ Apple Code Signing:** macOS builds signed with Developer ID Application: Mario Simic (Q5ASU2DB6P). No more Gatekeeper workarounds on most systems.
- **🔄 Ollama Offline Fallback:** Autonomous runner cascades Cloud → Ollama when cloud providers fail.
- **📁 File Watcher Triggers:** Event-driven task execution via `fs.watch` with debounce and glob matching.
- **📸 Screenshot Vision Fallback:** When DOM extraction returns minimal text (canvas apps, SPAs), auto-captures webview screenshot and sends as multimodal image to LLM.

### Bug Fixes
- **Ollama Connection:** Fixed `localhost` → `127.0.0.1` for IPv6 systems
- **Restart Button:** Properly kills server process (`stopServer()`) before `app.exit(0)`. Windows hide before restart to prevent white flash. Timeout fallback if server doesn't stop within 1.5s
- **Identity Maintenance:** Protected from Always-On toggle deactivation. `isSystemJob` filter ensures system jobs cannot be disabled by master toggle
- **Weather Widget:** Fixed encoding issue (`6\u00B0C` → `6°C`)
- **Browser Input:** Fixed black-on-black text in light mode via CSS variables
- **Dashboard:** Removed react-grid-layout, restored v7.1.0 layout structure with optional widgets below
- **Schedule Page:** Card widths normalized to `max-w-5xl`
- **Autopilot Marketing Leak:** Removed "Boost Skales' social media presence" auto-generated task
- **Linux Chromium:** Added installation hint when Chromium not detected
- **Newsletter Email:** Requires explicit "Save and agree" click. No auto-save on blur
- **Default Theme:** Set to Skales (was incorrectly defaulting to Obsidian after onboarding)
- **Chat Tool Messages:** Tool result messages now persisted to React state via `setMessages()`, preventing orphaned `tool_calls` in conversation history
- **Browser Tools:** Always available in `getAvailableTools()`, not behind settings gate
- **STT Transcription:** Removed OpenRouter from STT cascade (doesn't support audio transcription)
- **Bug Reports Visibility:** `saveLocally()` now always called, not just on remote failure
- **Null Safety:** Added guards for `.trim()` on null, `.slice()` on objects, temperature without null check, `enabledProviders.join()` on non-array, `event.start.dateTime` without optional chaining

### Improvements
- **9 Languages:** All locale files synced at 1732 keys each (EN, DE, ES, FR, RU, ZH, JA, KO, PT)
- **Social Links:** Footer across all pages
- **robots.txt and llms.txt:** Added for SEO and AI crawler guidance
- **Browser System Prompt:** Explicit instructions to report errors (login required, CAPTCHA, access denied) instead of silently stopping
- **Admin Dashboard v5:** Newsletter tab, feature adoption cards, bug report email display, CSV export for all tabs

### Platform
- Windows x64 (stable)
- macOS Apple Silicon (stable, **code signed**)
- macOS Intel (stable, **code signed**)
- Linux x64 AppImage (stable)

---

## v7.1.0 — "The Local AI Update" (March 2026)

### Bug Fixes
- **Telegram Approval Loop:** Fixed infinite loop where approving an action in Telegram
  triggered the same approval again. Approval responses now route correctly and don't
  trigger memory scans.
- **IPv6 localhost:** Fixed bot->server connection failure on systems where localhost
  resolves to ::1 instead of 127.0.0.1. All bot files now use 127.0.0.1 explicitly.
  (Thanks @bmp-jaller)
- **Think Tags:** Fixed <think> blocks leaking into chat responses from Qwen/DeepSeek
  models via KoboldCpp. Both <think> and <thinking> variants now stripped.
  (Thanks @henk717)
- **Desktop Buddy Approve:** Fixed approve button showing "cancelled" due to sandbox
  restrictions not being communicated. Input field no longer overlaps approval buttons.
- **Auto-Updater:** Honest message - "Download at skales.app" instead of false
  "will install automatically" claim.

### Improvements
- **Onboarding Renamed:** "Custom Endpoint" -> "OpenAI Compatible" (moved above Ollama).
  KoboldCpp, LM Studio, vLLM are now first-class options, not hidden under "Custom."
- **API Key Truly Optional:** Empty key = no auth header sent. Local AI servers
  that don't need authentication work without workarounds.
- **Local TTS Endpoint:** Voice settings now support local TTS servers (KoboldCpp,
  XTTS-API-Server). Not limited to cloud providers.
- **Local STT Endpoint:** Voice transcription can use local Whisper (KoboldCpp).
- **Local Image Generation:** Configurable image generation endpoint alongside Replicate.
- **Korean (한국어)** and **Portuguese (Português)** added by community contributors @SohaibKhaliq and @VladB-evs.
- **Buddy Redesign:** Speech bubbles redesigned with glassmorphism pills, smooth animations.

### Contributors
- @bmp-jaller - IPv6 localhost fix
- @henk717 - KoboldCpp feedback shaping the local AI experience
- @btafoya - Linux testing
- @SohaibKhaliq - Korean translation
- @VladB-evs - Portuguese translation

---

## v7.0.1 — Hotfix (March 2026)

### Bug Fixes
- **Telegram Bot:** Fixed bot process crash on end-user machines. Bot now uses Electron's built-in Node runtime (`fork()`) instead of requiring system Node.js installation (`spawn('node')`). Affects all platforms. Same fix applied to WhatsApp bot.
- **Chat Frozen:** Fixed chat becoming unresponsive after vision model error. Session history is now sanitized before every API call, preventing corrupted message blocks from breaking subsequent requests.
- **Streaming Timeout:** Added 60-second inactivity timeout to prevent chat UI from hanging permanently on broken API responses.
- **Vision Fallback:** When a model doesn't support vision, images are now stripped gracefully and the message is sent as text-only instead of corrupting the session.

---

## v7.0.0 - "The Foundation" (March 2026)

### New Features
- **Proactive Desktop Buddy** - Rule-based buddy intelligence observes calendar, email, tasks, and idle time. Meeting reminders, end-of-day summaries, idle check-ins, morning greetings. Respects quiet hours. No LLM calls.
- **Planner AI** - AI-powered daily scheduling. 8-step wizard learns work patterns, generates time-blocked plans from calendar events, pushes them back to your calendar. Chat integration: "plan my day."
- **Calendar Abstraction** - Google Calendar, Apple Calendar (CalDAV/iCloud), and Outlook (Microsoft Graph API). All three work simultaneously. Planner AI reads from all providers.
- **FTP/SFTP Deploy** - Upload Lio AI projects to any FTP server. Per-project deploy config, incremental upload (only changed files), test connection, 4 website starter templates.
- **9 Languages** - English, German, Spanish, French, Russian, Chinese (Simplified), Japanese, Korean, Portuguese. Full UI translation including onboarding.
- **Skales+ Tiers** - Free Forever / Personal ($9/mo) / Business ($29/mo) tier page with waitlist. All features free during beta.
- **Morning Briefing** - Daily digest of calendar events, pending tasks, unread emails, delivered via Telegram and chat.
- **File Sandbox** - Three modes: Unrestricted, Workspace Only, Custom Folders. Enforced on all file tools.
- **Redesigned Onboarding** - 7-step wizard with Cloud/Local/Custom provider cards, Ollama auto-detect, buddy picker, safety mode selection.
- **Model Auto-Fetch** - Real-time model lists from OpenAI, Google, OpenRouter APIs. No more hardcoded model IDs.
- **Linux Beta** - AppImage and .deb builds for x64 Linux.

### Improvements
- **Unified Notification Router** - All notifications go through one system. Quiet hours, per-type cooldowns, channel routing.
- **Settings Restructured** - 6 tabs replace the single long scroll.
- **Custom Endpoint Equality** - Vision toggle, TTS URL, configurable timeout. Local AI is a first-class citizen.
- **Ollama Revolution** - Auto-detect on startup, real model dropdown via /api/tags, localhost consistency, 5s ping timeout, CORS warning.

### Bug Fixes
- Email Bug 31: Agent respects "send from marketing@" instructions
- Buddy speech bubble height for approval dialogs
- Think/reasoning tags stripped from buddy bubble
- Email whitelist per-mailbox
- Custom endpoint timeout configurable (5-120s)
- Empty API key no longer sends blank auth header
- Dashboard notification channel fixed

---

## v6.2.0 - "The Telegram Fix" (March 2026)

### Critical Fixes
- Fixed: Endless Telegram approval loop — 9 tools missing from TOOL_SAFETY map
- Fixed: TOOL_SAFETY fallback changed from 'confirm' to 'auto'
- Fixed: Telegram session history now preserves tool results with orphan protection
- Fixed: Google Translate TTS hardcoded to German — now uses user's configured language

---

## v6.1.1 — Hotfix (March 2026)
- Fixed: Telemetry key mismatch
- Fixed: Feature Request textarea not editable
- Fixed: Skin/language change now prompts for restart with Electron relaunch support
- Fixed: Chat input focus lost after deleting chat
- Fixed: White screen on mobile Chrome tab switch via Tailscale

---

## v6.1.0 — "The Awakening" (March 2026)

### Autopilot — True Autonomous Agent
- Recurring Task Scheduling with cron jobs
- Live Execution View with real-time agent reasoning
- Automatic Daily Stand-up via Telegram
- Safe Mode: Approval Instead of Skip
- Telegram Approval for Autopilot tasks
- Accurate API Rate Limiter

### New Features
- Bubbles Mascot Skin
- Feedback & Rating System
- Admin Dashboard v3

---

## v6.0.0 - "The Living Agent" (March 2026)

### Highlights
- Full UI translation (4 → 9 languages)
- Replicate integration (BYOK)
- Custom OpenAI-compatible endpoint
- Skales+ tier page with waitlist
- Desktop Buddy with tool execution and approve/decline
- Anonymous telemetry opt-in
- Bug reporting system
- Approval system overhaul

---

## v5.5.0 (March 2026)

- Approval system enforcement
- Browser blacklist for Playwright
- ARIA labels and keyboard navigation
- Desktop Buddy friendly error messages
- Custom Skill IPC bridge

---

## v5.0.0 - "The Desktop Companion Update" (March 2026)

First public release. Desktop Buddy, Autopilot, Voice Chat, Custom Skills, Document Generation, Google Places, Network Scanner, DLNA Casting, and the full v5 stability pass.

---

## v4.0.0 - "The Desktop Edition" (February 2026)

Native Electron desktop app. Single-instance lock, smart port detection, launch at login, graceful shutdown, home directory data storage.

---

## v3.5.0 - "The Connections Update" (February 2026)

Twitter/X integration, Safety Mode, Telegram Vision fix.

---

## v3.0.0 - "The Power Update" (February 2026)

Lio AI Code Builder, Browser Control, Vision Provider, Auto-Update System.

---

## v2.0.0 (February 2026)

Message Queue, Google Calendar, Gmail, Bi-Temporal Memory, Telegram Admin, Killswitch, Group Chat, Execute Mode.

---

## v0.9.0 (February 2026)

Weather Tool, Image Generation, Video Generation, Skills Management, Persona System Overhaul.