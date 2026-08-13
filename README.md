<!-- phoebe header -->

[![Open the live course](https://img.shields.io/badge/%E2%96%B6%20open%20the%20live%20course-1f6feb?style=for-the-badge)](https://phoebefu6.github.io/learn-agent-launch-with-phoebe/)
[![Star this repo](https://img.shields.io/github/stars/phoebefu6/learn-agent-launch-with-phoebe?style=for-the-badge&label=star%20this%20repo&color=444444)](https://github.com/phoebefu6/learn-agent-launch-with-phoebe/stargazers)
[![Free courses](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fphoebefu6.github.io%2Flearn-with-phoebe%2Fstats.json&query=%24.courses_live&label=free%20courses&style=for-the-badge&color=111111)](https://phoebefu6.github.io/learn-with-phoebe/)

### ▶︎ [Open the live course →](https://phoebefu6.github.io/learn-agent-launch-with-phoebe/)

Free, runs in your browser. No install, no login.

> 📚 Part of **[Learn with Phoebe](https://phoebefu6.github.io/learn-with-phoebe/)** - free, hands-on courses on AI, data, and the craft around them. **[Browse every course ↗](https://phoebefu6.github.io/learn-with-phoebe/)**

<!-- /phoebe header -->
# learn-agent-launch-with-phoebe

**The launch gate for agentic AI and bots.** Given all the eval numbers, do you ship?

Live: https://phoebefu6.github.io/learn-agent-launch-with-phoebe/

Part of [Learn with Phoebe](https://phoebefu6.github.io/learn-with-phoebe/) - by Phoebe Fu.

---

## What this course is

Two tracks, 16 sessions of 45 minutes.

- **Leader track (6)** - for the people who sign off. Why bots fail after a good demo, what "good"
  honestly looks like per archetype, how to read an eval report, what "90% confident" really means,
  risk tiers and the gate, and life after GA.
- **Builder track (10)** - for AI engineers, ML engineers and technical PMs. Eval anatomy, quality
  and operational metrics, LLM-as-judge calibration, three full gating exercises (one per bot
  archetype), the launch scorecard, and eval wired into CI/CD and production.

Three real archetypes run end to end, all at one fictional company called Beacon:

| Bot | Ground truth | Headline metric | Signature failure |
|---|---|---|---|
| Support chatbot | none, judged | resolution rate | ungrounded confident answer |
| Text-to-query bot | executable | execution accuracy | schema-linking error |
| Analytics bot | mixed | task pass rate | legal-looking wrong chart |

## The live launch gate

`assets/gate-live.js` is an offline simulator that runs in the browser with no dependencies.
Pick an archetype, toggle levers, and watch the launch-confidence figure move.

**The statistics are real.** The confidence figure is the lower bound of a 95% Wilson score
interval computed live from the successes and n on screen - the interval Brown, Cai and DasGupta
(2001) recommend over the textbook Wald interval. The scripted ladder climbs 76.4% (the honest
reading of a nineteen-out-of-twenty demo) to 92.5%, and twice along the way nothing about the bot
changes at all.

**The bot is a teaching model.** The per-question-type pass rates are a stylised bot whose failure
modes match the ones the research documents. They are not measurements of any real product, and
every page that mounts the simulator says so.

## Sources

Every number, threshold and formula on these pages traces to a primary source listed with its URL
in [`materials/official-course-map.md`](materials/official-course-map.md), verified 2026-08-13.
Secondary and vendor-internal claims are labelled as such on the pages themselves. Benchmark SOTA
figures move monthly - re-verify before delivering the course.

## Neighbours, deliberately not duplicated

- [Learn Evals](https://phoebefu6.github.io/learn-ai-evals-with-phoebe/) - retrieval and generation metrics
- [Model Evaluation](https://phoebefu6.github.io/learn-model-evaluation-with-phoebe/) - the classic and LLM-era metric canon
- [AI Agents](https://phoebefu6.github.io/learn-ai-agents-with-phoebe/) - what an agent is and how to build one

This course owns the decision those three leave open.

## Running locally

No build step. Static HTML, CSS and vanilla JS.

```bash
python3 -m http.server 8000
```
