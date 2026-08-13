# Official course map - learn-agent-launch-with-phoebe

**Course question:** given all the eval numbers, *do you ship?* This is a launch-gate capstone, not a
metrics course. Metric depth is deliberately delegated to two live siblings.

**Verification date:** 2026-08-13. Fast-moving field - re-verify vendor docs and leaderboard numbers
before delivering. Benchmark SOTA figures in particular move monthly.

**Running case:** **Beacon**, a B2B SaaS company shipping three bots in one quarter:
- **Beacon Support Bot** - customer-facing support chatbot. Can issue refund credits, so **tier T3**.
- **Beacon Analyst Bot** - internal text-to-query bot over the warehouse. Read-only, **tier T1-T2**.
- **Beacon Insight Bot** - analytics bot writing insight summaries for executives. **Tier T2**.

Same eval discipline, three different gates. That contrast is the spine of the whole course.

---

## Positioning against siblings (state this explicitly on pages, do not re-teach)

| Sibling course | Owns | This course assumes it |
|---|---|---|
| `learn-ai-evals-with-phoebe` (ai, d3) | Retrieval + generation metrics, RAGAS, LLM-as-judge mechanics, tracing, drift | Yes - link for metric depth |
| `learn-model-evaluation-with-phoebe` (ds, d3) | Classic canon (precision/recall/ROC/calibration) + LLM-era metrics, Goodhart trap | Yes - link for metric depth |
| `learn-ai-agents-with-phoebe` (ai, d3) | What an agent is, tools, memory, planning, the seven guardrail types | Yes - link for agent architecture |

**This course owns:** the decision. Risk tiering, golden-set sizing math, the six-gate scorecard,
per-archetype criteria selection, staged rollout, and the sign-off you can defend in a room.

---

## Session map

### Leader track (6 x 45 min) - "Leader session N of 6"

| # | File | Title | Covers |
|---|---|---|---|
| a1 | `a1-why-bots-fail.html` | Why bots fail after launch | The eval gap; Klarna arc (launch claims then partial walk-back to hybrid); what a wrong launch costs; why "it demoed well" is not evidence |
| a2 | `a2-three-archetypes.html` | Three bot archetypes | The one-slide contrast table; what "good" honestly looks like per archetype; why 40-70% resolution is a normal support-bot number and 100% is a lie |
| a3 | `a3-reading-eval-reports.html` | How to read an eval report | Metric definition moves the number ~10x; the questions to grill a team with; spotting a cherry-picked set; internal-benchmark claims vs independent ones |
| a4 | `a4-what-90-percent-means.html` | What "90% confident" really means | **Wilson CI table (mount `data-mode="ci"`)**; three meanings of 90%; why n=20 proves nothing; the cluster-SE gotcha |
| a5 | `a5-risk-tiers-and-the-gate.html` | Risk tiers and the launch gate | T1-T4 table; the six gates; staged rollout ladder; who signs off; EU AI Act Art. 50 / Art. 6 / Art. 14; NIST AI RMF |
| a6 | `a6-after-launch.html` | After GA | Drift, rollback triggers, incident-to-eval loop, online eval cadence, ML Test Score as an ops rubric |

### Builder track (10 x 45 min) - "Builder session N of 10"

| # | File | Title | Covers |
|---|---|---|---|
| b1 | `b1-eval-anatomy.html` | Eval anatomy | **HAND-AUTHORED TEMPLATE.** Four parts; grading ladder; capability vs regression suites; golden-set skeleton |
| b2 | `b2-quality-metrics.html` | Quality metrics | Faithfulness/groundedness formulas, answer relevancy, hallucination rate; definition sensitivity |
| b3 | `b3-operational-metrics.html` | Operational metrics | TTFT/TPOT percentiles, p95/p99 discipline, cost per task, conciseness as UX *and* cost metric |
| b4 | `b4-llm-as-judge.html` | LLM-as-judge | Four biases; calibration vs 100+ human labels; position swapping; rubric design |
| b5 | `b5-gate-the-chatbot.html` | Gate the chatbot | Containment vs resolution; multi-turn drop; escalation correctness; **mount `data-bot="chatbot"`** |
| b6 | `b6-gate-the-text-to-sql-bot.html` | Gate the text-to-query bot | Execution accuracy vs exact match; schema-linking failures; abstention; read-only rails; **`data-bot="sql"`** |
| b7 | `b7-gate-the-analytics-bot.html` | Gate the analytics bot | Validity → legality → faithfulness cascade; numeric reproducibility; **`data-bot="analytics"`** |
| b8 | `b8-agent-trajectory-evals.html` | Agent-specific evals | Trajectory match modes; tool-call accuracy; **pass@k vs pass^k**; tau-bench |
| b9 | `b9-the-launch-gate.html` | The launch gate | **SIMULATOR SESSION.** Build Beacon's scorecard; **mount `data-mode="ladder"`** + all three bots |
| b10 | `b10-eval-in-production.html` | Eval as CI/CD and in production | Regression gates, canary golden set at 100%, online evals, refresh cadence, rollback |

---

## Verified facts (with sources) - use these, do not invent numbers

### Golden-set sizing - Wilson 95% CI at observed 90% (computed, verifiable in the simulator)

| n | 95% Wilson CI | Width | Claim |
|---|---|---|---|
| 20 | 69.9% - 97.2% | 27.3 pts | 18/20 is compatible with a truly 70% bot |
| 50 | 78.6% - 95.7% | 17.0 pts | cannot rule out below 80% |
| 100 | 82.6% - 94.5% | 11.9 pts | first defensible "high 80s or better" |
| 200 | 85.1% - 93.4% | 8.4 pts | can defend >=85% |
| 500 | 87.1% - 92.3% | 5.3 pts | ~4-pt regressions detectable |
| 1000 | 88.0% - 91.7% | 3.7 pts | "~90%, give or take 2" |
| 2000 | 88.6% - 91.2% | 2.6 pts | diminishing returns, width ~ 1/sqrt(n) |

Interval recommended over Wald by Brown, Cai & DasGupta (2001), *Statistical Science*:
https://projecteuclid.org/journals/statistical-science/volume-16/issue-2/Interval-Estimation-for-a-Binomial-Proportion/10.1214/ss/1009213286.full

Sample size for margin of error at p=0.9: ±10% → n≈35; ±5% → n≈138; ±3% → n≈384; ±2% → n≈864; ±1% → n≈3,457.

### Anthropic eval guidance
- "Adding Error Bars to Evals" (Evan Miller, Nov 2024) - https://arxiv.org/abs/2411.00640 ; summary
  https://www.anthropic.com/research/statistical-approach-to-model-evals . Five recommendations:
  report SEM, **cluster standard errors** ("clustered standard errors on popular evals can be over
  three times as large as naive standard errors"), resample per question, **paired differences**
  between versions, power analysis. **The cluster-SE point is the single best gotcha in the course**
  - a golden set of "10 questions per document x 20 documents" has a real CI up to ~3x wider.
- "Demystifying evals for AI agents" - https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
  Start with **20-50 tasks from real failures**; **capability evals** (start low, drive improvement)
  vs **regression evals** ("nearly 100% pass rate"); pass@k vs pass^k.
- Eval design guidance - https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests
  **"Prioritize volume over quality"**; grading hierarchy code/rule → embedding → LLM; use a
  *different* model as grader; define every scale point; force predictable output.

### pass@k vs pass^k (the production-reliability metric)
- pass@k = at least one of k trials succeeds = `1 - E[C(n-c,k)/C(n,k)]`
- **pass^k = ALL k trials succeed = `E[C(c,k)/C(n,k)]`** - the consistency metric.
- tau-bench (Sierra) - https://arxiv.org/abs/2406.12045 , https://github.com/sierra-research/tau-bench
  GPT-4o-class agents: <50% pass^1, and **pass^8 < 25% on retail**. Success measured by final
  **database state** matching goal state. tau2-bench adds dual-control + telecom.
- Teaching line: 0.75 per-trial reliability → 0.75^3 ≈ 42% over three trials. Capability is not reliability.

### LLM-as-judge
- Biases (Zheng et al., MT-Bench) - https://arxiv.org/abs/2306.05685 : **position, verbosity,
  self-enhancement**, weak math/reasoning grading. Mitigations *from the paper*: swap answer
  positions and keep only consistent verdicts; few-shot judge prompting; reference-guided grading.
- Same paper: GPT-4 judge reached **>80% agreement with human preferences, equal to human-human
  agreement** - the basis for "calibrate against a human-labelled slice".
- Practitioner canon (Hamel Husain & Shreya Shankar) - https://hamel.dev/blog/posts/evals-faq/ :
  review >=100 traces for error analysis; **100+ labelled examples to validate a judge**; a 100%
  pass rate means the eval is too easy.

### Metric formulas (b2 - state the formula, credit the source)
- **Faithfulness** (RAGAS) = supported claims / total claims -
  https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/
- **Response relevancy** (RAGAS) = mean cosine similarity of N reverse-engineered questions to the
  original, **N default 3** - https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/
- **Tool call accuracy** (RAGAS) = argument accuracy x sequence-aligned indicator -
  https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/
- **Tool Correctness** (DeepEval) = correctly used tools / total tools called -
  https://deepeval.com/docs/metrics-tool-correctness
- **Task Completion** (DeepEval) = AlignmentScore(task, outcome), threshold 0.5, referenceless -
  https://deepeval.com/docs/metrics-task-completion
- **Trajectory modes** (Vertex): exact match / in-order match (extras allowed) / any-order match /
  precision / recall / single-tool-use -
  https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-agents
- **Azure agent evaluators**: Intent Resolution, Task Adherence, Tool Call Accuracy, Task Navigation
  Efficiency (exact/in-order/any-order + P/R/F1). 1-5 scale thresholded, default threshold 3 -
  https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-evaluators/agent-evaluators
- **Bedrock RAG eval** adds **CitationPrecision + CitationCoverage** (use both) -
  https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-eval-llm-results.html

**Definition sensitivity (the b2 headline):** the same models score **0.7%-4.4%** hallucination on
Vectara HHEM but **7-12%** under stricter FaithJudge re-scoring - the metric definition moves the
number by roughly 10x. https://www.vectara.com/blog/introducing-the-next-generation-of-vectaras-hallucination-leaderboard
, https://arxiv.org/pdf/2410.13210

### Framework landscape (b1/b10 reference table)
| Tool | License | Agent support |
|---|---|---|
| RAGAS | Apache-2.0 | topic adherence, tool call accuracy, goal accuracy |
| DeepEval | Apache-2.0 (Confident AI = commercial) | trajectory + component metrics; pytest CI |
| promptfoo | MIT | assertions + red teaming; `repeat`/`repeat-min-pass` for flaky model-graded tests |
| LangSmith + agentevals | commercial + MIT libs | best trajectory tooling: strict/unordered/subset/superset |
| Arize Phoenix | **Elastic License 2.0** (not plain OSS) | OTel tracing, pre-tested evals with published benchmark targets |
| TruLens | MIT | RAG triad + 7 agentic evaluators |
| MLflow GenAI | Apache-2.0 | trace-based agent eval |
| Braintrust | commercial (autoevals OSS) | scorers, logging |
| Langfuse | **MIT except `ee/`** | judge, annotation queues, CI gating |

CI/CD: promptfoo non-zero exit + pass-rate threshold (docs example 95%) -
https://www.promptfoo.dev/docs/integrations/ci-cd/ ; DeepEval `assert_test()` -
https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd

### Per-archetype criteria (b5/b6/b7 + a2)

**Chatbot** - no ground truth, judged + outcome metrics.
- Containment rate: start 20-40%, mature 70-90%, well-configured RAG chatbot 40-65% (Gartner-attributed, secondary).
- **Intercom Fin resolution**: production range **38-72%**, ~67% average across 7,000+ customers /
  40M+ conversations (secondary claim). Definition is the artifact: hard resolution = explicit
  confirmation; soft = customer exits + 24h inactivity; **reversed if the customer returns to the
  thread**; greeting-only never counts. Billed **$0.99 per resolution**.
  https://fin.ai/help/en/articles/10772642-fin-ai-agent-resolutions
- Multi-turn is where single-turn evals lie: frontier models <50% on MultiChallenge, best 41.4%
  (https://arxiv.org/abs/2501.17399); average **39% performance drop** single-turn → multi-turn,
  driven by unreliability not aptitude (https://arxiv.org/abs/2505.06120).
- Latency: **p95 TTFT < 500ms** common interactive target; 200-500ms well-tuned; looser starting SLO
  p95 TTFT < 1s + p95 inter-token < 50ms. https://clickhouse.com/resources/engineering/llm-inference-latency
  , https://docs.anyscale.com/llm/serving/benchmarking/metrics

**Text-to-query** - executable ground truth.
- **Execution accuracy (EX)** is the metric; exact-set-match is deprecated (rejects valid alternative SQL).
- BIRD: SOTA test ~**81.95%**, **human performance 92.96%** - https://bird-bench.github.io/
- Spider 2.0 reality check: **o1-preview 17.0%** on enterprise workflows vs 91.2% on Spider 1.0 -
  https://spider2-sql.github.io/ . Top self-reported Snow entries (96%+) sit in tension with the
  annotation audit below - teach the skepticism.
- **Benchmarks are broken at the top**: audited gold-annotation error rates **52.8% (BIRD Mini-Dev)**
  and **62.8% (Spider 2.0-Snow)**; re-evaluating 16 agents on corrected data shifted scores -7% to
  +31% and rankings by up to 9 positions - https://arxiv.org/abs/2601.08778
- Schema linking dominates failures: **37% of BIRD errors** (plus 36% JOIN errors) per SEA-SQL
  (https://arxiv.org/pdf/2408.04919); **>60-68.3%** in large multi-database settings per LinkAlign
  (https://arxiv.org/pdf/2503.18596).
- Abstention: TrustSQL Reliability Score - models without abstention can score **negative** under
  high penalty - https://arxiv.org/abs/2403.15879
- Efficiency: BIRD's official **R-VES** weights execution accuracy by runtime ratio vs gold.
- Rails: Snowflake Cortex Analyst is **restricted to read-only** (SELECT/SHOW/DESCRIBE/EXPLAIN) -
  guardrail by construction - https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst
- **Snowflake's 90%+ claim** is on an internal 150-question benchmark, needed a semantic model +
  agentic retries + lenient multi-gold scoring; **single-shot GPT-4o scored 51%** on the same set -
  https://www.snowflake.com/en/blog/engineering/cortex-analyst-text-to-sql-accuracy-bi/

**Analytics bot** - pipeline of gates, errors compound.
- VisEval (Microsoft, IEEE VIS) - https://arxiv.org/abs/2407.00981 : GPT-4 invalid-code rate **3.29%
  with matplotlib but 25.41% with seaborn** (validity is library-dependent); **illegal rate 21.44%**
  even on matplotlib; overall GPT-4 pass rate **75.27%**, GPT-3.5 61.79%, Gemini-Pro 51.59%;
  readability 3.80/5. Cascade: validity → legality → readability.
- DABstep - https://arxiv.org/abs/2506.23719 : 450+ real analysis tasks, binary factoid scoring with
  format-tolerant matching. The cleanest pattern for numeric-correctness evals.
- InsightBench - https://arxiv.org/abs/2407.06423 : 100 end-to-end analytics cases, insight
  correctness judged against ground-truth insights.
- **Reproducibility**: temperature 0 does NOT guarantee determinism (GPU float non-associativity, MoE
  routing, batching); OpenAI's seed is best-effort; vLLM documents the same -
  https://docs.vllm.ai/en/v0.9.1/usage/reproducibility.html , https://arxiv.org/pdf/2408.04667
  Mitigation: push computation into deterministic SQL/pandas, keep the LLM to orchestration.

### Launch methodology (a5/a6/b10)
- **Google ML Test Score** (Breck et al., IEEE Big Data 2017) - 28 tests, 4 sections; **final score =
  minimum across sections**; (3,5] = "appropriate for mission-critical systems". **Infra 6**: canary
  before production. **Infra 7**: rollback is an emergency procedure, "operators should practice
  doing it". **Monitor 3** training/serving skew is "one of the least frequently implemented tests".
  In Google's own survey **no single test was implemented by more than 80% of teams**.
  https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/
- **Google SRE canarying** - one canary at a time, metrics split canary vs control, breach → halt or
  auto-rollback - https://sre.google/workbook/canarying-releases/
- **Microsoft HAX Toolkit** - 18 Guidelines for Human-AI Interaction; G8-G11 cover "when the AI is
  wrong" (efficient dismissal, correction, explain why, scope when in doubt) -
  https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/
- **OpenAI iterative deployment** - release gradually, pair with monitoring and the ability to pause
  or roll back, convert real failures into evals - https://openai.com/index/our-approach-to-ai-safety/
- **Anthropic RSP** as the product analog: tiered levels with **if-then commitments** - crossing a
  capability threshold triggers stronger safeguards *before* deployment -
  https://www.anthropic.com/news/anthropics-responsible-scaling-policy
- **NIST AI RMF 1.0** - GOVERN / MAP / MEASURE / MANAGE; **GenAI Profile AI 600-1** (Jul 2024) adds 12
  risk categories including **confabulation** and prompt injection -
  https://www.nist.gov/itl/ai-risk-management-framework
- **EU AI Act**: **Article 50 transparency applies from 2 August 2026 to any chatbot regardless of
  risk tier** - users must know they are interacting with AI, disclosure at first interaction
  (https://artificialintelligenceact.eu/article/50/). Article 6 / Annex III high-risk categories,
  with a narrow-procedural-task derogation but **profiling of natural persons is always high-risk**
  (https://artificialintelligenceact.eu/article/6/); Annex III timeline extended to Dec 2027, Art. 50
  was not deferred. Article 14 human oversight (https://artificialintelligenceact.eu/article/14/).
- **Azure AI Foundry observability** codifies offline-for-gating / online-for-monitoring, with
  continuous evaluation on sampled production traffic, scheduled evaluation for drift, and scheduled
  red teaming - https://learn.microsoft.com/en-us/azure/foundry/concepts/observability
- **Microsoft PyRIT**: thousands of adversarial prompts generated and auto-scored "in hours instead of
  weeks"; Bing Chat had hundreds of hours of expert red teaming pre-launch -
  https://www.microsoft.com/en-us/security/blog/2024/02/22/announcing-microsofts-open-automation-framework-to-red-team-generative-ai-systems/

### Risk tiers (a5 - synthesized from RSP if-then structure + EU tiers + NIST)
| Tier | Characteristics | Launch bar |
|---|---|---|
| T1 low | Read-only, informational, reversible, no decisions about people | n>=100, CI lower bound >= target-6 pts, standard canary |
| T2 medium | Writes data, sends messages, customer-facing commitments | n>=200-500 incl. adversarial slice; injection suite 100%; shadow mode before canary |
| T3 high | Financial or irreversible actions, regulated domains | n>=500-1000 per critical slice; **human approval on the action itself**; kill switch drilled |
| T4 no-autonomy | A single wrong action is catastrophic | Agent proposes, human executes. No autonomous path ships |

### Case studies with numbers
- **Klarna**: first month 2.3M conversations, two-thirds of support chats, work of 700 FTE agents,
  CSAT on par with humans, 25% drop in repeat inquiries, resolution time <2 min vs 11 min, projected
  $40M 2024 profit improvement (https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/
  , https://openai.com/index/klarna/). **Later partially walked back toward a human+AI hybrid** -
  teach both halves, the walk-back is the lesson.
- **Databricks AI/BI Genie** ships eval as product: "Genie Benchmarks" (curated question + expected-SQL
  sets run against your space, accuracy tracked over time) + "Ask for Review" end-user flagging -
  https://www.databricks.com/blog/aibi-genie-now-generally-available
- Cost anchors: Gartner-attributed median **$13.50 per US assisted-channel contact**; ~$0.50-0.70 per
  chatbot interaction; Fin **$0.99 per resolution**; Sierra ~$1.50 per resolution. Note the pricing
  model shift from per-interaction to **per-outcome** - it only works if you can measure the outcome.

---

## Honesty discipline (non-negotiable on every page)

1. **Label secondary claims.** The Fin 67% average, Gartner cost figures and Sierra pricing come via
   third parties. Snowflake's 90%+ is an internal, not independently verified, benchmark. Say so.
2. **The simulator is a teaching model; the statistics are real.** Every page mounting `gate-live.js`
   carries the honesty rail. Pass rates per question type are modelled. The Wilson interval is
   computed live in the browser and can be checked against the a4 table.
3. **Never present a benchmark number as a product guarantee.** Spider 2.0-Snow's 96%+ leaderboard
   entries and the 62.8% annotation-error audit of that same split are both true. Teach the tension.
4. **"Re-verify before delivery."** Leaderboards, vendor docs and the EU AI Act timeline all move.
   Every number on a page traces to a URL in this file, dated 2026-08-13.

## Not covered by design

- Metric derivations and the full metric zoo → `learn-ai-evals-with-phoebe`, `learn-model-evaluation-with-phoebe`
- Agent architecture, tools, memory, planning → `learn-ai-agents-with-phoebe`
- RAG retrieval tuning → `learn-rag-with-phoebe`
- Model training, fine-tuning, RLHF - out of scope entirely
- Legal advice. The EU AI Act and NIST material is orientation for engineers and leaders, not counsel.
