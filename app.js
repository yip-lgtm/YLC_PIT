const READ_ONLY = /[?&]read(=1|&|$)/.test(location.search) || location.hash === "#read";
if (READ_ONLY) {
  document.title = "YLC triangle (read-only)";
  const h1 = document.querySelector("h1");
  if (h1) h1.innerHTML = h1.innerHTML.replace("pattern", "read-only");
}

const LETTERS = ["A", "B", "C", "D", "E"];
const COLS = [
  { row: 21, n: 11, p: 1 }, { row: 22, n: 10, p: 2 }, { row: 23, n: 10, p: 3 }, { row: 24, n: 10, p: 4 },
  { row: 31, n: 8, p: 1 }, { row: 32, n: 8, p: 2 }, { row: 33, n: 7, p: 3 }, { row: 34, n: 7, p: 4 },
  { row: 41, n: 7, p: 1 }, { row: 42, n: 6, p: 2 }, { row: 43, n: 6, p: 3 }, { row: 44, n: 5, p: 4 },
  { row: 51, n: 5, p: 1 }, { row: 52, n: 5, p: 2 }, { row: 53, n: 4, p: 3 }, { row: 54, n: 4, p: 4 },
  { row: 61, n: 3, p: 1 }, { row: 62, n: 3, p: 2 }, { row: 63, n: 2, p: 3 }, { row: 64, n: 2, p: 4 },
  { row: 71, n: 1, p: 1 }, { row: 72, n: 1, p: 2 }
];
const NAILS = [];
function addNails(row, n, elevs, len) {
  for (let i = 1; i <= n; i++) {
    const angle = i <= n - 3 ? 0 : [10, 15, 25][i - (n - 2)];
    NAILS.push({ id: row + "-" + i, kind: "nail", row: row, no: i, elev: elevs[i - 1], length: len, angle: angle });
  }
}
addNails("A", 8, [48, 48, 47.5, 47.5, 47.5, 47, 47, 47], 11.2);
addNails("B", 9, [46, 46, 45.5, 45.5, 45.5, 45, 45, 45, 45], 10.2);
addNails("C", 9, [45, 45, 43.5, 43.5, 43.5, 43, 43, 43, 43], 9.2);

const PITS = [];
const seen = {};
COLS.forEach(function (col, ci) {
  for (let i = 0; i < col.n; i++) {
    const letter = LETTERS[i % 5];
    const mk = col.p + letter;
    const key = col.row + "-" + mk;
    seen[key] = (seen[key] || 0) + 1;
    PITS.push({
      id: "R" + col.row + "-" + mk + "-" + seen[key],
      kind: "pit", row: col.row, marker: mk, letter: letter,
      col: ci, stack: i, n: seen[key]
    });
  }
});
const ALL = PITS.concat(NAILS);
const STATUS = [
  { v: "none", t: "未開始" },
  { v: "exc", t: "已開挖" },
  { v: "nfc", t: "已灌" },
  { v: "done", t: "已核實" }
];
function esc(s) {
  return String(s || "").split("&").join("&" + "amp;").split('"').join("&" + "quot;").split("<").join("&" + "lt;");
}
function db() {
  return new Promise(function (res, rej) {
    const r = indexedDB.open("ylc-grid", 1);
    r.onupgradeneeded = function () {
      const d = r.result;
      if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      if (!d.objectStoreNames.contains("photos")) d.createObjectStore("photos");
    };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function get(store, key) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const q = d.transaction(store).objectStore(store).get(key);
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  });
}
function put(store, key, val) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const tx = d.transaction(store, "readwrite");
      tx.objectStore(store).put(val, key);
      tx.oncomplete = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
    });
  });
}
function allStore(store) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      const tx = d.transaction(store);
      const q = tx.objectStore(store).getAll();
      const k = tx.objectStore(store).getAllKeys();
      q.onsuccess = function () {
        k.onsuccess = function () {
          const o = {};
          k.result.forEach(function (id, i) { o[id] = q.result[i]; });
          res(o);
        };
      };
      q.onerror = function () { rej(q.error); };
    });
  });
}
function loadMeta() {
  try { return JSON.parse(localStorage.getItem("ylc-meta") || "{}"); } catch (e) { return {}; }
}
function saveMeta() {
  try {
    localStorage.setItem("ylc-meta", JSON.stringify(META));
    const el = document.getElementById("saved");
    if (el) el.textContent = "已儲存";
    return true;
  } catch (e) {
    const el = document.getElementById("saved");
    if (el) el.textContent = "儲存失敗";
    return false;
  }
}
let META = loadMeta();
let PHOTOS = {};
const PUBLIC_PHOTOS = {
  "R52-2A-1": ["photos/R52-2A-1-1.jpg", "photos/R52-2A-1-2.jpg"],
  "R51-1A-1": ["photos/R51-1A-1-1.jpg"],
  "R72-2A-1": ["photos/R72-2A-1-1.jpg", "photos/R72-2A-1-2.jpg"],
  "R64-4A-1": ["photos/R64-4A-1-1.jpg", "photos/R64-4A-1-2.jpg"],
  "R54-4A-1": ["photos/R54-4A-1-1.jpg", "photos/R54-4A-1-2.jpg"],
  "R51-1E-1": ["photos/R51-1E-1-1.jpg", "photos/R51-1E-1-2.jpg", "photos/R51-1E-1-3.jpg"]
};
const SEED_META = {"R52-2A-1":{"status":"nfc","excavate":"2026-10-21","nfc":"2026-10-21","note":""},"R51-1A-1":{"status":"nfc","excavate":"2026-10-20","nfc":"2026-10-21","note":""},"R72-2A-1":{"status":"nfc","excavate":"2026-10-22","nfc":"2026-10-23","note":""},"R64-4A-1":{"status":"nfc","excavate":"2026-10-20","nfc":"2026-10-22","note":""},"R54-4A-1":{"status":"nfc","excavate":"2026-10-20","nfc":"2026-10-21","note":""},"R51-1E-1":{"status":"none","excavate":"","nfc":"","note":""}};

// Supabase config (public anon key is safe for frontend)
const SUPABASE_URL = "https://qsbdjamnjxgadenmzhlp.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYmRqYW1uanhnYWRlbm16aGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzE3NzQsImV4cCI6MjA4NjQ0Nzc3NH0.gT0UoqttWT-k05j98-9zp2IViMKym32mwv2_6GIpfAs";

async function sbFetch(path, opts) {
  const r = await fetch(SUPABASE_URL + path, Object.assign({
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": "Bearer " + SUPABASE_ANON,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }
  }, opts || {}));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function loadFromSupabase() {
  try {
    const rows = await sbFetch("/rest/v1/pits?select=*");
    rows.forEach(function(row) {
      META[row.id] = {
        status: row.status || "none",
        excavate: row.excavate || "",
        nfc: row.nfc || "",
        note: row.note || ""
      };
      if (row.photos && row.photos.length) {
        PHOTOS[row.id] = row.photos.slice();
      }
    });
    saveMeta();
    render();
  } catch (e) {
    console.warn("Supabase load failed", e);
  }
}

async function saveToSupabase(id, data) {
  try {
    await sbFetch("/rest/v1/pits", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        status: data.status,
        excavate: data.excavate || null,
        nfc: data.nfc || null,
        note: data.note || null,
        updated_at: new Date().toISOString()
      }),
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      }
    });
  } catch (e) {
    console.warn("Supabase save failed", e);
  }
}



async function uploadPhotoToSupabase(pitId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = pitId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const url = SUPABASE_URL + "/storage/v1/object/photos/" + path;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": "Bearer " + SUPABASE_ANON,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true"
    },
    body: file
  });
  if (!r.ok) throw new Error(await r.text());
  return SUPABASE_URL + "/storage/v1/object/public/photos/" + path;
}


async function savePhotosToSupabase(pitId, urls) {
  try {
    await sbFetch("/rest/v1/pits?id=eq." + encodeURIComponent(pitId), {
      method: "PATCH",
      body: JSON.stringify({ photos: urls, updated_at: new Date().toISOString() })
    });
  } catch (e) {
    console.warn("save photos failed", e);
  }
}

function meta(id) { return META[id] || { status: "none", excavate: "", nfc: "", note: "" }; }
function show(item) {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const f = document.getElementById("filter").value;
  const m = meta(item.id);
  if (f === "pit" && item.kind !== "pit") return false;
  if (f === "nail" && item.kind !== "nail") return false;
  if (["none", "exc", "nfc", "done"].indexOf(f) >= 0 && m.status !== f) return false;
  if (q && (item.id + " " + (item.marker || "") + " " + item.row).toLowerCase().indexOf(q) < 0) return false;
  return true;
}
function opts(cur) {
  return STATUS.map(function (s) {
    return '<option value="' + s.v + '"' + (s.v === cur ? " selected" : "") + ">" + s.t + "</option>";
  }).join("");
}
function cellBtn(item, top, mid) {
  const m = meta(item.id);
  const has = (PHOTOS[item.id] || []).length;
  const cls = item.kind === "nail" ? "nail" : "letter-" + item.letter;
  var statusPart = READ_ONLY
    ? '<div class="sub">' + ((STATUS.filter(function(s){return s.v===m.status})[0]||{t:"未開始"}).t) + "</div>"
    : '<select data-status="' + item.id + '">' + opts(m.status) + "</select>";
  return '<div class="cell ' + cls + " " + m.status + (has ? " has" : "") + '" data-id="' + item.id + '">' +
    '<div class="mk" data-open="' + item.id + '">' + top + "</div>" +
    '<div class="sub">' + mid + "</div>" +
    statusPart + "</div>";
}
function render() {
  const c = { none: 0, exc: 0, nfc: 0, done: 0, photo: 0 };
  ALL.forEach(function (it) {
    const m = meta(it.id);
    c[m.status] = (c[m.status] || 0) + 1;
    if ((PHOTOS[it.id] || []).length) c.photo++;
  });
  document.getElementById("stats").innerHTML =
    '<span class="chip">坑 <b>' + PITS.length + "</b></span>" +
    '<span class="chip">釘 <b>' + NAILS.length + "</b></span>" +
    '<span class="chip">未開始 <b>' + (c.none || 0) + "</b></span>" +
    '<span class="chip">已開挖 <b>' + (c.exc || 0) + "</b></span>" +
    '<span class="chip">已灌 <b>' + (c.nfc || 0) + "</b></span>" +
    '<span class="chip">已核實 <b>' + (c.done || 0) + "</b></span>" +
    '<span class="chip">有相 <b>' + c.photo + "</b></span>";

  let html = '<section class="band"><h3>Soil nails · left of pits · C / B / A down the slope</h3><div class="nailgrid">';
  html += '<div class="nhead">C</div><div class="nhead">B</div><div class="nhead">A</div>';
  for (let i = 1; i <= 9; i++) {
    ["C", "B", "A"].forEach(function (row) {
      const n = NAILS.filter(function (x) { return x.row === row && x.no === i; })[0];
      if (!n || !show(n)) { html += '<div class="empty"></div>'; return; }
      html += cellBtn(n, n.id, n.elev);
    });
  }
  html += "</div></section>";

  html += '<section class="band"><h3>NFC pits · 124 · columns = Row · rows downslope A-B-C-D-E</h3><div class="tri">';
  html += '<div class="heads"><div></div>';
  COLS.forEach(function (col) {
    html += '<div class="head">' + col.row + "</div>";
  });
  html += "</div>";
  const max = 11;
  for (let r = 0; r < max; r++) {
    html += '<div class="grid"><div class="rlabel">' + LETTERS[r % 5] + "</div>";
    COLS.forEach(function (col, ci) {
      const pit = PITS.filter(function (p) { return p.col === ci && p.stack === r; })[0];
      if (!pit || !show(pit)) {
        html += '<div class="empty"></div>';
        return;
      }
      html += cellBtn(pit, pit.marker, "");
    });
    html += "</div>";
  }
  html += "</div></section>";
  document.getElementById("plan").innerHTML = html;
  document.querySelectorAll(".cell").forEach(function (el) {
    el.onclick = function (ev) {
      if (ev.target.tagName === "SELECT") return;
      edit(el.getAttribute("data-id"));
    };
  });
  if (!READ_ONLY) document.querySelectorAll("[data-status]").forEach(function (el) {
    el.onchange = function (ev) {
      ev.stopPropagation();
      const id = el.getAttribute("data-status");
      const cur = meta(id);
      META[id] = { status: el.value, excavate: cur.excavate || "", nfc: cur.nfc || "", note: cur.note || "" };
      saveMeta();
      saveToSupabase(id, META[id]);
      put("meta", "all", META).catch(function () {});
      render();
    };
  });
}
function edit(id) {
  const item = ALL.filter(function (x) { return x.id === id; })[0];
  if (!item) return;
  location.hash = id;
  const m = meta(id);
  const photos = PHOTOS[id] || [];
  const info = item.kind === "nail"
    ? "elev " + item.elev + " mPD / " + item.angle + " deg / " + item.length + " m"
    : "Row " + item.row + " / " + item.marker + " / stack " + (item.stack + 1);
  const opts = STATUS.map(function (s) {
    return '<option value="' + s.v + '"' + (s.v === m.status ? " selected" : "") + ">" + s.t + "</option>";
  }).join("");
  document.getElementById("card").innerHTML =
    "<h2>" + item.id + "</h2>" +
    '<div class="note">' + (item.kind === "nail" ? "Soil nail" : "NFC pit") + " · " + info + "</div>" +
    '<div class="grid2">' +
    (READ_ONLY
      ? '<div class="field"><label>狀態</label><div>' + ((STATUS.filter(function(s){return s.v===m.status})[0]||{t:""}).t) + "</div></div>" +
        '<div class="field"><label>開始日期</label><div>' + (m.excavate || "-") + "</div></div>" +
        '<div class="field"><label>完成日期</label><div>' + (m.nfc || "-") + "</div></div>" +
        '<div class="field"><label>備註</label><div>' + esc(m.note || "-") + "</div></div>"
      : '<div class="field"><label>狀態</label><select id="f-status">' + opts + "</select></div>" +
        '<div class="field"><label>開始日期</label><input id="f-exc" type="date" value="' + (m.excavate || "") + '"></div>' +
        '<div class="field"><label>完成日期</label><input id="f-nfc" type="date" value="' + (m.nfc || "") + '"></div>' +
        '<div class="field"><label>備註</label><input id="f-note" type="text" value="' + esc(m.note) + '"></div>'
    ) +
    "</div>" +
    '<div class="field"><label>相片</label>' + (READ_ONLY ? "" : '<input id="f-photo" type="file" accept="image/*" multiple>') + '<div class="photos" id="photoBox"></div></div>' +
    '<div class="actions">' + (READ_ONLY ? "" : '<button class="primary" id="saveBtn">儲存</button>') + '<button id="dlBtn">下載 HTML</button><button id="closeBtn">關閉</button></div>' +
    '<div class="note">#' + id + "</div>";
  const box = document.getElementById("photoBox");
  photos.forEach(function (src, i) {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    const btn = document.createElement("button");
    btn.textContent = "移除";
    btn.onclick = function () {
      photos.splice(i, 1);
      PHOTOS[id] = photos;
      put("photos", id, photos);
      savePhotosToSupabase(id, photos.filter(function(u){ return String(u).indexOf("data:") !== 0; }));
      edit(id);
    };
    fig.appendChild(img);
    fig.appendChild(btn);
    box.appendChild(fig);
  });
  if (!READ_ONLY && document.getElementById("f-photo")) document.getElementById("f-photo").onchange = function (e) {
    const files = Array.prototype.slice.call(e.target.files);
    Promise.all(files.map(function (f) {
      return uploadPhotoToSupabase(id, f).catch(function () { return readFile(f); });
    })).then(function (urls) {
      urls.forEach(function (u) { if (u) photos.push(u); });
      PHOTOS[id] = photos;
      put("photos", id, photos);
      savePhotosToSupabase(id, photos.filter(function(u){ return u.indexOf("supabase.co") >= 0 || u.indexOf("photos/") === 0; }));
      edit(id);
    }).catch(function(err) {
      alert("上載失敗: " + (err && err.message ? err.message : err));
    });
  };
  if (!READ_ONLY) document.getElementById("saveBtn").onclick = function () {
    META[id] = {
      status: document.getElementById("f-status").value,
      excavate: document.getElementById("f-exc").value,
      nfc: document.getElementById("f-nfc").value,
      note: document.getElementById("f-note").value
    };
    saveMeta();
    saveToSupabase(id, META[id]);
    put("meta", "all", META).catch(function () {});
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("saved").textContent = "已儲存 " + id;
    render();
  };
  document.getElementById("dlBtn").onclick = function () {
    const html = "<!DOCTYPE html><meta charset=UTF-8><title>" + item.id + "</title><body><h1>" + item.id + "</h1><p>" + info + "</p>" + photos.map(function (s) { return '<img src="' + s + '" style="max-width:100%">'; }).join("") + "</body>";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = item.id + ".html";
    a.click();
  };
  document.getElementById("closeBtn").onclick = function () {
    document.getElementById("overlay").classList.remove("open");
    history.replaceState(null, "", location.pathname);
  };
  document.getElementById("overlay").classList.add("open");
}
function readFile(f) {
  return new Promise(function (res, rej) {
    const r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
document.getElementById("q").oninput = render;
document.getElementById("filter").onchange = render;
document.getElementById("overlay").onclick = function (e) {
  if (e.target.id === "overlay") document.getElementById("overlay").classList.remove("open");
};
if (READ_ONLY) {
  var eb = document.getElementById("exportBtn");
  var ib = document.getElementById("importBtn");
  if (eb) eb.style.display = "none";
  if (ib) ib.style.display = "none";
}
function exportHTML() {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function label(v) {
    var s = STATUS.filter(function(x){ return x.v === v; })[0];
    return s ? s.t : (v || "");
  }
  var rows = Object.keys(META).sort().map(function(id) {
    var m = META[id] || {};
    var ph = (PHOTOS[id] || []).map(function(u) {
      var src = String(u);
      if (src.indexOf("photos/") === 0) src = "https://yip-lgtm.github.io/YLC_PIT/" + src;
      return '<img src="' + esc(src) + '" style="max-width:140px;max-height:100px;margin:2px;border-radius:4px">';
    }).join("");
    return "<tr><td>" + esc(id) + "</td><td>" + esc(label(m.status)) + "</td><td>" + esc(m.excavate||"") + "</td><td>" + esc(m.nfc||"") + "</td><td>" + esc(m.note||"") + "</td><td>" + ph + "</td></tr>";
  }).join("");
  if (!rows) rows = "<tr><td colspan='6'>（沒有資料 — 請等頁面載入完成後再 export）</td></tr>";
  var html = '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YLC triangle export</title>' +
    '<style>body{font-family:system-ui,sans-serif;background:#0e141b;color:#e8eef6;margin:16px}h1{font-size:18px}table{border-collapse:collapse;width:100%;background:#17202b}th,td{border:1px solid #314155;padding:8px;text-align:left;vertical-align:top}th{background:#223044}img{display:inline-block}</style></head><body>' +
    '<h1>YLC triangle export · ' + new Date().toISOString().slice(0,10) + '</h1>' +
    '<p>共 ' + Object.keys(META).length + ' 個有記錄的坑</p>' +
    '<table><tr><th>ID</th><th>狀態</th><th>開始日期</th><th>完成日期</th><th>備註</th><th>相片</th></tr>' +
    rows + '</table></body></html>';
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  a.download = "YLC-grid.html";
  a.click();
}
document.getElementById("exportBtn").onclick = exportHTML;
document.getElementById("exportBtn").textContent = "export HTML";
document.getElementById("importBtn").onclick = function () { document.getElementById("importFile").click(); };
document.getElementById("importFile").onchange = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(function (text) {
    const data = JSON.parse(text);
    META = data.meta || {};
    PHOTOS = data.photos || {};
    saveMeta();
    put("meta", "all", META).catch(function () {});
    Promise.all(Object.keys(PHOTOS).map(function (k) { return put("photos", k, PHOTOS[k]); })).then(render);
  });
};
render();
Promise.all([get("meta", "all").catch(function () { return {}; }), allStore("photos").catch(function () { return {}; })]).then(function (pair) {
  // Force seed statuses for known pits (overwrite local "none")
  META = Object.assign({}, META, SEED_META);
  PHOTOS = pair[1] || {};
  // Always prefer public photos when available
  Object.keys(PUBLIC_PHOTOS).forEach(function(id) {
    PHOTOS[id] = PUBLIC_PHOTOS[id].slice();
  });
  saveMeta();
  render();
  loadFromSupabase();
  const h = location.hash.slice(1);
  if (h && ALL.some(function (x) { return x.id === h; })) edit(h);
}).catch(function () {});
