// Penny: expense tracker. Amounts are stored as integer minor units (paise/cents)
// so totals never suffer from floating point rounding.

const KEY = "penny.v1";
const CATS = {
  food: { name: "Food", color: "#C2643B" },
  transport: { name: "Transport", color: "#3E7CB1" },
  shopping: { name: "Shopping", color: "#B5527E" },
  bills: { name: "Bills", color: "#6C5BB5" },
  fun: { name: "Fun", color: "#D9A23B" },
  health: { name: "Health", color: "#2F8F63" },
  study: { name: "Study", color: "#4A8C9C" },
  other: { name: "Other", color: "#8A7D72" },
};
const INCOME_CATS = {
  salary: { name: "Salary", color: "#2F8F63" },
  freelance: { name: "Freelance", color: "#3E7CB1" },
  gift: { name: "Gift", color: "#D9A23B" },
  other_in: { name: "Other", color: "#8A7D72" },
};
const ALL = { ...CATS, ...INCOME_CATS };
const LOCALE = { INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB" };

const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10);
const ym = (d) => d.slice(0, 7);
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

let db = load();
let view = todayISO().slice(0, 7);
let filter = { q: "", cat: "" };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tx)) return d;
  } catch { /* ignore */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }

function seed() {
  // Realistic sample month so the app isn't empty on first visit.
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const day = (n) => {
    const d = new Date(y, m, Math.min(n, now.getDate()));
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const prev = (n) => {
    const d = new Date(y, m - 1, n);
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const tx = [
    ["income", "freelance", 1800000, day(1), "Website project"],
    ["expense", "bills", 89900, day(2), "Phone + internet"],
    ["expense", "food", 34000, day(3), "Groceries"],
    ["expense", "transport", 12000, day(4), "Metro card"],
    ["expense", "study", 49900, day(5), "Online course"],
    ["expense", "food", 18500, day(7), "Dinner with friends"],
    ["expense", "fun", 29900, day(9), "Movie night"],
    ["expense", "shopping", 129900, day(11), "Headphones"],
    ["expense", "food", 22000, day(13), "Groceries"],
    ["expense", "health", 45000, day(15), "Gym month"],
    ["expense", "transport", 8000, day(16), "Auto rides"],
    ["expense", "food", 9500, day(18), "Chai and snacks"],
    ["expense", "food", 41000, prev(6), "Groceries"],
    ["expense", "shopping", 210000, prev(12), "Shoes"],
    ["expense", "bills", 89900, prev(2), "Phone + internet"],
    ["income", "freelance", 1500000, prev(1), "Landing page"],
  ].map(([type, category, amount, date, note]) => ({ id: uid(), type, category, amount, date, note }));
  return { tx, currency: "INR", budgets: {}, defaultBudget: 1500000 };
}

// ---------- money ----------
function money(minor, opts = {}) {
  return new Intl.NumberFormat(LOCALE[db.currency] || "en-IN", {
    style: "currency", currency: db.currency, maximumFractionDigits: opts.short ? 0 : 2, minimumFractionDigits: opts.short ? 0 : 0,
  }).format(minor / 100);
}
function parseAmount(str) {
  const clean = String(str).replace(/[^\d.]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const n = Math.round(parseFloat(clean) * 100);
  return n > 0 && n < 1e12 ? n : null;
}

// ---------- derived data ----------
const inMonth = (month) => db.tx.filter((t) => ym(t.date) === month);
const sum = (list) => list.reduce((a, t) => a + t.amount, 0);
const budgetFor = (month) => db.budgets[month] ?? db.defaultBudget ?? 0;
function shiftMonth(month, by) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- render ----------
function render() {
  const [y, m] = view.split("-").map(Number);
  $("monthLabel").textContent = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("nextMonth").disabled = view >= todayISO().slice(0, 7);
  $("currency").value = db.currency;

  const tx = inMonth(view);
  const spent = sum(tx.filter((t) => t.type === "expense"));
  const income = sum(tx.filter((t) => t.type === "income"));
  const lastSpent = sum(inMonth(shiftMonth(view, -1)).filter((t) => t.type === "expense"));

  $("tSpent").textContent = money(spent);
  const cmp = $("tSpentCmp");
  if (lastSpent > 0) {
    const pct = Math.round(((spent - lastSpent) / lastSpent) * 100);
    cmp.textContent = `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last month`;
    cmp.className = pct >= 0 ? "up" : "down";
  } else { cmp.textContent = ""; cmp.className = ""; }
  $("tIncome").textContent = money(income);
  $("tLeft").textContent = money(income - spent);

  const budget = budgetFor(view);
  $("tBudget").textContent = budget ? money(budget, { short: true }) : "Not set";
  const used = budget ? Math.round((spent / budget) * 100) : 0;
  const meter = $("meter");
  meter.querySelector("i").style.width = Math.min(used, 100) + "%";
  meter.className = "meter" + (used >= 100 ? " over" : used >= 80 ? " warn" : "");
  meter.setAttribute("aria-valuenow", String(Math.min(used, 100)));
  $("tBudgetNote").textContent = budget
    ? used >= 100 ? `Over by ${money(spent - budget, { short: true })}` : `${used}% used · ${money(budget - spent, { short: true })} left`
    : "Set a monthly limit";

  renderDonut(tx.filter((t) => t.type === "expense"), spent);
  renderBars(tx.filter((t) => t.type === "expense"));
  renderList(tx);
}

function renderDonut(expenses, total) {
  const by = {};
  expenses.forEach((t) => (by[t.category] = (by[t.category] || 0) + t.amount));
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const svg = $("donut");
  const r = 48, c = 2 * Math.PI * r;
  let offset = 0;
  svg.innerHTML = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>`;
  rows.forEach(([cat, amt]) => {
    const len = (amt / total) * c;
    const seg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    Object.entries({ cx: 60, cy: 60, r, fill: "none", stroke: ALL[cat]?.color || "#999", "stroke-width": 16,
      "stroke-dasharray": `${Math.max(len - 1.5, 0.1)} ${c}`, "stroke-dashoffset": -offset }).forEach(([k, v]) => seg.setAttribute(k, v));
    svg.append(seg);
    offset += len;
  });
  $("donutTotal").textContent = money(total, { short: true });
  const legend = $("legend");
  legend.replaceChildren();
  if (!rows.length) { legend.innerHTML = `<li style="grid-column:1/-1;color:var(--mute)">No spending yet this month</li>`; return; }
  rows.forEach(([cat, amt]) => {
    const li = document.createElement("li");
    li.innerHTML = `<i style="background:${ALL[cat]?.color}"></i><span></span><b></b>`;
    li.children[1].textContent = `${ALL[cat]?.name || cat} · ${Math.round((amt / total) * 100)}%`;
    li.children[2].textContent = money(amt, { short: true });
    legend.append(li);
  });
}

function renderBars(expenses) {
  const [y, m] = view.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const per = Array(days).fill(0);
  expenses.forEach((t) => (per[Number(t.date.slice(8, 10)) - 1] += t.amount));
  const max = Math.max(...per, 1);
  const W = 620, H = 160, gap = 4, bw = (W - gap * (days - 1)) / days;
  const today = todayISO();
  let html = `<line x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}"/>`;
  per.forEach((v, i) => {
    const h = v ? Math.max((v / max) * (H - 8), 3) : 0;
    const date = `${view}-${String(i + 1).padStart(2, "0")}`;
    html += `<rect x="${i * (bw + gap)}" y="${H - h}" width="${bw}" height="${h}" rx="3" class="${date === today ? "today" : ""}"><title>${date}: ${money(v)}</title></rect>`;
  });
  $("bars").innerHTML = html;
  $("barsAxis").innerHTML = `<span>1</span><span>${Math.ceil(days / 2)}</span><span>${days}</span>`;
}

function renderList(tx) {
  const q = filter.q.toLowerCase();
  const list = tx
    .filter((t) => (!filter.cat || t.category === filter.cat) && (!q || (t.note || "").toLowerCase().includes(q) || ALL[t.category]?.name.toLowerCase().includes(q)))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const wrap = $("txList");
  wrap.replaceChildren();
  if (!list.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = tx.length ? "No transactions match your filters." : "No transactions this month yet. Add your first one above.";
    wrap.append(p);
    return;
  }
  const groups = {};
  list.forEach((t) => (groups[t.date] ||= []).push(t));
  Object.entries(groups).forEach(([date, items]) => {
    const sec = document.createElement("div");
    sec.className = "day";
    const h = document.createElement("h3");
    const net = items.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0);
    h.innerHTML = `<span></span><span></span>`;
    h.children[0].textContent = new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    h.children[1].textContent = (net >= 0 ? "+" : "−") + money(Math.abs(net));
    sec.append(h);
    items.forEach((t) => {
      const cat = ALL[t.category] || { name: t.category, color: "#999" };
      const row = document.createElement("div");
      row.className = "tx";
      row.innerHTML = `<span class="ic"></span><span class="what"><b></b><small></small></span><span class="amt"></span><button class="del" type="button">×</button>`;
      const ic = row.querySelector(".ic");
      ic.textContent = cat.name[0];
      ic.style.background = cat.color + "22";
      ic.style.color = cat.color;
      row.querySelector("b").textContent = cat.name;
      row.querySelector("small").textContent = t.note || (t.type === "income" ? "Income" : "Expense");
      const amt = row.querySelector(".amt");
      amt.textContent = (t.type === "income" ? "+" : "−") + money(t.amount);
      if (t.type === "income") amt.classList.add("in");
      const del = row.querySelector(".del");
      del.setAttribute("aria-label", `Delete ${cat.name} ${money(t.amount)}`);
      del.addEventListener("click", () => {
        db.tx = db.tx.filter((x) => x.id !== t.id);
        save(); render();
      });
      sec.append(row);
    });
    wrap.append(sec);
  });
}

// ---------- form ----------
const form = $("txForm");
function fillCats() {
  const type = form.elements.type.value;
  const cats = type === "income" ? INCOME_CATS : CATS;
  const sel = $("catSelect");
  sel.replaceChildren(...Object.entries(cats).map(([v, c]) => new Option(c.name, v)));
  $("submitBtn").textContent = type === "income" ? "Add income" : "Add expense";
}
form.addEventListener("change", (e) => { if (e.target.name === "type") fillCats(); });
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = form.elements;
  const amount = parseAmount(f.amount.value);
  const err = $("formErr");
  if (amount == null) { err.textContent = "Enter an amount greater than 0, like 250 or 99.50."; f.amount.focus(); return; }
  if (!f.date.value) { err.textContent = "Pick a date."; f.date.focus(); return; }
  if (f.date.value > todayISO()) { err.textContent = "The date can't be in the future."; f.date.focus(); return; }
  err.textContent = "";
  db.tx.push({ id: uid(), type: f.type.value, category: f.category.value, amount, date: f.date.value, note: f.note.value.trim().slice(0, 60) });
  save();
  view = ym(f.date.value);
  f.amount.value = ""; f.note.value = "";
  f.amount.focus();
  render();
});

// ---------- controls ----------
$("prevMonth").addEventListener("click", () => { view = shiftMonth(view, -1); render(); });
$("nextMonth").addEventListener("click", () => { view = shiftMonth(view, 1); render(); });
$("currency").addEventListener("change", (e) => { db.currency = e.target.value; save(); render(); });
$("q").addEventListener("input", (e) => { filter.q = e.target.value.trim(); render(); });
$("catFilter").append(...Object.entries(ALL).filter(([k]) => k !== "other_in").map(([v, c]) => new Option(c.name, v)));
$("catFilter").addEventListener("change", (e) => { filter.cat = e.target.value; render(); });

const dlg = $("budgetDlg");
$("editBudget").addEventListener("click", () => {
  $("budgetInput").value = (budgetFor(view) / 100) || "";
  dlg.showModal();
});
dlg.addEventListener("close", () => {
  if (dlg.returnValue !== "ok") return;
  const v = parseAmount($("budgetInput").value);
  db.defaultBudget = v || 0;
  save(); render();
});

$("exportCsv").addEventListener("click", () => {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["date", "type", "category", "amount", "currency", "note"]]
    .concat([...db.tx].sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.type, ALL[t.category]?.name || t.category, (t.amount / 100).toFixed(2), db.currency, t.note || ""]));
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "penny-transactions.csv" });
  a.click();
  URL.revokeObjectURL(a.href);
});

form.elements.date.value = todayISO();
form.elements.date.max = todayISO();
fillCats();
render();
