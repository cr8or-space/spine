# Research Documents

This folder contains early design explorations and brainstorming that informed the Spine Framework design.

**Note**: These documents are historical. For current framework goals and architecture, see:
- [docs/goals.md](../goals.md) — Authoritative framework objectives and LLM architecture
- [docs/framework/architecture.md](../framework/architecture.md) — Current package structure and abstractions
- [docs/plan.md](../plan.md) — Implementation roadmap

## Contents

### spine/
Early framework design explorations:
- `spine.md` — Initial framework concept and domain examples
- `spine.goals.md` — Earlier goals document (superseded by `docs/goals.md`)
- `spine.rational.md` — Design rationale for framework decisions
- `spine.frontends.md` — Potential future domains (TTRPG, courses, interactive fiction, etc.)

### programming/
Technical book domain research:
- `goals.md` — TechBook domain goals
- `rationale.md` — TechBook design rationale

## Key Changes Since These Documents

The main `docs/goals.md` now includes:
1. **LLM Architecture** — Three-level isolation (content generation, validation, interface)
2. **Human Authority** — Explicit principle that humans approve, LLMs suggest
3. **Context Assembly** — First-class concern for token efficiency
4. **Success Metrics** — Measurable goals for LLM acceptance and validation accuracy
