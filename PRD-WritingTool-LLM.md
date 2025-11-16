### Product Requirements Document (PRD) — T9‑Inspired Writing Tool (Pure On‑Device LLM via MLC WebLLM)

- Version: 1.0 (LLM‑only)
- Owner: You
- Platforms: Web (desktop + mobile PWA)
- Runtime: MLC WebLLM (WebGPU first; WASM fallback limited)

### Objectives
- Enable rapid text entry with a large text area and a T9‑style keypad.
- Use only an on‑device LLM to guess and rank candidate words from prior context and the current key sequence.
- Show the first suggestion within 100 ms p95 on modern devices; gracefully degrade on weaker hardware.

### Non‑Goals
- Cloud inference.
- Full physical keyboard IME beyond basic OS behavior.
- Multilingual beyond en‑US in v1 (architecture supports future locales).

### User Experience
- Selection is performed via the app’s blink‑based navigation (no tapping).
- Main screen
  - Large text area at the top (big text area) with caret and underline for the “active word,” where text is written.
  - Below: a 3×3 keypad with groups `abc2, def3, ghi4, jkl5, mno6, pqrs7, tuv8, wxyz9`, plus `space`, `delete`, `action`, `exit`.
  - Suggestion strip above keypad: Top 2-4 additional options (Top 1 is used in the textarea with an underline).
- Typing flow
  - User selects key groups via blink‑based navigation once per intended letter; multi‑tap disambiguation is not required.
  - As keys are pressed, the active word updates to the LLM’s best guess constrained by the key sequence.
  - `space`: commit best guess and insert a space. `delete`: remove last keypress; if none, backspace previous char/word. `action`: opens secondary screen with Save, Read Aloud, Back. All interactions occur through blink‑based selection.
  - Large, high‑contrast buttons, focus order, ARIA labels; optional audio feedback on commit.

### Core Functionality
- Key sequence mapping
  - Translate pressed keys into an array of per‑position allowed letter sets S = [S1, …, Sn]. Example for “hello”: [GHI][DEF][JKL][JKL][MNO].
- LLM‑based guessing
  - Use on‑device LLM to propose and rank candidate words consistent with the key sequence and recent context. Exact decoding approach is implementation‑defined (details to be covered in a later technical note).

### Technical Design
- Runtime: MLC WebLLM
  - Models: Start with small/mid models packaged by MLC (e.g., Llama‑3.2‑1B/3B‑Instruct or comparable). Provide a capability gate by device (WebGPU availability, memory).
  - Initialization: Lazy load on first interaction; show progress UI and allow keypress buffering; cache weights via Cache Storage.
- LLM prompt (verbatim example for implementation)

```text
You are a t9 word prediction engine, LLM-powered. You are given a sequence of key presses, with the letter in each key, and you must answer the top 6 guesses for the word the user tried to type. Example: [ghi][def][jkl][jkl][mno]. Answer: "hello, gekko, ..., ..., ..., ...". Example: [def][abc][tuv][ghi][def]. Answer: "David, ..., ..., ..., ..., ..." ("..." would be other top guesses). You are also given a few words preceding the current one, for context. Reply only with a comma-separated list of words. Don't say anything else. Your output will be given directly to the parser, which expects a comma-separated list of words.

Now, your task.
Previous text: can you 
Key presses: [ghi][ghi][tuv][def]
```
- Performance targets
  - Cold start load: <3 s on high‑end; <7 s on mid‑range (with progress + resume).
  - Warm inference: Top‑1 <120 ms p95; Top‑6 <180 ms p95.
  - Incremental per keypress update: <80 ms p95.

### Data & Privacy
- All inference and personalization are on‑device by default.

### Telemetry
— Removed in v1 (to be considered later, opt‑in only).

### API Between UI and Engine
- Engine interface (pseudo):
  - `engine.init(modelId, options)` → resolves when model is ready (stream progress).
  - `engine.updateKeySequence(sequence, contextText)` → `{ top1, alternatives, scores }` (debounced per keypress).
  - `engine.commit(word)` → updates personalization and returns next context state.
  - `engine.delete()` → updates sequence and returns new candidates.

### Milestones
— Removed for this doc (to be planned separately).

### Acceptance Criteria
- Top‑1 appears <120 ms p95 on a 2023+ mid‑range laptop/phone with WebGPU.
- Functional delete/backspace, space commit, suggestion taps, and action screen.
- Model weights cached; subsequent loads <1.5 s on the same device.
- All processing on‑device with no network calls during typing (other than initial weight fetch).

### Risks & Mitigations
— Removed for this doc (to be tracked in project planning).

### Future (Post‑v1)
- Multilingual packs; dynamic language switching.
- Phrase‑level predictions; punctuation auto‑insertion.
- Optional hybrid trie prefilter for speed; federated personalization.

### Later (Separate Spec)
- Personalization on device (frequency/recency counters, ranking blend).
- Edge handling and fallbacks (e.g., literal mode when no candidate is found).

