/* GANGA'S SCHEDULE - FETCH EDITION
   - Fetch langsung dari Google Sheet
   - Handle tanggal tanpa tahun (01/02)
   - Handle keterangan popup
*/

const CONFIG = {
  SHEET_ID: "1EuA-dVoTwLeMGBKTfdTxgWvs_d-s0kmabgFlfyI71pw", 
  GID: "0",
  DEFAULT_YEAR: 2026, 
  REST_CHIBI_SRC: "./assets/cute_slime.png" 
};

// DOM References
const els = {
  monthJp: document.getElementById("monthJp"),
  monthId: document.getElementById("monthId"),
  grid: document.getElementById("calendarGrid"),
  btnPrev: document.getElementById("prevBtn"),
  btnNext: document.getElementById("nextBtn"),
  btnMode: document.getElementById("modeBtn"),
  modal: document.getElementById("rimuruModal"),
  modalDate: document.getElementById("modalDate"),
  modalShift: document.getElementById("modalShiftBadge"),
  modalKet: document.getElementById("modalKeterangan"),
  closeModal: document.getElementById("closeModal")
};

// State
let state = {
  year: 2026,
  month: 1, // Start di Februari biar kelihatan datanya
  mapData: new Map(), // Key: YYYY-MM-DD
  rows: [],
  mode: "work"
};

// --- MODAL LOGIC ---
function showModal(dateStr, shift, ket) {
  els.modalDate.textContent = dateStr;
  els.modalShift.textContent = shift || "Empty";
  els.modalKet.textContent = ket || "-";
  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  els.modal.classList.remove("show");
  els.modal.setAttribute("aria-hidden", "true");
}
if(els.closeModal) els.closeModal.onclick = closeModal;
window.onclick = (e) => { if(e.target === els.modal) closeModal(); };

// --- HELPER: DATE PARSER ---
function parseDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  // Split date by '/'
  const parts = s.split('/');
  
  // Format: DD/MM/YYYY
  if (parts.length === 3) {
    return { day: +parts[0], month: +parts[1], year: +parts[2] };
  }
  
  // Format: DD/MM (Tanpa Tahun) -> Pakai Default Year
  if (parts.length === 2) {
    return { day: +parts[0], month: +parts[1], year: CONFIG.DEFAULT_YEAR };
  }

  return null;
}

function pad2(n) { return String(n).padStart(2, '0'); }

// --- DATA PROCESSING ---
function processData(rows) {
  state.mapData.clear();
  
  rows.forEach(item => {
    // item.c adalah array cell
    // c[0] = Tanggal, c[2] = Shift, c[3] = Keterangan (Asumsi Col D)
    if (!item.c) return;

    const tRaw = item.c[0] ? (item.c[0].f || item.c[0].v) : "";
    const sRaw = item.c[2] ? (item.c[2].v || item.c[2].f) : "";
    // Ambil keterangan dari kolom index 3 (D) atau 4 (E) jika ada
    const kRaw = item.c[3] ? (item.c[3].v || item.c[3].f) : "";

    const p = parseDate(tRaw);
    if (!p) return;

    const key = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
    state.mapData.set(key, { shift: sRaw, ket: kRaw });
  });
}

// --- FETCH FROM GOOGLE SHEETS ---
function fetchSheets() {
  els.monthId.textContent = "Loading Data...";
  
  // URL GViz JSON
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?gid=${CONFIG.GID}&tqx=out:json`;

  fetch(url)
    .then(res => res.text())
    .then(text => {
      // Bersihkan response jsonp
      const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const json = JSON.parse(jsonText);
      
      const rows = json.table.rows;
      console.log("Data loaded:", rows.length);
      
      processData(rows);
      render();
    })
    .catch(err => {
      console.error("Fetch Error:", err);
      els.monthId.textContent = "Error Loading!";
    });
}

// --- GARBAGE LOGIC ---
function getGarbage(year, month, day) {
  const date = new Date(year, month, day);
  const dow = date.getDay(); 
  const weekNum = Math.floor((day - 1) / 7) + 1;

  if (dow === 1 || dow === 4) return { t: "燃える", i: "🔥", c: "g-burn" };
  if (dow === 2) { 
    if (weekNum === 1) return { t: "紙・新聞", i: "📰", c: "g-paper" };
    if (weekNum === 2 || weekNum === 4) return { t: "ペット", i: "🍾", c: "g-pet" };
    if (weekNum === 3) return { t: "粗大・不燃", i: "🛋️", c: "g-sodai" };
  }
  if (dow === 3 && (weekNum === 1 || weekNum === 3)) return { t: "缶・ビン", i: "🥫", c: "g-can" };
  return null;
}

// --- RENDER ---
function render() {
  const { year, month, mode } = state;
  const today = new Date();
  
  // Header
  if (mode === 'garbage') {
    els.monthJp.textContent = "ゴミ収集";
    els.monthId.textContent = `Jadwal Sampah`;
    els.btnMode.textContent = "📅";
  } else {
    els.monthJp.textContent = `${month + 1}月`;
    const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    els.monthId.textContent = `${monthNames[month]} ${year}`;
    els.btnMode.textContent = "🗑️";
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayDow = new Date(year, month, 1).getDay();

  els.grid.innerHTML = "";

  // Spacer
  for (let i = 0; i < firstDayDow; i++) {
    const d = document.createElement("div");
    d.className = "cell is-out";
    els.grid.appendChild(d);
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add("is-today");
    }

    const dayNum = document.createElement("div");
    dayNum.className = "day";
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    const content = document.createElement("div");
    content.className = "shift";

    if (mode === 'garbage') {
      content.classList.add("garbage-cell");
      const g = getGarbage(year, month, day);
      if (g) {
        cell.classList.add(g.c);
        content.innerHTML = `<span class="g-icon">${g.i}</span><span class="g-text">${g.t}</span>`;
      } else {
        content.innerHTML = `<span style="opacity:0.2">-</span>`;
      }
    } else {
      const key = `${year}-${pad2(month+1)}-${pad2(day)}`;
      const data = state.mapData.get(key);
      const shiftText = data ? data.shift : "";
      const ketText = data ? data.ket : "";

      content.textContent = shiftText;

      // Color Logic
      if (shiftText === "有給") {
        cell.classList.add("type-yukyu");
      } else if (shiftText === "休み" || shiftText === "休") {
        cell.classList.add("type-yasumi");
        const img = document.createElement("img");
        img.src = CONFIG.REST_CHIBI_SRC;
        img.className = "restChibi";
        img.onerror = () => img.remove();
        cell.appendChild(img);
      } else if (shiftText === "夜勤明") {
        cell.classList.add("type-ake");
      } else if (shiftText === "夜勤入") {
        cell.classList.add("type-iri");
      } else if (shiftText === "日勤") {
        cell.classList.add("type-nikkin");
      } else if (shiftText) {
        cell.classList.add("type-event");
      }

      // Popup
      const visualDate = `${pad2(day)}/${pad2(month+1)}`;
      cell.onclick = () => showModal(visualDate, shiftText, ketText);
    }
    cell.appendChild(content);
    els.grid.appendChild(cell);
  }
}

// Controls
els.btnPrev.onclick = () => {
  state.month--;
  if(state.month < 0) { state.month = 11; state.year--; }
  render();
};
els.btnNext.onclick = () => {
  state.month++;
  if(state.month > 11) { state.month = 0; state.year++; }
  render();
};
els.btnMode.onclick = () => {
  state.mode = state.mode === 'work' ? 'garbage' : 'work';
  render();
};

// Start
fetchSheets();