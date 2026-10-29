"use strict";
const $ = (s) => document.querySelector(s);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
let template, first, second, importTarget;
const cities = {
  "New York City": { lat: 40.71, lon: -74.01 },
  London: { lat: 51.51, lon: -0.13 },
  Lisbon: { lat: 38.72, lon: -9.14 },
};
function field(parent, key, label, options, value) {
  const l = el("label", label);
  let input;
  if (options) {
    input = el("select");
    for (const x of options) {
      const o = el("option", x);
      o.value = x;
      input.append(o);
    }
  } else {
    input = el("input");
    input.type = "number";
    input.min = "18";
    input.max = "120";
  }
  input.dataset.key = key;
  input.value = value;
  l.append(input);
  parent.append(l);
}
function renderForm(id, p) {
  const root = $(id);
  root.replaceChildren();
  const grid = el("div", undefined, "form-grid");
  field(grid, "age", "Age", null, p.age);
  field(grid, "gender", "Gender", template.choices.gender, p.gender);
  field(grid, "minAge", "Dating age minimum", null, p.minAge);
  field(grid, "maxAge", "Dating age maximum", null, p.maxAge);
  field(grid, "city", "City (coarse location)", Object.keys(cities), p.city);
  field(
    grid,
    "intention",
    "Relationship intention",
    template.choices.intentions,
    p.intention,
  );
  field(
    grid,
    "communication",
    "Communication",
    template.choices.communication,
    p.communication,
  );
  field(
    grid,
    "lifestyle",
    "Social pace",
    template.choices.lifestyle,
    p.lifestyle,
  );
  for (const [key, label] of [
    ["values", "Your values"],
    ["interests", "Your interests"],
    ["seeking", "Dating preferences"],
  ]) {
    const l = el("fieldset", undefined, "wide");
    l.style.border = "0";
    l.style.padding = "0";
    l.style.margin = "0";
    l.append(el("legend", label));
    const group = el("div", undefined, "choice-group");
    for (const v of template.choices[key === "seeking" ? "gender" : key]) {
      const chip = el("label", undefined, "chip");
      const check = el("input");
      check.type = "checkbox";
      check.dataset.group = key;
      check.value = v;
      check.checked = p[key].includes(v);
      chip.append(check, document.createTextNode(v));
      group.append(chip);
    }
    l.append(group);
    grid.append(l);
  }
  for (const [key, label] of [
    ["sameIntention", "Same intention is a dealbreaker (dating)"],
    ["sameLifestyle", "Same social pace is a dealbreaker"],
  ]) {
    const l = el("label", undefined, "consent wide");
    const check = el("input");
    check.type = "checkbox";
    check.dataset.deal = key;
    check.checked = p.dealbreakers?.[key] === true;
    l.append(check, document.createTextNode(label));
    grid.append(l);
  }
  root.append(grid);
  root.oninput = () => {
    const who = id.includes("first") ? "first" : "second";
    $(`#approve-${who}`).checked = false;
    $("#result").replaceChildren();
    $("#matches").replaceChildren();
  };
}
function readForm(who) {
  const root = $(`#${who}-form`),
    p = { approved: true, adult: true };
  for (const input of root.querySelectorAll("[data-key]"))
    p[input.dataset.key] =
      input.type === "number" ? Number(input.value) : input.value;
  for (const key of ["values", "interests", "seeking"])
    p[key] = [...root.querySelectorAll(`[data-group="${key}"]:checked`)].map(
      (x) => x.value,
    );
  p.location = cities[p.city];
  p.dealbreakers = {};
  for (const x of root.querySelectorAll("[data-deal]"))
    p.dealbreakers[x.dataset.deal] = x.checked;
  return p;
}
function approved(who) {
  if (!$(`#approve-${who}`).checked)
    throw Error(
      `Review and approve the ${who === "first" ? "first" : "second"} profile before continuing.`,
    );
  return readForm(who);
}
async function post(path, data) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  const b = await r.json();
  if (!r.ok) throw Error(b.error ?? "Request failed");
  return b;
}
async function act(fn, target = "#feedback") {
  const n = $(target);
  n.textContent = "Working…";
  try {
    await fn();
    n.textContent = "";
  } catch (e) {
    n.textContent = e.message;
  }
}
function typeCard(a) {
  const n = el("div", undefined, "type-card");
  n.append(
    el("div", a.symbol, "type-symbol"),
    el("h3", a.name),
    el("p", a.description),
    el("p", `${a.values.join(" · ")} · ${a.communication} · ${a.lifestyle}`),
  );
  return n;
}
function listSection(parent, title, items) {
  const s = el("div");
  s.append(el("h4", title));
  const ul = el("ul");
  for (const item of items) ul.append(el("li", item));
  s.append(ul);
  parent.append(s);
}
function showReport(r) {
  const root = $("#result");
  root.replaceChildren();
  const box = el("article", undefined, "report");
  const top = el("div", undefined, "report-top");
  top.append(typeCard(r.archetypes[0]));
  const score = el("div", undefined, "score");
  score.style.setProperty("--progress", `${r.score ?? 0}%`);
  score.append(
    el("strong", r.score === null ? "—" : String(r.score)),
    el("small", r.eligible ? "EXPLORATORY ESTIMATE" : "CONSTRAINT NOT MET"),
  );
  top.append(score, typeCard(r.archetypes[1]));
  box.append(top);
  if (!r.eligible) box.append(el("p", r.blocked.join(". ")));
  const breakdown = el("div", undefined, "breakdown");
  for (const [key, v] of Object.entries(r.dimensions)) {
    const d = el("div", undefined, "dimension"),
      label = el("span");
    label.append(
      el("span", key[0].toUpperCase() + key.slice(1)),
      el("b", `${v}%`),
    );
    const bar = el("progress");
    bar.max = 100;
    bar.value = v;
    bar.setAttribute("aria-label", `${key} overlap or alignment`);
    d.append(label, bar);
    breakdown.append(d);
  }
  box.append(breakdown);
  const insights = el("div", undefined, "insights");
  listSection(insights, "Common ground", [
    `Values: ${r.sharedValues.join(", ") || "No selected overlap"}`,
    `Interests: ${r.sharedInterests.join(", ") || "No selected overlap"}`,
  ]);
  listSection(insights, "Possible complementary strengths", r.complements);
  listSection(
    insights,
    "Worth talking about",
    r.friction.length
      ? r.friction
      : [
          "No differences flagged by these limited attributes. Real people are more complex.",
        ],
  );
  listSection(insights, "Try together", r.activities);
  listSection(insights, "Start a conversation", r.conversationStarters);
  box.append(
    insights,
    el("p", r.interpretation, "fine"),
    el("p", r.disclaimer, "fine"),
  );
  root.append(box);
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}
function tab(name) {
  for (const n of ["type", "compare", "discover", "connect"])
    $(`#${n}`).hidden = n !== name;
  for (const b of document.querySelectorAll("[data-tab]")) {
    b.classList.toggle("active", b.dataset.tab === name);
    b.setAttribute("aria-pressed", String(b.dataset.tab === name));
  }
}
for (const b of document.querySelectorAll("[data-tab]"))
  b.onclick = () => tab(b.dataset.tab);
$("#type-start").onclick = () => {
  tab("compare");
  $("#compare").scrollIntoView({ behavior: "smooth" });
};
$("#begin").onclick = () => {
  tab("type");
  $("#type").scrollIntoView({ behavior: "smooth" });
};
$("#compare-button").onclick = () =>
  act(async () =>
    showReport(
      await post("/api/compare", {
        first: approved("first"),
        second: approved("second"),
        context: $("#context").value,
      }),
    ),
  );
$("#context").onchange = () => {
  $("#result").replaceChildren();
  if ($("#approve-first").checked && $("#approve-second").checked)
    $("#compare-button").click();
};
for (const who of ["first", "second"])
  $(`#approve-${who}`).onchange = () => {
    $("#result").replaceChildren();
    $("#matches").replaceChildren();
  };
$("#type-button").onclick = () =>
  act(async () => {
    const a = await post("/api/archetype", { profile: approved("first") });
    $("#result").replaceChildren(typeCard(a));
    $("#result").append(
      el("p", a.disclaimer, "fine"),
      el("p", `Potential complements: ${a.complements.join(", ")}`, "fine"),
    );
  });
$("#export-button").onclick = () =>
  act(async () => {
    const data = await post("/api/card", { profile: approved("first") });
    const escapeXML = (v) =>
      String(v).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[c],
      );
    const type = data.archetype;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900"><rect width="800" height="900" rx="40" fill="#fbf9f3"/><circle cx="335" cy="265" r="135" fill="#edb394" fill-opacity=".7" stroke="#a1644d"/><circle cx="465" cy="265" r="135" fill="#d9e4ce" fill-opacity=".7" stroke="#28392d"/><g fill="#28392d" text-anchor="middle"><text x="400" y="80" font-family="Georgia,serif" font-size="38">Vennith</text><text x="400" y="450" font-family="Georgia,serif" font-size="54">${escapeXML(type.name)}</text><text x="400" y="515" font-family="Arial,sans-serif" font-size="22">${escapeXML(type.values.join(" · "))}</text><text x="400" y="570" font-family="Arial,sans-serif" font-size="22">${escapeXML(type.communication)}</text><text x="400" y="610" font-family="Arial,sans-serif" font-size="22">${escapeXML(type.lifestyle)}</text><text x="400" y="725" font-family="Georgia,serif" font-size="27">Know yourself. Find your people.</text><text x="400" y="810" font-family="Arial,sans-serif" font-size="16">A playful interpretation, not a psychological assessment.</text><text x="400" y="840" font-family="Arial,sans-serif" font-size="14">Shared voluntarily. Copies cannot be revoked.</text></g></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = "my-vennith-card.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("#result").replaceChildren(
      typeCard(data.archetype),
      el("p", data.notice, "fine"),
    );
  });
$("#discover-button").onclick = () =>
  act(async () => {
    const matches = await post("/api/matches", {
      profile: approved("first"),
      context: $("#mode").value,
      scope: $("#scope").value,
      radiusKm: Number($("#radius").value),
    });
    const root = $("#matches");
    root.replaceChildren();
    if (!matches.length)
      root.append(
        el(
          "p",
          "No fictional matches meet these constraints. Try another location or review your preferences.",
        ),
      );
    for (const m of matches) {
      const c = el("article", undefined, "match");
      c.append(
        el("p", "FICTIONAL ADULT · DEMO", "eyebrow"),
        el("div", m.report.archetypes[1].symbol, "mark"),
        el("h3", m.name),
        el("p", `${m.city} · ${m.report.score}% exploratory estimate`),
        el(
          "p",
          m.report.sharedValues.length
            ? `Shared values: ${m.report.sharedValues.join(", ")}`
            : "Different values to explore",
        ),
        el("p", m.report.friction[0] ?? "Similar selected preferences"),
      );
      const detail = el("button", "See compatibility report ↗", "text-button");
      detail.onclick = () => {
        tab("compare");
        showReport(m.report);
      };
      const approve = el("button", "Try mutual approval demo", "secondary");
      approve.onclick = () => {
        approve.disabled = true;
        approve.textContent = "Demo interest recorded";
        c.append(
          el(
            "p",
            "Your interest alone never unlocks an introduction. This fictional person cannot consent. No identity or messaging is available.",
            "fine",
          ),
        );
      };
      c.append(detail, approve);
      root.append(c);
    }
  }, "#discovery-status");
for (const who of ["first", "second"])
  $(`#import-${who}`).onclick = () => {
    importTarget = who;
    $("#import-json").value = "";
    $("#import-error").textContent = "";
    $("#import-dialog").showModal();
  };
$("#apply-import").onclick = async () => {
  try {
    const p = JSON.parse($("#import-json").value);
    await post("/api/archetype", {
      profile: { ...p, approved: true, adult: true },
    });
    if (!cities[p.city])
      throw Error(
        "This web demo supports New York City, London, and Lisbon; the MCP schema accepts other cities.",
      );
    renderForm(`#${importTarget}-form`, p);
    $(`#approve-${importTarget}`).checked = false;
    $("#result").replaceChildren();
    $("#import-dialog").close();
  } catch (e) {
    $("#import-error").textContent = e.message;
  }
};
$("#endpoint").textContent = `${location.origin}/mcp`;
$("#copy-prompt").onclick = async () => {
  const p =
    "Use Vennith get_profile_schema to draft a minimal compatibility profile from only information I authorize. Do not send conversation histories or sensitive information. Show me every field and wait for explicit approval before calling any profile, archetype, matching, or comparison tool. Use only fictional people for discovery. For comparison, the other adult must independently approve their profile. Explain that Vennith types and scores are unvalidated heuristics.";
  try {
    await navigator.clipboard.writeText(p);
    $("#connect-status").textContent = "Prompt copied.";
  } catch {
    $("#connect-status").textContent = p;
  }
};
fetch("/api/template")
  .then((r) => {
    if (!r.ok) throw Error("Could not load profiles");
    return r.json();
  })
  .then((t) => {
    template = t;
    first = t.sample;
    second = t.people[1].profile;
    renderForm("#first-form", first);
    renderForm("#second-form", second);
    for (let i = 0; i < t.people.length; i++) {
      const o = el("option", `${t.people[i].name} · fictional`);
      o.value = String(i);
      $("#person").append(o);
    }
    $("#person").value = "1";
    $("#person").onchange = () => {
      renderForm("#second-form", t.people[Number($("#person").value)].profile);
      $("#approve-second").checked = false;
      $("#result").replaceChildren();
    };
  })
  .catch((e) => ($("#feedback").textContent = e.message));
