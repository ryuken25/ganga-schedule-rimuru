/*
  ガンガのスケジュール
  - Load data from Google Sheets using GViz (script injection, CORS-safe)
  - Render square 1:1 cells
  - If 勤務名 is 休み/yasumi -> add .rest + show chibi.gif (30% in bottom-right)
  - No reload button, no "Loaded..." text (silent; log to console)
*/

const CONFIG = {
  SHEET_ID: "1EuA-dVoTwLeMGBKTfdTxgWvs_d-s0kmabgFlfyI71pw",
  GID: "0",
  DEFAULT_YEAR: 2026,
  DEFAULT_MONTH: 0, // Jan
  REST_CHIBI_SRC: "./assets/chibi.gif",
};

const FALLBACK_ROWS = [
  { tanggal: "01/01", kerja: "夜勤入" },
  { tanggal: "01/02", kerja: "夜勤明" },
  { tanggal: "01/03", kerja: "休み" },
  { tanggal: "01/04", kerja: "休み" },
  { tanggal: "01/05", kerja: "日勤" },
  { tanggal: "01/06", kerja: "夜勤入" },
  { tanggal: "01/07", kerja: "夜勤明" },
  { tanggal: "01/08", kerja: "休み" },
  { tanggal: "01/09", kerja: "日勤" },
  { tanggal: "01/10", kerja: "日勤" },
  { tanggal: "01/11", kerja: "休み" },
  { tanggal: "01/12", kerja: "休み" },
  { tanggal: "01/13", kerja: "日勤" },
  { tanggal: "01/14", kerja: "日勤" },
  { tanggal: "01/15", kerja: "日勤" },
  { tanggal: "01/16", kerja: "夜勤入" },
  { tanggal: "01/17", kerja: "夜勤明" },
  { tanggal: "01/18", kerja: "休み" },
  { tanggal: "01/19", kerja: "休み" },
  { tanggal: "01/20", kerja: "日勤" },
  { tanggal: "01/21", kerja: "夜勤入" },
  { tanggal: "01/22", kerja: "夜勤明" },
  { tanggal: "01/23", kerja: "夜勤入" },
  { tanggal: "01/24", kerja: "夜勤明" },
  { tanggal: "01/25", kerja: "休み" },
  { tanggal: "01/26", kerja: "休み" },
  { tanggal: "01/27", kerja: "休み" },
  { tanggal: "01/28", kerja: "日勤" },
  { tanggal: "01/29", kerja: "日勤" },
  { tanggal: "01/30", kerja: "夜勤入" },
  { tanggal: "01/31", kerja: "夜勤明" },
];

// DOM
const monthJpEl = document.getElementById("monthJp");
const monthIdEl = document.getElementById("monthId");
const gridEl = document.getElementById("calendarGrid");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// State
let state = {
  year: CONFIG.DEFAULT_YEAR,
  month: CONFIG.DEFAULT_MONTH,
  mapYMD: new Map(), // YYYY-MM-DD => kerja
  mapMD: new Map(),  // MM-DD => kerja
  lastRows: [],
  source: "fallback",
};

function pad2(n) { return String(n).padStart(2, "0"); }

function monthNameId(monthIndex) {
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return names[monthIndex] || "";
}

function isRest(kerja) {
  const s = String(kerja || "").trim();
  return s === "休み" || s.toLowerCase() === "yasumi" || s === "休";
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Parse date into {year?, month?, day?} */
function parseAnyDate(raw) {
  const s0 = String(raw || "").trim();
  if (!s0) return null;
  const s = s0.replace(/^'+/, "").trim();

  // YYYY-MM-DD or YYYY/M/D
  const m1 = s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m1) return { year: +m1[1], month: +m1[2], day: +m1[3] };

  // 1/31/2026 or 31/1/2026
  const m2 = s.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
  if (m2) {
    const a = +m2[1], b = +m2[2], y = +m2[3];
    if (a > 12) return { year: y, month: b, day: a };
    return { year: y, month: a, day: b };
  }

  // MM/DD
  const m3 = s.match(/^(\d{1,2})\D+(\d{1,2})$/);
  if (m3) return { month: +m3[1], day: +m3[2] };

  // day only
  const m4 = s.match(/^(\d{1,2})$/);
  if (m4) return { day: +m4[1] };

  return null;
}

function buildMapsFromRows(rows, yearForMonth) {
  const mapYMD = new Map();
  const mapMD = new Map();

  for (const r of rows) {
    const kerja = String(r.kerja ?? "").trim();
    const parsed = parseAnyDate(r.tanggal);
    if (!parsed) continue;

    const day = parsed.day;
    if (!day || day < 1 || day > 31) continue;

    const month = parsed.month || (state.month + 1);
    if (month < 1 || month > 12) continue;

    const year = parsed.year || yearForMonth;

    mapYMD.set(`${year}-${pad2(month)}-${pad2(day)}`, kerja);
    mapMD.set(`${pad2(month)}-${pad2(day)}`, kerja);
  }

  return { mapYMD, mapMD };
}

function rebuildMapsForCurrentYear() {
  const rows = state.lastRows && state.lastRows.length ? state.lastRows : FALLBACK_ROWS;
  const maps = buildMapsFromRows(rows, state.year);
  state.mapYMD = maps.mapYMD;
  state.mapMD = maps.mapMD;
}

function getKerjaFor(year, monthIndex, day) {
  const m = monthIndex + 1;
  const kY = `${year}-${pad2(m)}-${pad2(day)}`;
  const kM = `${pad2(m)}-${pad2(day)}`;
  return state.mapYMD.get(kY) || state.mapMD.get(kM) || "";
}

/* ===== GViz loader (CORS-safe) ===== */
function loadGVizResponse() {
  return new Promise((resolve, reject) => {
    const timeoutMs = 9000;
    const startedAt = Date.now();
    let settled = false;

    const cleanup = (scriptEl) => {
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };

    window.google = window.google || {};
    window.google.visualization = window.google.visualization || {};
    window.google.visualization.Query = window.google.visualization.Query || {};

    const prevSetResponse = window.google.visualization.Query.setResponse;

    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";

    const finish = (ok, payload) => {
      if (settled) return;
      settled = true;
      window.google.visualization.Query.setResponse = prevSetResponse;
      cleanup(script);
      ok ? resolve(payload) : reject(payload);
    };

    window.google.visualization.Query.setResponse = (resp) => finish(true, resp);
    script.onerror = () => finish(false, new Error("Sheet belum public / belum publish."));

    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?gid=${CONFIG.GID}&tqx=out:json&_=${Date.now()}`;
    script.src = url;
    document.head.appendChild(script);

    const tick = () => {
      if (settled) return;
      if (Date.now() - startedAt > timeoutMs) {
        finish(false, new Error("Timeout GViz"));
        return;
      }
      setTimeout(tick, 180);
    };
    tick();
  });
}

function rowsFromGViz(resp) {
  if (!resp || !resp.table || !Array.isArray(resp.table.cols) || !Array.isArray(resp.table.rows)) return [];

  const cols = resp.table.cols.map((c) => String((c && (c.label || c.id)) || "").trim());

  const idxTanggal = cols.findIndex((h) => /tanggal/i.test(h) || h === "日付" || h === "Date" || h === "Tanggal");
  const idxKerja   = cols.findIndex((h) => h === "勤務名" || /勤務名/.test(h) || /kerja|shift/i.test(h));

  const fallbackTanggal = 0;
  const fallbackKerja = cols.length >= 3 ? 2 : 1;

  const rows = [];
  for (const rr of resp.table.rows) {
    const c = rr && rr.c ? rr.c : [];
    const getText = (i) => {
      const cell = c[i];
      if (!cell) return "";
      if (cell.f != null) return String(cell.f);
      if (cell.v != null) return String(cell.v);
      return "";
    };

    const tanggal = getText(idxTanggal !== -1 ? idxTanggal : fallbackTanggal).trim();
    const kerja = getText(idxKerja !== -1 ? idxKerja : fallbackKerja).trim();

    if (!tanggal && !kerja) continue;
    rows.push({ tanggal, kerja });
  }
  return rows;
}

async function loadDataSilent() {
  try {
    const resp = await loadGVizResponse();
    const rows = rowsFromGViz(resp);

    if (!rows.length) throw new Error("No rows");
    state.lastRows = rows.slice();
    const maps = buildMapsFromRows(rows, state.year);
    state.mapYMD = maps.mapYMD;
    state.mapMD = maps.mapMD;
    state.source = "sheets";
    console.info("[schedule] loaded from sheets:", rows.length);
  } catch (e) {
    state.lastRows = FALLBACK_ROWS.slice();
    const maps = buildMapsFromRows(FALLBACK_ROWS, state.year);
    state.mapYMD = maps.mapYMD;
    state.mapMD = maps.mapMD;
    state.source = "fallback";
    console.warn("[schedule] fallback (failed to load sheets):", e);
  }

  render();
}

function render() {
  const { year, month } = state;

  monthJpEl.textContent = `${month + 1}月`;
  monthIdEl.textContent = `${monthNameId(month)} ${year}`;

  const first = new Date(year, month, 1);
  const firstDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  gridEl.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    const dayNum = i - firstDow + 1;

    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.classList.add("is-out");
      cell.innerHTML = `<div class="day">&nbsp;</div><div class="shift"></div>`;
      gridEl.appendChild(cell);
      continue;
    }

    const kerja = getKerjaFor(year, month, dayNum);
    const rest = isRest(kerja);

    if (rest) cell.classList.add("rest");

    cell.innerHTML = `
      <div class="day">${pad2(dayNum)}</div>
      <div class="shift">${kerja ? escapeHTML(kerja) : ""}</div>
      ${rest ? `<img class="restChibi" src="${CONFIG.REST_CHIBI_SRC}" alt="" aria-hidden="true" loading="lazy">` : ""}
    `;

    gridEl.appendChild(cell);
  }
}

function shiftMonth(delta) {
  const d = new Date(state.year, state.month + delta, 1);
  const prevYear = state.year;
  state.year = d.getFullYear();
  state.month = d.getMonth();

  if (state.year !== prevYear) rebuildMapsForCurrentYear();
  render();
}

prevBtn.addEventListener("click", () => shiftMonth(-1));
nextBtn.addEventListener("click", () => shiftMonth(1));

/* init */
rebuildMapsForCurrentYear();
render();
loadDataSilent();
