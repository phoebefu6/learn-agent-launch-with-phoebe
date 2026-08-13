/* gate-live.js - the launch gate: a go/no-go scorecard you can actually run.
   Usage:
     <div class="glbox" data-bot="chatbot"></div>              full gate board, bot preset
     <div class="glbox" data-bot="sql" data-levers="context,abstention"></div>
     <div class="glbox" data-mode="ladder"></div>              scripted rung-by-rung climb
     <div class="glbox" data-mode="ci"></div>                  the Wilson CI table, computed live

   data-bot    = chatbot | sql | analytics   (which archetype's golden set + SLOs)
   data-levers = which levers start ON (comma list, see LEVERS below)
   data-tier   = t1 | t2 | t3                (risk tier -> the quality bar: 80 / 85 / 90)

   HONESTY RAIL (also printed on every page that mounts this): the per-category pass rates
   below are a TEACHING MODEL - a stylised bot whose failure modes match the ones the research
   documents (schema-linking errors dominate text-to-SQL failures; ungrounded claims dominate
   chatbot failures; chart legality dominates analytics failures). They are not measurements of
   any real product. What is REAL and computed live in your browser is the statistics: the
   confidence meter is the lower bound of a 95% Wilson score interval on (successes, n), the
   interval recommended by Brown, Cai & DasGupta (2001) over the textbook Wald interval. Change
   n and watch the bound move exactly as the math says it must. That is the whole lesson: the
   number you may promise a launch committee is the LOWER BOUND, not the pass rate you observed.

   Sources for the shape of the model (linked from the sessions, not asserted as numbers here):
   Wilson/Brown-Cai-DasGupta interval; Anthropic "Adding Error Bars to Evals" (arXiv 2411.00640)
   on clustered SEs and paired comparison; tau-bench (arXiv 2406.12045) for pass^k; MT-Bench
   (arXiv 2306.05685) for judge verbosity/position bias. */
(function () {
  "use strict";

  var Z = 1.959964; /* 95% two-sided */

  /* ---------- the real math ---------- */
  function wilson(successes, n) {
    if (!n) return { lo: 0, hi: 0, p: 0 };
    var p = successes / n;
    var z2 = Z * Z;
    var denom = 1 + z2 / n;
    var centre = (p + z2 / (2 * n)) / denom;
    var half = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
    return { p: p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
  }

  /* ---------- levers ---------- */
  var LEVERS = [
    { key: "grounding", group: "system", label: "Cite-or-abstain grounding",
      hint: "Every factual sentence must trace to a retrieved passage; anything the model cannot cite, it does not say. This is the lever that moves groundedness/faithfulness - claims supported divided by claims made." },
    { key: "context", group: "system", label: "Retrieval / schema context",
      hint: "The bot gets what it needs to be right: conversation memory for a chatbot, linked schema + column descriptions for text-to-SQL, a data dictionary for an analytics bot. Schema-linking failures are the largest single error class in published text-to-SQL error taxonomies." },
    { key: "abstention", group: "system", label: "Abstention policy",
      hint: "The bot is allowed - and required - to say 'I cannot answer that from what I have' and hand off. Without it, every unanswerable question becomes a confident wrong answer. Scoring an eval set that contains no unanswerable questions hides this entirely." },
    { key: "rails", group: "system", label: "Action rails",
      hint: "Read-only database roles, row limits, injected-instruction filters, blocked destructive verbs. Guardrails by construction, not by hoping the model behaves. A rail is worth more than a metric: it removes the failure instead of measuring it." },
    { key: "verify", group: "system", label: "Output verification",
      hint: "Execute before you answer: dry-run the SQL, render the chart spec, recompute the number deterministically. Anything the machine can check, the machine should check - it is cheaper and stricter than a judge." },
    { key: "hitl", group: "system", label: "Human approval on irreversible actions",
      hint: "Draft-and-hold: the agent proposes, a person commits. The bar for autonomy rises with blast radius - this is the product translation of tiered if-then safety commitments." },
    { key: "perf", group: "system", label: "Latency + cost engineering",
      hint: "Caching, model routing (small model for easy turns), streaming, trimmed context. Every quality lever you switch on costs milliseconds and cents; this is the lever that pays for them." },

    { key: "representative", group: "eval", label: "Golden set sampled from real traffic",
      hint: "Off = the demo set: questions someone picked because the bot answers them well. On = questions sampled from what users actually ask, in the proportions they actually ask them. This single toggle is the difference between a score and a lie." },
    { key: "adversarial", group: "eval", label: "Adversarial + unanswerable slice",
      hint: "Prompt injections, out-of-scope questions, insufficient data, hostile inputs. You cannot pass a safety gate you never ran. Adding this slice will LOWER your observed pass rate - that is it working." },
    { key: "calibrated", group: "eval", label: "Judge calibrated vs human labels",
      hint: "An LLM judge validated against 100+ human-labelled examples, with position swapping and a rubric that defines every scale point. Uncalibrated judges inflate: verbosity bias alone marks long wrong answers as passes." },
    { key: "regression", group: "eval", label: "Regression suite + canary in CI",
      hint: "Past incidents become permanent tests that must pass at ~100%, wired into the pipeline so a prompt edit cannot silently undo a fix. Separate from the capability suite, which is allowed to fail." }
  ];

  var SIZES = [20, 100, 200, 500];

  /* ---------- the three archetypes ----------
     cat: share of the golden set, requires: levers needed to pass it,
     hit: pass rate when the required levers are ON, miss: pass rate when they are not.
     adv:1 marks a category that only enters the set when the adversarial slice is on. */
  var BOTS = {
    chatbot: {
      name: "Beacon Support Bot",
      what: "Customer-facing support chatbot over the help centre. Answers questions, escalates what it cannot resolve.",
      unit: "conversation",
      relevant: ["grounding", "context", "abstention", "rails", "hitl", "perf"],
      irrelevant: { verify: "Nothing to execute - a support answer has no result set to dry-run. Verification is a text-to-SQL and analytics lever." },
      slo: { ms: 800, msLabel: "p95 time-to-first-token", cost: 0.030, costLabel: "cost per conversation" },
      base: { ms: 620, cost: 0.021 },
      cats: [
        { id: "easy",    share: 0.30, requires: [],             hit: 0.99, miss: 0.99, label: "Straightforward help-centre question" },
        { id: "ground",  share: 0.20, requires: ["grounding"],  hit: 0.93, miss: 0.28, label: "Answer that must cite policy exactly" },
        { id: "multi",   share: 0.20, requires: ["context"],    hit: 0.88, miss: 0.34, label: "Multi-turn: refers back to earlier turns" },
        { id: "unans",   share: 0.15, requires: ["abstention"], hit: 0.95, miss: 0.10, label: "Outside the knowledge base - must escalate" },
        { id: "adv",     share: 0.15, requires: ["rails"],      hit: 0.97, miss: 0.15, adv: 1, label: "Prompt injection hidden in a pasted ticket" }
      ],
      failNote: {
        ground: "answered from memory instead of the policy page - fluent, confident, wrong version of the refund window",
        multi: "lost the order number from turn 2 and asked for it again, twice",
        unans: "invented a policy that does not exist rather than saying it did not know",
        adv: "followed an instruction pasted inside a customer ticket and revealed another account's details"
      }
    },
    sql: {
      name: "Beacon Analyst Bot",
      what: "Text-to-query bot over the warehouse. Analysts ask in English, it writes and runs SQL.",
      unit: "query",
      relevant: ["context", "abstention", "rails", "verify", "perf"],
      irrelevant: { grounding: "There is no passage to cite - correctness here is settled by executing the query, not by grounding prose. Groundedness is a chatbot and analytics-narrative lever.", hitl: "Read-only queries are reversible by definition; approval gates belong on bots that write." },
      slo: { ms: 3000, msLabel: "p95 end-to-end (includes query execution)", cost: 0.060, costLabel: "cost per query" },
      base: { ms: 2400, cost: 0.043 },
      cats: [
        { id: "simple",  share: 0.25, requires: [],             hit: 0.98, miss: 0.98, label: "Single-table filter and aggregate" },
        { id: "join",    share: 0.25, requires: ["context"],    hit: 0.90, miss: 0.31, label: "Multi-table join, needs schema linking" },
        { id: "ambig",   share: 0.15, requires: ["abstention"], hit: 0.94, miss: 0.12, label: "Under-specified question - 'best' is undefined" },
        { id: "exec",    share: 0.10, requires: ["verify"],     hit: 0.95, miss: 0.44, label: "Runs, returns rows, silently wrong filter" },
        { id: "scan",    share: 0.10, requires: ["rails"],      hit: 0.96, miss: 0.20, label: "Correct answer via a full-table scan" },
        { id: "ddl",     share: 0.15, requires: ["rails"],      hit: 0.98, miss: 0.05, adv: 1, label: "Question engineered to emit a DROP" }
      ],
      failNote: {
        join: "joined orders to customers on the wrong key and reported 3.1x the real revenue",
        ambig: "picked its own definition of 'top customer' and never said which one",
        exec: "returned rows for last month instead of last complete month - plausible, unflagged, wrong",
        scan: "the number was right; the query scanned 4.2TB and cost more than the analyst's afternoon",
        ddl: "generated a statement that would have dropped a staging table"
      }
    },
    analytics: {
      name: "Beacon Insight Bot",
      what: "Analytics bot for executives. Takes a question, queries, computes, charts, and writes the takeaway.",
      unit: "analysis",
      relevant: ["grounding", "context", "abstention", "rails", "verify", "perf"],
      irrelevant: { hitl: "Reading a chart is reversible. Add this lever back the moment the bot is allowed to send the chart to the board deck by itself." },
      slo: { ms: 6000, msLabel: "p95 end-to-end (query + compute + chart)", cost: 0.250, costLabel: "cost per analysis" },
      base: { ms: 5200, cost: 0.180 },
      cats: [
        { id: "factoid", share: 0.25, requires: [],             hit: 0.97, miss: 0.97, label: "Single number, one source table" },
        { id: "chart",   share: 0.20, requires: ["verify"],     hit: 0.93, miss: 0.42, label: "Chart renders but must encode the right thing" },
        { id: "steps",   share: 0.15, requires: ["context"],    hit: 0.90, miss: 0.36, label: "Multi-step: cohort, then rate, then trend" },
        { id: "insuff",  share: 0.15, requires: ["abstention"], hit: 0.95, miss: 0.08, label: "Three data points - not enough for a trend" },
        { id: "narr",    share: 0.10, requires: ["grounding"],  hit: 0.92, miss: 0.30, label: "Written takeaway must follow from the numbers" },
        { id: "poison",  share: 0.15, requires: ["rails"],      hit: 0.96, miss: 0.10, adv: 1, label: "Instruction text sitting in a data cell" }
      ],
      failNote: {
        chart: "drew a legal-looking line chart of a categorical breakdown, with the axis unsorted",
        steps: "computed the rate on the wrong denominator at step two and carried it through",
        insuff: "called three points a trend and put an arrow on it",
        narr: "the chart showed a 4% dip; the takeaway said 'sharp decline driven by pricing' - nothing in the data said pricing",
        poison: "read an instruction out of a spreadsheet cell and included it as a finding"
      }
    }
  };

  /* how much each system lever costs in latency and money, before the perf lever pays it back */
  var COSTS = {
    chatbot:   { grounding: [180, 0.006], context: [140, 0.005], abstention: [30, 0.001], rails: [90, 0.002], verify: [160, 0.004], hitl: [0, 0], perfMs: 0.45, perfCost: 0.55 },
    sql:       { grounding: [150, 0.004], context: [420, 0.011], abstention: [40, 0.001], rails: [110, 0.002], verify: [900, 0.009], hitl: [0, 0], perfMs: 0.50, perfCost: 0.60 },
    analytics: { grounding: [300, 0.020], context: [600, 0.035], abstention: [50, 0.002], rails: [150, 0.008], verify: [1600, 0.055], hitl: [0, 0], perfMs: 0.50, perfCost: 0.55 }
  };

  var TIERS = {
    t1: { bar: 0.80, name: "T1 - low", note: "Read-only, informational, reversible. No decisions about people." },
    t2: { bar: 0.85, name: "T2 - medium", note: "Writes data, sends messages, makes customer-facing commitments." },
    t3: { bar: 0.90, name: "T3 - high", note: "Financial or irreversible actions, or a regulated domain. Human approval on the action itself." }
  };

  var JUDGE_INFLATE = 0.45; /* share of true failures an uncalibrated judge waves through */

  /* ---------- scoring ---------- */
  function score(botKey, on, n, tierKey) {
    var bot = BOTS[botKey];
    var tier = TIERS[tierKey] || TIERS.t2;
    var advOn = !!on.adversarial;

    /* build the active distribution */
    var cats = bot.cats.filter(function (c) { return !c.adv || advOn; });
    var dropped = bot.cats.filter(function (c) { return c.adv && !advOn; });
    var spill = dropped.reduce(function (a, c) { return a + c.share; }, 0);
    var dist = cats.map(function (c) {
      var share = c.share + (c.id === "easy" || c.id === "simple" || c.id === "factoid" ? spill : 0);
      return { cat: c, share: share };
    });

    /* the demo set: 90% easy, the rest sprinkled - what a cherry-picked eval set looks like */
    if (!on.representative) {
      var others = dist.filter(function (d) { return d.cat.requires.length; });
      var each = others.length ? 0.10 / others.length : 0;
      dist = dist.map(function (d) {
        return { cat: d.cat, share: d.cat.requires.length ? each : 0.90 };
      });
    }

    /* true pass rate = share-weighted category outcomes */
    var truth = 0, weak = [];
    dist.forEach(function (d) {
      var met = d.cat.requires.every(function (k) { return on[k]; });
      truth += d.share * (met ? d.cat.hit : d.cat.miss);
      if (!met && d.share > 0.02) weak.push(d.cat.id);
    });

    /* an uncalibrated judge waves through a share of the real failures */
    var observed = on.calibrated ? truth : truth + (1 - truth) * JUDGE_INFLATE;
    var successes = Math.round(n * observed);
    var ci = wilson(successes, n);

    /* latency + cost */
    var c = COSTS[botKey];
    var ms = bot.base.ms, cost = bot.base.cost;
    ["grounding", "context", "abstention", "rails", "verify", "hitl"].forEach(function (k) {
      if (on[k] && c[k]) { ms += c[k][0]; cost += c[k][1]; }
    });
    if (on.perf) { ms = Math.round(ms * c.perfMs); cost = cost * c.perfCost; }

    /* the six gates */
    var gates = [
      { key: "quality", label: "Quality",
        pass: on.representative && on.calibrated && ci.lo >= tier.bar,
        detail: "95% CI lower bound " + pct(ci.lo) + " vs " + pct(tier.bar) + " bar",
        why: !on.representative ? "Golden set is hand-picked, so the pass rate measures the demo, not the bot."
           : !on.calibrated ? "Judge has never been checked against human labels, so the pass rate is the judge's opinion of itself."
           : ci.lo >= tier.bar ? "Defensible: true task success is at least " + pct(ci.lo) + ", with 95% confidence."
           : "Observed " + pct(observed) + " on n=" + n + " only proves " + pct(ci.lo) + ". Fix the bot, or grow the set, or both." },
      { key: "safety", label: "Safety",
        pass: !!(on.rails && on.adversarial),
        detail: on.adversarial ? (on.rails ? "adversarial slice run, rails on" : "adversarial slice run, rails OFF") : "adversarial slice never run",
        why: !on.adversarial ? "You cannot pass a gate you never ran. Injections and out-of-scope questions are not in the set."
           : !on.rails ? "The slice ran and the bot failed it. Rails are the fix - filters and least-privilege roles, not a better prompt."
           : "Adversarial slice included and held." },
      { key: "perf", label: "Performance",
        pass: ms <= bot.slo.ms,
        detail: fmtMs(ms) + " vs " + fmtMs(bot.slo.ms) + " SLO",
        why: ms <= bot.slo.ms ? "Within the latency SLO at p95 - the percentile your unhappiest users live in."
           : "Every quality lever costs milliseconds. This is what they add up to without latency engineering." },
      { key: "cost", label: "Cost",
        pass: cost <= bot.slo.cost,
        detail: fmtCost(cost) + " vs " + fmtCost(bot.slo.cost) + " budget per " + bot.unit,
        why: cost <= bot.slo.cost ? "Inside budget per " + bot.unit + "."
           : "Correct and unaffordable is still a no-go. Route easy turns to a smaller model and cache." },
      { key: "hitl", label: "UX + human oversight",
        pass: !!(on.abstention && (on.hitl || !needsHitl(botKey))),
        detail: (on.abstention ? "abstention path on" : "no abstention path") + (needsHitl(botKey) ? (on.hitl ? ", approval on irreversible actions" : ", no approval gate") : ", no irreversible actions"),
        why: !on.abstention ? "A bot with no way to say 'I do not know' has no way to be honest."
           : (needsHitl(botKey) && !on.hitl) ? "This bot can take an action a user cannot undo. Draft-and-hold, or do not ship that action."
           : "Users can tell when it is unsure, and nothing irreversible happens unattended." },
      { key: "ops", label: "Ops readiness",
        pass: !!on.regression,
        detail: on.regression ? "regression suite + canary wired to CI" : "no regression gate",
        why: on.regression ? "Every past incident is a test that must keep passing. Rollback is rehearsed, not improvised."
           : "Without a regression gate, the next prompt edit quietly re-opens a bug you already paid for." }
    ];

    return { bot: bot, tier: tier, truth: truth, observed: observed, successes: successes, n: n,
             ci: ci, ms: ms, cost: cost, gates: gates, weak: weak,
             green: gates.every(function (g) { return g.pass; }) };
  }

  function needsHitl(botKey) { return botKey === "chatbot"; }

  /* ---------- formatting ---------- */
  function pct(x) { return (x * 100).toFixed(1) + "%"; }
  function pct0(x) { return Math.round(x * 100) + "%"; }
  function fmtMs(ms) { return ms >= 1000 ? (ms / 1000).toFixed(2) + "s" : Math.round(ms) + "ms"; }
  function fmtCost(c) { return "$" + (c < 0.1 ? c.toFixed(3) : c.toFixed(2)); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  /* ---------- styles (scoped, injected once) ---------- */
  var CSS = [
    ".glbox{border:1px solid var(--hairline);border-radius:var(--radius);background:#fff;padding:1.25rem 1.25rem 1.4rem;margin:1.5rem 0;}",
    ".gl-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:baseline;justify-content:space-between;margin-bottom:.2rem;}",
    ".gl-bot{font-weight:800;font-size:1.02rem;color:var(--indigo);letter-spacing:-.01em;}",
    ".gl-what{color:var(--muted);font-size:.86rem;line-height:1.6;margin:.15rem 0 1rem;}",
    ".gl-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:1.3rem;}",
    "@media(max-width:820px){.gl-cols{grid-template-columns:1fr;}}",
    ".gl-sub{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--muted);margin:.9rem 0 .5rem;}",
    ".gl-sub:first-child{margin-top:0;}",
    ".gl-lev{display:flex;gap:.6rem;align-items:flex-start;padding:.42rem .55rem;border-radius:9px;cursor:pointer;transition:background .12s;}",
    ".gl-lev:hover{background:var(--indigo-50);}",
    ".gl-lev input{margin-top:.32rem;accent-color:var(--indigo);flex:0 0 auto;width:15px;height:15px;cursor:pointer;}",
    ".gl-lev-t{font-size:.87rem;font-weight:650;line-height:1.45;}",
    ".gl-lev-h{font-size:.79rem;color:var(--muted);line-height:1.6;margin-top:.12rem;display:none;}",
    ".gl-lev.open .gl-lev-h{display:block;}",
    ".gl-lev.dim{opacity:.5;}",
    ".gl-lev.dim .gl-lev-t::after{content:' - not a gate for this bot';font-weight:500;color:var(--muted);font-size:.78rem;}",
    ".gl-nrow{display:flex;gap:.4rem;flex-wrap:wrap;margin:.3rem 0 .2rem;}",
    ".gl-n{border:1px solid var(--hairline);background:#fff;border-radius:999px;padding:.28rem .78rem;font:inherit;font-size:.83rem;font-weight:650;cursor:pointer;color:var(--muted);}",
    ".gl-n.on{background:var(--indigo);border-color:var(--indigo);color:#fff;}",
    ".gl-meter{border:1px solid var(--hairline);border-radius:12px;padding:.9rem 1rem 1rem;background:var(--indigo-50);}",
    ".gl-mtop{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;}",
    ".gl-mlab{font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-weight:700;color:var(--indigo);}",
    ".gl-mbig{font-size:2.5rem;font-weight:800;line-height:1;letter-spacing:-.03em;color:var(--indigo);font-variant-numeric:tabular-nums;}",
    ".gl-mbig.bad{color:#991B1B;}",
    ".gl-track{position:relative;height:14px;border-radius:999px;background:#fff;border:1px solid var(--hairline);margin:.7rem 0 .4rem;overflow:hidden;}",
    ".gl-obs{position:absolute;left:0;top:0;bottom:0;background:var(--indigo-soft);}",
    ".gl-lo{position:absolute;left:0;top:0;bottom:0;background:var(--indigo);}",
    ".gl-bar{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--amber);}",
    ".gl-mnote{font-size:.79rem;color:var(--muted);line-height:1.6;}",
    ".gl-mnote b{color:var(--ink);}",
    ".gl-gates{margin-top:.9rem;border:1px solid var(--hairline);border-radius:12px;overflow:hidden;}",
    ".gl-g{display:flex;gap:.7rem;align-items:flex-start;padding:.6rem .8rem;border-top:1px solid var(--hairline);}",
    ".gl-g:first-child{border-top:0;}",
    ".gl-dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%;margin-top:.42rem;}",
    ".gl-g.pass .gl-dot{background:#067647;}",
    ".gl-g.fail .gl-dot{background:#991B1B;}",
    ".gl-g.fail{background:#FEF2F2;}",
    ".gl-gl{font-size:.85rem;font-weight:700;}",
    ".gl-gd{font-size:.79rem;color:var(--muted);font-variant-numeric:tabular-nums;}",
    ".gl-gw{font-size:.79rem;color:var(--muted);line-height:1.6;margin-top:.15rem;}",
    ".gl-ship{margin-top:.9rem;display:flex;gap:.7rem;align-items:center;flex-wrap:wrap;}",
    ".gl-shipbtn{font:inherit;font-size:.9rem;font-weight:750;padding:.6rem 1.4rem;border-radius:999px;border:0;cursor:pointer;background:var(--indigo);color:#fff;}",
    ".gl-shipbtn.locked{background:var(--faint);color:#fff;}",
    ".gl-reset{font:inherit;font-size:.83rem;font-weight:600;padding:.5rem .9rem;border-radius:999px;border:1px solid var(--hairline);background:#fff;color:var(--muted);cursor:pointer;}",
    ".gl-out{margin-top:.85rem;border-radius:12px;padding:.85rem 1rem;font-size:.85rem;line-height:1.7;}",
    ".gl-out.ok{background:#EDF6F0;border:1px solid var(--indigo-soft);}",
    ".gl-out.bad{background:#FEF2F2;border:1px solid #FCA5A5;}",
    ".gl-out h4{font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;margin-bottom:.35rem;}",
    ".gl-out.ok h4{color:var(--indigo);}",
    ".gl-out.bad h4{color:#991B1B;}",
    ".gl-out ul{margin:.35rem 0 0 1.1rem;}",
    ".gl-out li{margin:.2rem 0;}",
    ".gl-rail{margin-top:.9rem;font-size:.77rem;color:var(--muted);line-height:1.65;border-top:1px dashed var(--hairline);padding-top:.7rem;}",
    ".gl-ci{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums;}",
    ".gl-ci th{text-align:left;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:.45rem .5rem;border-bottom:2px solid var(--hairline);}",
    ".gl-ci td{padding:.45rem .5rem;border-bottom:1px solid var(--hairline);}",
    ".gl-ci tr.hi td{background:var(--amber-50);font-weight:650;}",
    ".gl-ci .w{color:var(--indigo);font-weight:700;}",
    ".gl-lad{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem;}",
    ".gl-ladb{font:inherit;font-size:.8rem;font-weight:650;padding:.32rem .7rem;border-radius:999px;border:1px solid var(--hairline);background:#fff;color:var(--muted);cursor:pointer;}",
    ".gl-ladb.on{background:var(--amber);border-color:var(--amber);color:#fff;}",
    ".gl-ladsay{font-size:.88rem;line-height:1.7;background:var(--amber-50);border-left:3px solid var(--amber);padding:.6rem .85rem;border-radius:0 9px 9px 0;margin-bottom:.9rem;}"
  ].join("");

  function injectCss() {
    if (document.getElementById("gl-css")) return;
    var s = document.createElement("style");
    s.id = "gl-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- render: the gate board ---------- */
  function render(box, botKey, on, n, tierKey, opts) {
    opts = opts || {};
    box.innerHTML = "";
    var r = score(botKey, on, n, tierKey);

    var head = el("div", "gl-head");
    head.appendChild(el("span", "gl-bot", r.bot.name));
    head.appendChild(el("span", "gl-gd", r.tier.name + " - bar " + pct0(r.tier.bar)));
    box.appendChild(head);
    box.appendChild(el("p", "gl-what", r.bot.what));

    var cols = el("div", "gl-cols");

    /* left: levers */
    var left = el("div", "");
    left.appendChild(el("div", "gl-sub", "The bot"));
    LEVERS.filter(function (l) { return l.group === "system"; }).forEach(function (l) {
      left.appendChild(leverRow(l, botKey, on, opts, box, n, tierKey));
    });
    left.appendChild(el("div", "gl-sub", "The evaluation"));
    LEVERS.filter(function (l) { return l.group === "eval"; }).forEach(function (l) {
      left.appendChild(leverRow(l, botKey, on, opts, box, n, tierKey));
    });
    left.appendChild(el("div", "gl-sub", "Golden set size"));
    var nrow = el("div", "gl-nrow");
    SIZES.forEach(function (s) {
      var b = el("button", "gl-n" + (s === n ? " on" : ""), "n = " + s);
      b.type = "button";
      if (!opts.scripted) b.onclick = function () { render(box, botKey, on, s, tierKey, opts); };
      else b.disabled = true;
      nrow.appendChild(b);
    });
    left.appendChild(nrow);
    cols.appendChild(left);

    /* right: meter + gates */
    var right = el("div", "");
    var meter = el("div", "gl-meter");
    var mtop = el("div", "gl-mtop");
    mtop.appendChild(el("span", "gl-mlab", "Launch confidence"));
    mtop.appendChild(el("span", "gl-gd", r.successes + " / " + r.n + " passed"));
    meter.appendChild(mtop);
    var big = el("div", "gl-mbig" + (r.ci.lo < r.tier.bar ? " bad" : ""), pct(r.ci.lo));
    meter.appendChild(big);

    var track = el("div", "gl-track");
    var obs = el("div", "gl-obs"); obs.style.width = (r.observed * 100) + "%";
    var lo = el("div", "gl-lo"); lo.style.width = (r.ci.lo * 100) + "%";
    var bar = el("div", "gl-bar"); bar.style.left = "calc(" + (r.tier.bar * 100) + "% - 1px)";
    track.appendChild(obs); track.appendChild(lo); track.appendChild(bar);
    meter.appendChild(track);

    var note = el("p", "gl-mnote");
    note.innerHTML = "Observed pass rate <b>" + pct(r.observed) + "</b> on n=" + r.n +
      ". The 95% Wilson interval is <b>" + pct(r.ci.lo) + " to " + pct(r.ci.hi) + "</b>" +
      ", so the most you may promise is the lower bound. The amber line is the " + r.tier.name.split(" ")[0] + " bar at " + pct0(r.tier.bar) + "." +
      (on.calibrated ? "" : " <b>The judge is uncalibrated</b>, so even the observed rate is flattering.");
    meter.appendChild(note);
    right.appendChild(meter);

    var gl = el("div", "gl-gates");
    r.gates.forEach(function (g) {
      var row = el("div", "gl-g " + (g.pass ? "pass" : "fail"));
      row.appendChild(el("span", "gl-dot"));
      var body = el("div", "");
      var t = el("div", "");
      t.appendChild(el("span", "gl-gl", g.label + " "));
      t.appendChild(el("span", "gl-gd", g.detail));
      body.appendChild(t);
      body.appendChild(el("div", "gl-gw", g.why));
      row.appendChild(body);
      gl.appendChild(row);
    });
    right.appendChild(gl);

    if (!opts.scripted) {
      var ship = el("div", "gl-ship");
      var sb = el("button", "gl-shipbtn" + (r.green ? "" : " locked"), r.green ? "Ship it" : "Ship anyway");
      sb.type = "button";
      var outHost = el("div", "");
      sb.onclick = function () { outHost.innerHTML = ""; outHost.appendChild(shipCard(r, botKey, on)); };
      ship.appendChild(sb);
      var rb = el("button", "gl-reset", "Reset");
      rb.type = "button";
      rb.onclick = function () { render(box, botKey, {}, 20, tierKey, opts); };
      ship.appendChild(rb);
      right.appendChild(ship);
      right.appendChild(outHost);
    }
    cols.appendChild(right);
    box.appendChild(cols);

    box.appendChild(el("p", "gl-rail",
      "Honesty rail: the pass rates per question type are a teaching model of a bot with realistic failure modes - not a measurement of any real product. The statistics are real and computed in your browser: the confidence figure is the lower bound of a 95% Wilson score interval on " +
      r.successes + " successes out of " + r.n + ". Change n and check it against the table in Leader session 4."));
    return r;
  }

  function leverRow(l, botKey, on, opts, box, n, tierKey) {
    var bot = BOTS[botKey];
    var irrelevant = bot.irrelevant && bot.irrelevant[l.key];
    var row = el("label", "gl-lev" + (irrelevant ? " dim" : ""));
    var cb = el("input", "");
    cb.type = "checkbox";
    cb.checked = !!on[l.key];
    if (opts.scripted) cb.disabled = true;
    else cb.onchange = function () { on[l.key] = cb.checked; render(box, botKey, on, n, tierKey, opts); };
    row.appendChild(cb);
    var body = el("div", "");
    body.appendChild(el("div", "gl-lev-t", l.label));
    body.appendChild(el("div", "gl-lev-h", irrelevant ? irrelevant : l.hint));
    row.appendChild(body);
    row.onmouseenter = function () { row.classList.add("open"); };
    row.onmouseleave = function () { row.classList.remove("open"); };
    return row;
  }

  function shipCard(r, botKey, on) {
    var out = el("div", "gl-out " + (r.green ? "ok" : "bad"));
    if (r.green) {
      out.appendChild(el("h4", "", "Launched - and defensible"));
      var p = el("p", "");
      p.innerHTML = "Six gates green on n=" + r.n + ". The claim you can put in writing: <b>true task success is at least " +
        pct(r.ci.lo) + ", with 95% confidence</b>, on a golden set sampled from real traffic including an adversarial slice, scored by a judge calibrated against human labels. " +
        fmtMs(r.ms) + " at p95, " + fmtCost(r.cost) + " per " + r.bot.unit + ". Now go set the rollback trigger, because this number is a snapshot and the world moves.";
      out.appendChild(p);
      return out;
    }
    out.appendChild(el("h4", "", "Shipped without the gates - what the first week looked like"));
    var reds = r.gates.filter(function (g) { return !g.pass; });
    var lead = el("p", "");
    lead.innerHTML = reds.length + " gate" + (reds.length > 1 ? "s were" : " was") + " red. In production that reads as:";
    out.appendChild(lead);
    var ul = el("ul", "");
    var notes = r.bot.failNote;
    r.weak.forEach(function (id) {
      if (notes[id]) ul.appendChild(el("li", "", notes[id]));
    });
    reds.forEach(function (g) {
      if (g.key === "perf") ul.appendChild(el("li", "", "users watched a spinner for " + fmtMs(r.ms) + " at p95 and stopped asking"));
      if (g.key === "cost") ul.appendChild(el("li", "", "finance saw " + fmtCost(r.cost) + " per " + r.bot.unit + " against a " + fmtCost(r.bot.slo.cost) + " budget and paused the rollout"));
      if (g.key === "ops") ul.appendChild(el("li", "", "a prompt edit in week two silently re-opened a bug fixed in week one - nobody had a regression gate to catch it"));
      if (g.key === "quality" && !on.representative) ul.appendChild(el("li", "", "the demo set said " + pct(r.observed) + "; real traffic did not look like the demo set"));
    });
    if (!ul.children.length) ul.appendChild(el("li", "", "the gates were red for process reasons - the failures below the surface had not surfaced yet. They will."));
    out.appendChild(ul);
    var tail = el("p", "");
    tail.innerHTML = "Every one of those becomes a permanent regression test. That is the only good thing about shipping early: the incident writes the eval you should have written first.";
    out.appendChild(tail);
    return out;
  }

  /* ---------- render: the CI table ---------- */
  function renderCi(box) {
    box.innerHTML = "";
    box.appendChild(el("div", "gl-bot", "What n buys you"));
    box.appendChild(el("p", "gl-what", "Observed accuracy fixed at 90%. Only the size of the golden set changes. Every figure below is computed in your browser from the Wilson formula - nothing is hard-coded."));
    var t = el("table", "gl-ci");
    var thead = el("thead", "");
    var hr = el("tr", "");
    ["Golden set n", "Passed", "95% Wilson interval", "Width", "What you may claim"].forEach(function (h) { hr.appendChild(el("th", "", h)); });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = el("tbody", "");
    [20, 50, 100, 200, 500, 1000, 2000].forEach(function (n) {
      var s = Math.round(n * 0.9);
      var ci = wilson(s, n);
      var tr = el("tr", n === 20 ? "hi" : "");
      tr.appendChild(el("td", "w", String(n)));
      tr.appendChild(el("td", "", s + " / " + n));
      tr.appendChild(el("td", "", pct(ci.lo) + " to " + pct(ci.hi)));
      tr.appendChild(el("td", "", ((ci.hi - ci.lo) * 100).toFixed(1) + " pts"));
      tr.appendChild(el("td", "", "at least " + pct(ci.lo)));
      tb.appendChild(tr);
    });
    t.appendChild(tb); box.appendChild(t);
    box.appendChild(el("p", "gl-rail",
      "Read the first row again. Eighteen out of twenty is a 90% pass rate and it is compatible with a bot that is truly right about seven times in ten. This is why a demo is not evidence. Note also that the interval narrows with the square root of n: going from 500 to 2000 - four times the labelling work - buys under three points of width."));
  }

  /* ---------- render: the scripted ladder ---------- */
  var LADDER = [
    { name: "Demo day", bot: "chatbot", tier: "t3", n: 20, on: {},
      say: "Beacon's support bot can issue a refund credit, so it is tier T3 and the bar is 90%. Here is demo day: twenty questions someone picked because the bot answers them well, no adversarial slice, a judge nobody has checked against a human. Nineteen out of twenty and the room applauds. Look at the confidence number, not the applause." },
    { name: "Honest set", bot: "chatbot", tier: "t3", n: 100, on: { representative: 1, adversarial: 1, calibrated: 1 },
      say: "Same bot. Nothing about it changed. All we did was sample the golden set from real traffic, add the adversarial and unanswerable slice, and calibrate the judge. The number did not fall because the bot got worse - it fell because we stopped lying to ourselves." },
    { name: "Ground it", bot: "chatbot", tier: "t3", n: 100, on: { representative: 1, adversarial: 1, calibrated: 1, grounding: 1, context: 1 },
      say: "Now fix the bot instead of the eval. Cite-or-abstain grounding kills the confident wrong policy answers; conversation context stops it losing the order number. Two levers, most of the climb." },
    { name: "Close the gaps", bot: "chatbot", tier: "t3", n: 100, on: { representative: 1, adversarial: 1, calibrated: 1, grounding: 1, context: 1, abstention: 1, rails: 1 },
      say: "Abstention turns invented policies into honest escalations. Rails stop the injection hidden in a pasted ticket. Quality is close - but the latency and cost gates just went red, because every one of these levers costs milliseconds and cents." },
    { name: "Pay for it", bot: "chatbot", tier: "t3", n: 100, on: { representative: 1, adversarial: 1, calibrated: 1, grounding: 1, context: 1, abstention: 1, rails: 1, perf: 1, hitl: 1, regression: 1 },
      say: "Caching and model routing pay back the latency and cost the quality levers borrowed. Draft-and-hold before any refund is committed. Regression suite in CI. Five gates green - and the quality gate is the one still holding, because 95 out of 100 only proves 88.8%, and T3 asks for 90%." },
    { name: "Earn the claim", bot: "chatbot", tier: "t3", n: 500, on: { representative: 1, adversarial: 1, calibrated: 1, grounding: 1, context: 1, abstention: 1, rails: 1, perf: 1, hitl: 1, regression: 1 },
      say: "Nothing about the bot changed here either. We labelled 400 more examples. The pass rate barely moved - 94.7% either way - but the bound climbed from 88.8% to 92.5%, because the interval narrowed. That is the last rung, and the one teams skip: you did not make it better, you made it provable." }
  ];

  function renderLadder(box) {
    box.innerHTML = "";
    var step = 0;
    var nav = el("div", "gl-lad");
    var say = el("p", "gl-ladsay");
    var host = el("div", "");
    LADDER.forEach(function (L, i) {
      var b = el("button", "gl-ladb", (i + 1) + ". " + L.name);
      b.type = "button";
      b.onclick = function () { step = i; draw(); };
      nav.appendChild(b);
    });
    box.appendChild(nav); box.appendChild(say); box.appendChild(host);
    function draw() {
      Array.prototype.forEach.call(nav.children, function (b, i) { b.className = "gl-ladb" + (i === step ? " on" : ""); });
      say.textContent = LADDER[step].say;
      host.innerHTML = "";
      var inner = el("div", "");
      host.appendChild(inner);
      render(inner, LADDER[step].bot, Object.assign({}, LADDER[step].on), LADDER[step].n, LADDER[step].tier || "t2", { scripted: true });
    }
    draw();
  }

  /* ---------- mount ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    injectCss();
    document.querySelectorAll(".glbox").forEach(function (box) {
      var mode = box.getAttribute("data-mode") || "gate";
      if (mode === "ladder") { renderLadder(box); return; }
      if (mode === "ci") { renderCi(box); return; }
      var botKey = box.getAttribute("data-bot") || "chatbot";
      if (!BOTS[botKey]) botKey = "chatbot";
      var tierKey = box.getAttribute("data-tier") || "t2";
      var on = {};
      var pre = box.getAttribute("data-levers");
      if (pre !== null && pre !== "") pre.split(",").forEach(function (k) { if (k.trim()) on[k.trim()] = true; });
      var nAttr = box.getAttribute("data-n");
      var n = (nAttr !== null && nAttr !== "") ? parseInt(nAttr, 10) : 20;
      if (!n || SIZES.indexOf(n) < 0) n = 20;
      render(box, botKey, on, n, tierKey, { scripted: false });
    });
  });

  window.GATE_LIVE = { wilson: wilson, score: score, BOTS: BOTS, LEVERS: LEVERS, LADDER: LADDER };
})();
