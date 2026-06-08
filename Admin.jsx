import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { SEED_VENUES, SEED_EVENTS } from "./data.js";

const T = {
  bg: "#0B0B19", card: "#161630", cardHover: "#1C1C40",
  accent: "#E94560", gold: "#F5C518", green: "#00C9A7",
  text: "#EEEEF6", textSec: "#9090B8", textDim: "#5E5E80",
  border: "#252548", radius: 14, radiusSm: 9,
};

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "circle2026";

// Полета за всяка таблица: [колона в базата, етикет, тип]
const VENUE_FIELDS = [
  ["id", "ID (уникален, напр. v31)", "text"],
  ["name", "Име", "text"],
  ["type", "Тип (Restaurant, Bar, Park...)", "text"],
  ["hood", "Квартал", "text"],
  ["rating", "Рейтинг (0-5)", "number"],
  ["lat", "Latitude", "number"],
  ["lng", "Longitude", "number"],
  ["icon", "Емоджи икона", "text"],
  ["description", "Описание", "textarea"],
  ["hours", "Работно време", "text"],
  ["phone", "Телефон", "text"],
  ["events_count", "Брой събития", "number"],
];

const EVENT_FIELDS = [
  ["id", "ID (уникален, напр. e64)", "text"],
  ["title", "Заглавие", "text"],
  ["cat", "Категория (music, food, bars...)", "text"],
  ["venue_id", "ID на обекта (напр. v1)", "text"],
  ["date", "Дата (напр. Jul 24)", "text"],
  ["day", "Ден (today, weekend, ...)", "text"],
  ["time", "Час (напр. 21:00)", "text"],
  ["price", "Цена (напр. 20 лв)", "text"],
  ["free", "Безплатно", "bool"],
  ["featured", "Отличено (карусел)", "bool"],
  ["outdoor", "На открито", "bool"],
  ["going", "Отиващи", "number"],
  ["interested", "Заинтересувани", "number"],
  ["description", "Описание", "textarea"],
  ["org_name", "Организатор — име", "text"],
  ["org_avatar", "Организатор — емоджи", "text"],
  ["grad", "Градиент (CSS, по избор)", "text"],
];

function emptyRow(fields) {
  const r = {};
  fields.forEach(([k, , t]) => { r[k] = t === "bool" ? false : ""; });
  return r;
}

function Field({ def, value, onChange }) {
  const [key, label, type] = def;
  const base = {
    width: "100%", background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, color: T.text, padding: "9px 12px",
    fontSize: 14, outline: "none", fontFamily: "inherit",
  };
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: T.textSec, display: "block", marginBottom: 5 }}>{label}</span>
      {type === "bool" ? (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(key, e.target.checked)}
          style={{ width: 20, height: 20, accentColor: T.accent }} />
      ) : type === "textarea" ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(key, e.target.value)} rows={3} style={base} />
      ) : (
        <input type={type === "number" ? "number" : "text"} value={value ?? ""}
          step="any"
          onChange={(e) => onChange(key, type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          style={base} />
      )}
    </label>
  );
}

function Editor({ table, fields, seed }) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setRows(seed.map((s) => ({ ...s }))); setLoading(false);
      setMsg("⚠ Supabase не е настроен — показвам seed данните (само за преглед).");
      return;
    }
    const { data, error } = await supabase.from(table).select("*");
    if (error) setMsg("Грешка при зареждане: " + error.message);
    else { setRows(data || []); setMsg(""); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!draft.id) { setMsg("ID е задължително."); return; }
    if (!isSupabaseConfigured) { setMsg("Supabase не е настроен — записът е изключен."); return; }
    const { error } = await supabase.from(table).upsert(draft);
    if (error) setMsg("Грешка при запис: " + error.message);
    else { setMsg("✓ Запазено."); setDraft(null); load(); }
  };

  const remove = async (id) => {
    if (!confirm("Да изтрия ли този запис?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMsg("Грешка при триене: " + error.message);
    else { setMsg("✓ Изтрито."); load(); }
  };

  const btn = (extra) => ({
    background: T.accent, color: "#fff", border: "none", borderRadius: T.radiusSm,
    padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", ...extra,
  });

  return (
    <div>
      {msg && <div style={{ background: T.card, color: T.gold, padding: "8px 12px", borderRadius: T.radiusSm, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {!draft && (
        <button style={{ ...btn(), marginBottom: 14 }} onClick={() => setDraft(emptyRow(fields))}>+ Нов запис</button>
      )}

      {draft && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16, marginBottom: 16 }}>
          {fields.map((f) => (
            <Field key={f[0]} def={f} value={draft[f[0]]}
              onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
          ))}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn()} onClick={save}>Запази</button>
            <button style={btn({ background: "transparent", border: `1px solid ${T.border}`, color: T.textSec })}
              onClick={() => { setDraft(null); setMsg(""); }}>Отказ</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: T.textDim }}>Зареждане…</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{r.icon || r.org_avatar || "•"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.text, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name || r.title}</div>
                <div style={{ color: T.textDim, fontSize: 11 }}>{r.id} · {r.type || r.cat}</div>
              </div>
              <button onClick={() => setDraft({ ...r })} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textSec, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Редакция</button>
              <button onClick={() => remove(r.id)} style={{ background: "transparent", border: `1px solid ${T.accent}55`, color: T.accent, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Изтрий</button>
            </div>
          ))}
          {rows.length === 0 && <div style={{ color: T.textDim, fontSize: 13 }}>Няма записи още.</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("venues");

  const wrap = { maxWidth: 560, margin: "0 auto", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: "20px 18px 60px" };

  if (!authed) {
    return (
      <div style={wrap}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;}`}</style>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>The Circle · Админ</h2>
        <p style={{ color: T.textSec, fontSize: 14, marginBottom: 20 }}>Въведи паролата, за да управляваш местата и събитията.</p>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Парола"
          onKeyDown={(e) => e.key === "Enter" && setAuthed(pass === ADMIN_PASS)}
          style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, padding: "12px 14px", fontSize: 15, outline: "none", marginBottom: 12 }} />
        <button onClick={() => setAuthed(pass === ADMIN_PASS)}
          style={{ width: "100%", background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Вход</button>
        {pass && pass !== ADMIN_PASS && <p style={{ color: T.accent, fontSize: 13, marginTop: 10 }}>Грешна парола.</p>}
        <button onClick={onClose} style={{ marginTop: 18, background: "transparent", border: "none", color: T.textDim, fontSize: 13, cursor: "pointer" }}>← Назад към приложението</button>
      </div>
    );
  }

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: "10px", background: tab === id ? T.accent : T.card,
      color: tab === id ? "#fff" : T.textSec, border: `1px solid ${T.border}`,
      borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <div style={wrap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;}::-webkit-scrollbar{width:0;}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20 }}>The Circle · Админ</h2>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textSec, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Готово</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {tabBtn("venues", "Обекти")}
        {tabBtn("events", "Събития")}
      </div>
      {tab === "venues"
        ? <Editor table="venues" fields={VENUE_FIELDS} seed={SEED_VENUES} />
        : <Editor table="events" fields={EVENT_FIELDS} seed={SEED_EVENTS} />}
    </div>
  );
}
