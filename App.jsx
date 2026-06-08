import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SEED_VENUES, SEED_EVENTS } from "./data.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import AdminPanel from "./Admin.jsx";

// ============================================================
// THE CIRCLE — PLOVDIV EVENTS DISCOVERY PLATFORM
// Full Web Application
// ============================================================

// --- THEME & COLORS ---
const T = {
  bg: "#0B0B19", bgAlt: "#10102A", card: "#161630", cardHover: "#1C1C40",
  accent: "#E94560", accentSoft: "#E9456022", secondary: "#0F3460", secondarySoft: "#0F346044",
  gold: "#F5C518", goldSoft: "#F5C51822", green: "#00C9A7", greenSoft: "#00C9A722",
  text: "#EEEEF6", textSec: "#9090B8", textDim: "#5E5E80",
  border: "#252548", borderLight: "#2F2F58",
  overlay: "rgba(11,11,25,0.85)",
  radius: 16, radiusSm: 10, radiusLg: 22,
};

// --- NEIGHBORHOODS ---
const NEIGHBORHOODS = ["All", "Kapana", "Old Town", "Center", "Trakia", "Kyuchuk Paris", "Karshiyaka", "Maritsa", "Smirnenski", "Gagarin", "Ostromila"];

// --- CATEGORIES ---
const CATS = [
  { id: "music", label: "Music & Concerts", icon: "🎵", color: "#E94560" },
  { id: "food", label: "Food & Drink", icon: "🍷", color: "#F5C518" },
  { id: "art", label: "Art & Culture", icon: "🎨", color: "#A259FF" },
  { id: "sports", label: "Sports", icon: "⚽", color: "#00C9A7" },
  { id: "theater", label: "Theater & Cinema", icon: "🎭", color: "#FF6B6B" },
  { id: "nightlife", label: "Nightlife", icon: "🌙", color: "#7C5CFC" },
  { id: "festivals", label: "Festivals", icon: "🎪", color: "#FF9F43" },
  { id: "tours", label: "Walks & Tours", icon: "🚶", color: "#54A0FF" },
  { id: "workshops", label: "Workshops", icon: "🛠️", color: "#F368E0" },
  { id: "kids", label: "Kids & Family", icon: "👨‍👩‍👧", color: "#FF6348" },
  { id: "outdoor", label: "Outdoor", icon: "🌿", color: "#2ED573" },
  { id: "oldtown", label: "Old Town & Hills", icon: "🏛️", color: "#DCDDE1" },
];



// --- DATA (mutable; filled from Supabase at runtime, seed as fallback) ---
let VENUES = [...SEED_VENUES];
let EVENTS = [...SEED_EVENTS];

const mapVenue = (r) => ({
  id: r.id, name: r.name, type: r.type, hood: r.hood, rating: r.rating,
  lat: r.lat, lng: r.lng, icon: r.icon, desc: r.description, hours: r.hours,
  phone: r.phone, eventsCount: r.events_count,
});
const mapEvent = (r) => ({
  id: r.id, title: r.title, cat: r.cat, venueId: r.venue_id, date: r.date,
  day: r.day, time: r.time, price: r.price, free: r.free, featured: r.featured,
  outdoor: r.outdoor, going: r.going, interested: r.interested, desc: r.description,
  org: { name: r.org_name, avatar: r.org_avatar }, grad: r.grad,
});

async function loadFromSupabase() {
  const [{ data: v }, { data: e }] = await Promise.all([
    supabase.from("venues").select("*").order("name"),
    supabase.from("events").select("*"),
  ]);
  return { venues: v, events: e };
}

const WANT_ADMIN = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("admin");

// --- HELPER FUNCTIONS ---
const getVenue = (id) => VENUES.find(v => v.id === id);
const getCat = (id) => CATS.find(c => c.id === id);
const getVenueEvents = (vid) => EVENTS.filter(e => e.venueId === vid);

// --- COMPONENTS ---

function CircleLogo({ size = 38 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", border:`2.5px solid ${T.accent}`, display:"flex", alignItems:"center", justifyContent:"center", background:`radial-gradient(circle at 35% 35%, ${T.secondary}55, transparent)`, boxShadow:`0 0 20px ${T.accent}33` }}>
        <span style={{ fontSize:size*0.42 }}>🏛️</span>
      </div>
      <div>
        <div style={{ fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:size*0.48, color:T.text, letterSpacing:1.5, lineHeight:1 }}>The Circle</div>
        <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:size*0.26, color:T.textDim, letterSpacing:4, textTransform:"uppercase" }}>Plovdiv</div>
      </div>
    </div>
  );
}

function Badge({ children, color = T.accent, bg }) {
  return <span style={{ background:bg||color+"22", color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{children}</span>;
}

function Section({ title, action, onAction, children, style:s }) {
  return (
    <div style={{ marginTop:28, ...s }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <h3 style={{ fontSize:17, fontWeight:700, color:T.text, fontFamily:"'Syne', sans-serif", margin:0 }}>{title}</h3>
        {action && <span onClick={onAction} style={{ fontSize:12, color:T.accent, cursor:"pointer", fontWeight:600 }}>{action} →</span>}
      </div>
      {children}
    </div>
  );
}

function HScroll({ children }) {
  return <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:8, scrollSnapType:"x mandatory" }}>{children}</div>;
}

function EventCard({ event, onClick, compact, style:s }) {
  const venue = getVenue(event.venueId);
  const cat = getCat(event.cat);
  return (
    <div onClick={() => onClick(event)} style={{
      background:T.card, borderRadius:T.radius, padding:compact?14:18, cursor:"pointer",
      border:`1px solid ${T.border}`, transition:"all 0.25s cubic-bezier(.4,0,.2,1)",
      minWidth:compact?240:undefined, flex:compact?"0 0 240px":undefined, scrollSnapAlign:"start", ...s,
    }}
    onMouseEnter={e=>{e.currentTarget.style.background=T.cardHover;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=T.borderLight}}
    onMouseLeave={e=>{e.currentTarget.style.background=T.card;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=T.border}}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, gap:8 }}>
        <span style={{ fontSize:11, color:cat?.color||T.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{cat?.icon} {cat?.label}</span>
        {event.free ? <Badge color={T.green}>FREE</Badge> : <span style={{ color:T.gold, fontSize:13, fontWeight:700 }}>{event.price}</span>}
      </div>
      <div style={{ fontSize:compact?15:17, fontWeight:700, color:T.text, fontFamily:"'Syne', sans-serif", lineHeight:1.3, marginBottom:8 }}>{event.title}</div>
      <div style={{ fontSize:12, color:T.textSec, marginBottom:3 }}>📍 {venue?.name} · {venue?.hood}</div>
      <div style={{ fontSize:12, color:T.textSec }}>📅 {event.date} · {event.time}</div>
      {!compact && (
        <div style={{ display:"flex", gap:10, marginTop:12, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:T.textDim }}>👥 {event.going?.toLocaleString()} going</span>
          {event.outdoor && <Badge color={T.green} bg={T.greenSoft}>Outdoor</Badge>}
        </div>
      )}
    </div>
  );
}

function VenueCard({ venue, onClick }) {
  return (
    <div onClick={() => onClick(venue)} style={{
      background:T.card, borderRadius:T.radius, padding:16, cursor:"pointer",
      border:`1px solid ${T.border}`, transition:"all 0.25s cubic-bezier(.4,0,.2,1)",
    }}
    onMouseEnter={e=>{e.currentTarget.style.background=T.cardHover;e.currentTarget.style.transform="translateY(-2px)"}}
    onMouseLeave={e=>{e.currentTarget.style.background=T.card;e.currentTarget.style.transform="translateY(0)"}}
    >
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg, ${T.secondary}66, ${T.accent}33)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{venue.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:"'Syne', sans-serif" }}>{venue.name}</div>
          <div style={{ fontSize:12, color:T.textSec }}>{venue.type} · {venue.hood}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.gold }}>★ {venue.rating}</div>
          <div style={{ fontSize:11, color:T.textDim }}>{venue.eventsCount} events</div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCarousel({ events, onClick }) {
  const [idx, setIdx] = useState(0);
  const featured = events.filter(e => e.featured);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i+1)%featured.length), 5000); return ()=>clearInterval(t); }, [featured.length]);
  const e = featured[idx]; const venue = getVenue(e.venueId);
  return (
    <div onClick={()=>onClick(e)} style={{
      background:e.grad||`linear-gradient(135deg,${T.secondary},${T.accent})`,
      borderRadius:T.radiusLg, padding:"32px 28px 24px", cursor:"pointer", position:"relative", overflow:"hidden", minHeight:190,
    }}>
      <div style={{ position:"absolute", top:-30, right:-30, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
      <div style={{ position:"absolute", bottom:-20, left:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
      <div style={{ position:"absolute", top:18, right:18, display:"flex", gap:6 }}>
        {e.free ? <Badge color="#000" bg={T.green}>FREE</Badge> : <Badge color={T.gold} bg="rgba(0,0,0,0.35)">{e.price}</Badge>}
      </div>
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:3, marginBottom:8 }}>Featured</div>
        <div style={{ fontSize:24, fontWeight:800, color:"#fff", fontFamily:"'Syne', sans-serif", lineHeight:1.2, marginBottom:8 }}>{e.title}</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.8)", marginBottom:14 }}>{venue?.name} · {e.date} · {e.time}</div>
        <div style={{ display:"flex", gap:16 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>🔥 {e.interested?.toLocaleString()} interested</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>👥 {e.going?.toLocaleString()} going</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:18 }}>
        {featured.map((_,i)=><div key={i} onClick={ev=>{ev.stopPropagation();setIdx(i)}} style={{ width:i===idx?22:7, height:7, borderRadius:4, background:i===idx?"#fff":"rgba(255,255,255,0.3)", transition:"all 0.35s", cursor:"pointer" }} />)}
      </div>
    </div>
  );
}

function MapPreview({ venues, onVenueClick }) {
  return (
    <div style={{ background:T.card, borderRadius:T.radiusLg, padding:20, border:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}>
      <div style={{ height:200, borderRadius:T.radius, background:`linear-gradient(160deg, ${T.secondary}33, ${T.bg})`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:"100%", height:"100%", opacity:0.08, background:"repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,0.15) 24px,rgba(255,255,255,0.15) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,0.15) 24px,rgba(255,255,255,0.15) 25px)" }} />
        <svg viewBox="0 0 400 200" style={{ position:"absolute", width:"100%", height:"100%", opacity:0.12 }}>
          <path d="M50,120 Q100,80 150,100 T250,90 T350,110" stroke={T.accent} fill="none" strokeWidth="1.5" />
          <path d="M30,150 Q120,130 200,140 T380,135" stroke={T.secondary} fill="none" strokeWidth="1" />
        </svg>
        {venues.slice(0,8).map((v,i)=>{
          const x = 15 + ((v.lng - 24.742) / 0.03) * 70;
          const y = 85 - ((v.lat - 42.128) / 0.03) * 70;
          return <div key={v.id} onClick={()=>onVenueClick(v)} style={{
            position:"absolute", left:`${Math.max(5,Math.min(90,x))}%`, top:`${Math.max(8,Math.min(85,y))}%`,
            cursor:"pointer", zIndex:2, transition:"transform 0.2s",
          }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.4)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          >
            <div style={{ width:14, height:14, borderRadius:"50%", background:T.accent, border:"2.5px solid rgba(255,255,255,0.9)", boxShadow:`0 0 10px ${T.accent}66`, }} />
          </div>;
        })}
        <div style={{ position:"absolute", bottom:10, left:14, fontSize:12, color:T.textDim, fontFamily:"'DM Sans', sans-serif" }}>📍 Plovdiv, Bulgaria · 42.15°N 24.75°E</div>
      </div>
    </div>
  );
}

function EventDetail({ event, onBack, onVenue }) {
  const venue = getVenue(event.venueId);
  const cat = getCat(event.cat);
  const similar = EVENTS.filter(e => e.cat === event.cat && e.id !== event.id).slice(0,3);
  const [saved, setSaved] = useState(false);
  const [going, setGoing] = useState(false);
  return (
    <div>
      <div style={{
        background:event.grad||`linear-gradient(135deg,${T.secondary},${T.bg})`,
        borderRadius:T.radiusLg, padding:"28px 24px 22px", marginBottom:20, position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div onClick={onBack} style={{ cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.65)", marginBottom:18, display:"inline-flex", alignItems:"center", gap:6 }}>← Back</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", textTransform:"uppercase", letterSpacing:2.5, marginBottom:6 }}>{cat?.icon} {cat?.label}</div>
        <div style={{ fontSize:26, fontWeight:800, color:"#fff", fontFamily:"'Syne', sans-serif", lineHeight:1.2, marginBottom:10 }}>{event.title}</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)" }}>{venue?.name} · {venue?.hood}</div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          {event.outdoor && <Badge color="#fff" bg="rgba(255,255,255,0.15)">🌤 Outdoor</Badge>}
          {event.free ? <Badge color="#000" bg={T.green}>FREE</Badge> : <Badge color={T.gold} bg="rgba(0,0,0,0.3)">{event.price}</Badge>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div style={{ background:T.card, borderRadius:T.radius, padding:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Date & Time</div>
          <div style={{ fontSize:15, fontWeight:600, color:T.text }}>📅 {event.date}</div>
          <div style={{ fontSize:13, color:T.textSec, marginTop:2 }}>🕐 {event.time}</div>
        </div>
        <div style={{ background:T.card, borderRadius:T.radius, padding:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Price</div>
          <div style={{ fontSize:22, fontWeight:800, color:event.free?T.green:T.gold, fontFamily:"'Syne', sans-serif" }}>{event.free?"Free":event.price}</div>
        </div>
      </div>

      <div style={{ background:T.card, borderRadius:T.radius, padding:18, marginBottom:16, border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8 }}>About</div>
        <div style={{ fontSize:13, color:T.textSec, lineHeight:1.7 }}>{event.desc}</div>
      </div>

      <div onClick={()=>onVenue(venue)} style={{ background:T.card, borderRadius:T.radius, padding:16, marginBottom:16, border:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:44, height:44, borderRadius:"50%", background:`${T.secondary}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{venue?.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{venue?.name}</div>
          <div style={{ fontSize:12, color:T.textSec }}>{venue?.type} · {venue?.hood}</div>
        </div>
        <span style={{ color:T.textDim, fontSize:18 }}>›</span>
      </div>

      {event.org && (
        <div style={{ background:T.card, borderRadius:T.radius, padding:16, marginBottom:16, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:`${T.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{event.org.avatar}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:T.textDim, textTransform:"uppercase", letterSpacing:1 }}>Organizer</div>
            <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{event.org.name}</div>
          </div>
          <button style={{ background:T.accent+"22", color:T.accent, border:"none", borderRadius:20, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Follow</button>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <div style={{ flex:1, background:T.card, borderRadius:T.radius, padding:14, textAlign:"center", border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:20, fontWeight:800, color:T.accent, fontFamily:"'Syne', sans-serif" }}>{event.going?.toLocaleString()}</div>
          <div style={{ fontSize:11, color:T.textDim }}>Going</div>
        </div>
        <div style={{ flex:1, background:T.card, borderRadius:T.radius, padding:14, textAlign:"center", border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:20, fontWeight:800, color:T.gold, fontFamily:"'Syne', sans-serif" }}>{event.interested?.toLocaleString()}</div>
          <div style={{ fontSize:11, color:T.textDim }}>Interested</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <button onClick={()=>setGoing(!going)} style={{ flex:2, background:going?T.green:T.accent, color:"#fff", border:"none", borderRadius:T.radius, padding:"15px 0", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"'Syne', sans-serif", transition:"all 0.2s" }}>
          {going ? "✓ Going!" : "🎟️ Get Tickets"}
        </button>
        <button onClick={()=>setSaved(!saved)} style={{ flex:1, background:saved?T.gold+"22":T.card, color:saved?T.gold:T.text, border:`1px solid ${saved?T.gold:T.border}`, borderRadius:T.radius, padding:"15px 0", fontSize:14, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>
          {saved ? "★ Saved" : "♡ Save"}
        </button>
        <button style={{ flex:1, background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"15px 0", fontSize:14, fontWeight:600, cursor:"pointer" }}>↗ Share</button>
      </div>

      {similar.length > 0 && (
        <Section title="Similar Events">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {similar.map(ev=><EventCard key={ev.id} event={ev} onClick={()=>{}} compact={false} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

function VenueDetail({ venue, onBack, onEvent }) {
  const events = getVenueEvents(venue.id);
  const [fav, setFav] = useState(false);
  return (
    <div>
      <div style={{
        background:`linear-gradient(135deg, ${T.secondary}, ${T.bg})`,
        borderRadius:T.radiusLg, padding:"28px 24px 22px", marginBottom:20, position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,0.025)", transform:"translate(-50%,-50%)" }} />
        <div onClick={onBack} style={{ cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.65)", marginBottom:18, display:"inline-flex", alignItems:"center", gap:6 }}>← Back</div>
        <div style={{ fontSize:48, marginBottom:12 }}>{venue.icon}</div>
        <div style={{ fontSize:24, fontWeight:800, color:"#fff", fontFamily:"'Syne', sans-serif", marginBottom:6 }}>{venue.name}</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>{venue.type} · {venue.hood}</div>
        <div style={{ fontSize:18, fontWeight:700, color:T.gold, marginTop:8 }}>★ {venue.rating}</div>
      </div>

      <div style={{ background:T.card, borderRadius:T.radius, padding:18, marginBottom:16, border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:13, color:T.textSec, lineHeight:1.7 }}>{venue.desc}</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div style={{ background:T.card, borderRadius:T.radius, padding:14, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:4 }}>Hours</div>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>🕐 {venue.hours}</div>
        </div>
        <div style={{ background:T.card, borderRadius:T.radius, padding:14, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:4 }}>Neighborhood</div>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>📍 {venue.hood}</div>
        </div>
      </div>
      {venue.phone && (
        <div style={{ background:T.card, borderRadius:T.radius, padding:14, marginBottom:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:4 }}>Phone</div>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>📞 {venue.phone}</div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <button style={{ flex:1, background:T.accent, color:"#fff", border:"none", borderRadius:T.radius, padding:"14px 0", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Syne', sans-serif" }}>📍 Navigate</button>
        <button onClick={()=>setFav(!fav)} style={{ flex:1, background:fav?T.gold+"22":T.card, color:fav?T.gold:T.text, border:`1px solid ${fav?T.gold:T.border}`, borderRadius:T.radius, padding:"14px 0", fontSize:14, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>
          {fav ? "★ Favorite" : "♡ Favorite"}
        </button>
      </div>

      {events.length > 0 && (
        <Section title={`Upcoming Events Here (${events.length})`}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.map(ev=><EventCard key={ev.id} event={ev} onClick={onEvent} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

// --- SCREENS ---

function HomeScreen({ onEvent, onVenue }) {
  const today = EVENTS.filter(e => e.day === "today");
  const weekend = EVENTS.filter(e => e.day === "weekend").slice(0,8);
  const free = EVENTS.filter(e => e.free).slice(0,5);
  const topVenues = VENUES.filter(v => v.rating >= 4.6).slice(0,6);
  return (
    <div>
      <FeaturedCarousel events={EVENTS} onClick={onEvent} />
      {today.length > 0 && (
        <Section title="🔴 Today in Plovdiv">
          <HScroll>{today.map(e=><EventCard key={e.id} event={e} onClick={onEvent} compact />)}</HScroll>
        </Section>
      )}
      <Section title="🗓️ This Weekend">
        <HScroll>{weekend.map(e=><EventCard key={e.id} event={e} onClick={onEvent} compact />)}</HScroll>
      </Section>
      <Section title="🎉 Free Events">
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {free.map(e=><EventCard key={e.id} event={e} onClick={onEvent} />)}
        </div>
      </Section>
      <Section title="📍 Popular Venues">
        <HScroll>
          {topVenues.map(v=>(
            <div key={v.id} onClick={()=>onVenue(v)} style={{ minWidth:140, flex:"0 0 140px", background:T.card, borderRadius:T.radius, padding:16, textAlign:"center", cursor:"pointer", border:`1px solid ${T.border}`, scrollSnapAlign:"start", transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent+"66"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
            >
              <div style={{ fontSize:32, marginBottom:6 }}>{v.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, fontFamily:"'Syne', sans-serif" }}>{v.name}</div>
              <div style={{ fontSize:11, color:T.gold, marginTop:4 }}>★ {v.rating}</div>
            </div>
          ))}
        </HScroll>
      </Section>
    </div>
  );
}

function ExploreScreen({ onEvent, onVenue }) {
  const [selCat, setSelCat] = useState(null);
  const [selHood, setSelHood] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const filtered = useMemo(() => {
    let f = EVENTS;
    if (selCat) f = f.filter(e => e.cat === selCat);
    if (selHood !== "All") f = f.filter(e => getVenue(e.venueId)?.hood === selHood);
    if (dateFilter === "today") f = f.filter(e => e.day === "today");
    if (dateFilter === "weekend") f = f.filter(e => e.day === "weekend");
    if (dateFilter === "tomorrow") f = f.filter(e => e.day === "tomorrow");
    if (priceFilter === "free") f = f.filter(e => e.free);
    if (priceFilter === "paid") f = f.filter(e => !e.free);
    return f;
  }, [selCat, selHood, dateFilter, priceFilter]);

  return (
    <div>
      <MapPreview venues={VENUES} onVenueClick={onVenue} />

      <Section title="Filters">
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {["all","today","tomorrow","weekend"].map(d=>(
            <span key={d} onClick={()=>setDateFilter(d)} style={{
              background:dateFilter===d?T.accent:T.card, color:dateFilter===d?"#fff":T.textSec,
              padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
              border:`1px solid ${dateFilter===d?T.accent:T.border}`, textTransform:"capitalize",
            }}>{d==="all"?"Any date":d}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {["all","free","paid"].map(p=>(
            <span key={p} onClick={()=>setPriceFilter(p)} style={{
              background:priceFilter===p?T.gold:T.card, color:priceFilter===p?"#000":T.textSec,
              padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
              border:`1px solid ${priceFilter===p?T.gold:T.border}`, textTransform:"capitalize",
            }}>{p==="all"?"Any price":p}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
          {NEIGHBORHOODS.map(h=>(
            <span key={h} onClick={()=>setSelHood(h)} style={{
              background:selHood===h?T.secondary:T.card, color:selHood===h?"#fff":T.textSec,
              padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
              border:`1px solid ${selHood===h?T.secondary:T.border}`,
            }}>{h}</span>
          ))}
        </div>
      </Section>

      <Section title="Categories">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 }}>
          {CATS.map(cat=>(
            <div key={cat.id} onClick={()=>setSelCat(selCat===cat.id?null:cat.id)} style={{
              background:selCat===cat.id?cat.color+"22":T.card, border:`1px solid ${selCat===cat.id?cat.color:T.border}`,
              borderRadius:T.radiusSm, padding:"10px 4px", textAlign:"center", cursor:"pointer", transition:"all 0.2s",
            }}>
              <div style={{ fontSize:22, marginBottom:3 }}>{cat.icon}</div>
              <div style={{ fontSize:9, color:selCat===cat.id?cat.color:T.textDim, fontWeight:700, lineHeight:1.2 }}>{cat.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`${selCat?getCat(selCat)?.label:"All"} Events (${filtered.length})`}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.length > 0 ? filtered.map(e=><EventCard key={e.id} event={e} onClick={onEvent} />) : (
            <div style={{ textAlign:"center", padding:40, color:T.textDim }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:14 }}>No events match your filters</div>
              <div style={{ fontSize:12, marginTop:4 }}>Try adjusting your criteria</div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function VenuesScreen({ onVenue }) {
  const [filter, setFilter] = useState("All");
  const [hoodFilter, setHoodFilter] = useState("All");
  const types = ["All", ...new Set(VENUES.map(v=>v.type))];
  const filtered = VENUES.filter(v => (filter==="All"||v.type===filter) && (hoodFilter==="All"||v.hood===hoodFilter));
  return (
    <div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:12, paddingBottom:4 }}>
        {types.map(t=>(
          <span key={t} onClick={()=>setFilter(t)} style={{
            background:filter===t?T.accent:T.card, color:filter===t?"#fff":T.textSec,
            padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
            border:`1px solid ${filter===t?T.accent:T.border}`,
          }}>{t}</span>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
        {NEIGHBORHOODS.map(h=>(
          <span key={h} onClick={()=>setHoodFilter(h)} style={{
            background:hoodFilter===h?T.secondary:T.card, color:hoodFilter===h?"#fff":T.textSec,
            padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
            border:`1px solid ${hoodFilter===h?T.secondary:T.border}`,
          }}>{h}</span>
        ))}
      </div>
      <div style={{ fontSize:13, color:T.textDim, marginBottom:12 }}>{filtered.length} venues</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(v=><VenueCard key={v.id} venue={v} onClick={onVenue} />)}
      </div>
    </div>
  );
}

function TicketsScreen() {
  const [tab, setTab] = useState("upcoming");
  const mockTickets = EVENTS.slice(0,4);
  return (
    <div>
      <div style={{ display:"flex", gap:4, marginBottom:20, background:T.card, borderRadius:T.radius, padding:4 }}>
        {["upcoming","past","saved"].map(t=>(
          <span key={t} onClick={()=>setTab(t)} style={{
            flex:1, textAlign:"center", padding:"10px 0", borderRadius:T.radiusSm,
            background:tab===t?T.accent:"transparent", color:tab===t?"#fff":T.textSec,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s", textTransform:"capitalize",
          }}>{t}</span>
        ))}
      </div>
      {tab==="upcoming" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mockTickets.map(e=>{
            const venue = getVenue(e.venueId);
            return (
              <div key={e.id} style={{ background:T.card, borderRadius:T.radiusLg, overflow:"hidden", border:`1px solid ${T.border}` }}>
                <div style={{ height:4, background:e.grad||`linear-gradient(90deg,${T.accent},${T.secondary})` }} />
                <div style={{ padding:18, display:"flex", gap:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:"'Syne', sans-serif", marginBottom:6 }}>{e.title}</div>
                    <div style={{ fontSize:12, color:T.textSec }}>📍 {venue?.name}</div>
                    <div style={{ fontSize:12, color:T.textSec }}>📅 {e.date} · {e.time}</div>
                    <div style={{ marginTop:10, display:"flex", gap:8 }}>
                      <Badge color={T.accent}>📱 Show QR</Badge>
                      <Badge color={T.secondary} bg={T.secondarySoft}>📅 Calendar</Badge>
                    </div>
                  </div>
                  <div style={{ width:64, height:64, background:"#fff", borderRadius:T.radiusSm, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ width:52, height:52, background:"repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50%/6px 6px", borderRadius:4 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab==="past" && (
        <div style={{ textAlign:"center", padding:50, color:T.textDim }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🕐</div>
          <div style={{ fontSize:15, fontWeight:600 }}>No past events yet</div>
          <div style={{ fontSize:13, marginTop:6 }}>Your event history will appear here</div>
        </div>
      )}
      {tab==="saved" && (
        <div style={{ textAlign:"center", padding:50, color:T.textDim }}>
          <div style={{ fontSize:48, marginBottom:12 }}>♡</div>
          <div style={{ fontSize:15, fontWeight:600 }}>The Circle is empty...</div>
          <div style={{ fontSize:13, marginTop:6 }}>Save events to find them here</div>
        </div>
      )}
    </div>
  );
}

function ProfileScreen() {
  const [lang, setLang] = useState("BG");
  const favCats = ["music","food","festivals","outdoor","nightlife"];
  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:90, height:90, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.secondary})`, margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, border:`3px solid ${T.accent}33`, boxShadow:`0 0 30px ${T.accent}22` }}>👤</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.text, fontFamily:"'Syne', sans-serif" }}>Alex Dimitrov</div>
        <div style={{ fontSize:13, color:T.textSec, marginTop:2 }}>📍 Plovdiv, Bulgaria</div>
        <div style={{ fontSize:12, color:T.textDim, marginTop:6 }}>Music lover · Food explorer · Festival addict 🎵🍷🎪</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[{n:"12",l:"Events Attended"},{n:"8",l:"Favorite Venues"},{n:"34",l:"Following"}].map(s=>(
          <div key={s.l} style={{ background:T.card, borderRadius:T.radius, padding:14, textAlign:"center", border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.accent, fontFamily:"'Syne', sans-serif" }}>{s.n}</div>
            <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <Section title="Favorite Categories">
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {favCats.map(id=>{const c=getCat(id);return <Badge key={id} color={c?.color}>{c?.icon} {c?.label}</Badge>})}
        </div>
      </Section>

      <Section title="Language">
        <div style={{ display:"flex", gap:8 }}>
          {["BG","EN"].map(l=>(
            <span key={l} onClick={()=>setLang(l)} style={{
              background:lang===l?T.accent:T.card, color:lang===l?"#fff":T.textSec,
              padding:"8px 20px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer",
              border:`1px solid ${lang===l?T.accent:T.border}`,
            }}>{l==="BG"?"🇧🇬 Български":"🇬🇧 English"}</span>
          ))}
        </div>
      </Section>

      <Section title="Settings">
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {["🔔 Notifications","🌙 Dark Mode (Active)","📍 Location Services","ℹ️ About The Circle","📝 Terms & Privacy","🚪 Log Out"].map(item=>(
            <div key={item} style={{
              background:T.card, borderRadius:T.radiusSm, padding:"13px 18px", border:`1px solid ${T.border}`,
              fontSize:14, color:item.includes("Log Out")?T.accent:T.text, cursor:"pointer",
              display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
            onMouseLeave={e=>e.currentTarget.style.background=T.card}
            >
              {item} <span style={{ color:T.textDim }}>›</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// --- ONBOARDING ---
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [selectedCats, setSelectedCats] = useState([]);
  const steps = [
    { title:"Welcome to\nThe Circle", sub:"Discover the best events, places, and experiences in Plovdiv", icon:"◯", col:T.accent },
    { title:"What do you love?", sub:"Pick your interests for personalized recommendations", icon:"♡", col:T.gold },
    { title:"Stay in the loop", sub:"Enable notifications so you never miss an event in Plovdiv", icon:"🔔", col:T.green },
  ];
  const s = steps[step];
  const toggleCat = (id) => setSelectedCats(prev => prev.includes(id) ? prev.filter(c=>c!==id) : [...prev,id]);

  return (
    <div style={{
      width:"100%", height:"100vh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:32, textAlign:"center", position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:"10%", right:"10%", width:200, height:200, borderRadius:"50%", background:`${T.accent}08`, filter:"blur(60px)" }} />
      <div style={{ position:"absolute", bottom:"15%", left:"5%", width:250, height:250, borderRadius:"50%", background:`${T.secondary}0A`, filter:"blur(80px)" }} />
      <div style={{
        width:130, height:130, borderRadius:"50%", border:`2.5px solid ${s.col}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:step===0?50:44,
        background:`radial-gradient(circle, ${s.col}15, transparent)`, boxShadow:`0 0 40px ${s.col}22`,
        marginBottom:36, transition:"all 0.5s",
      }}>{s.icon}</div>
      <div style={{ fontSize:30, fontWeight:800, color:T.text, fontFamily:"'Syne', sans-serif", lineHeight:1.2, marginBottom:14, whiteSpace:"pre-line" }}>{s.title}</div>
      <div style={{ fontSize:15, color:T.textSec, marginBottom:36, maxWidth:320, lineHeight:1.5 }}>{s.sub}</div>
      {step===1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:28, maxWidth:380 }}>
          {CATS.map(c=>(
            <span key={c.id} onClick={()=>toggleCat(c.id)} style={{
              background:selectedCats.includes(c.id)?c.color+"33":T.card,
              border:`1px solid ${selectedCats.includes(c.id)?c.color:T.border}`,
              padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600,
              color:selectedCats.includes(c.id)?c.color:T.textSec, cursor:"pointer", transition:"all 0.2s",
            }}>{c.icon} {c.label}</span>
          ))}
        </div>
      )}
      {step===2 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ width:70, height:70, borderRadius:"50%", background:`${T.green}22`, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, border:`2px solid ${T.green}44` }}>🔔</div>
        </div>
      )}
      <button onClick={()=>{if(step<2)setStep(step+1);else onDone()}} style={{
        background:s.col, color:step===1?"#000":"#fff", border:"none", borderRadius:T.radius,
        padding:"15px 52px", fontSize:17, fontWeight:700, cursor:"pointer", fontFamily:"'Syne', sans-serif",
        boxShadow:`0 8px 30px ${s.col}44`, transition:"all 0.2s",
      }}>
        {step<2?"Continue":"Enter The Circle"}
      </button>
      <div style={{ display:"flex", gap:8, marginTop:28 }}>
        {steps.map((_,i)=><div key={i} style={{ width:i===step?24:8, height:8, borderRadius:4, background:i===step?s.col:T.border, transition:"all 0.35s" }} />)}
      </div>
      {step>0 && <span onClick={()=>setStep(step-1)} style={{ position:"absolute", top:24, left:24, color:T.textDim, cursor:"pointer", fontSize:14 }}>← Back</span>}
    </div>
  );
}

// --- MAIN APP ---
const TABS = [
  { id:"home", label:"Home", icon:"⌂" },
  { id:"explore", label:"Explore", icon:"◎" },
  { id:"venues", label:"Venues", icon:"⊡" },
  { id:"tickets", label:"Tickets", icon:"⊞" },
  { id:"profile", label:"Profile", icon:"○" },
];

export default function TheCircleApp() {
  const [tab, setTab] = useState("home");
  const [selEvent, setSelEvent] = useState(null);
  const [selVenue, setSelVenue] = useState(null);
  const [onboarding, setOnboarding] = useState(true);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [showAdmin, setShowAdmin] = useState(WANT_ADMIN);
  const scrollRef = useRef(null);

  const reloadData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { venues, events } = await loadFromSupabase();
      if (venues && venues.length) { VENUES.length = 0; VENUES.push(...venues.map(mapVenue)); }
      if (events && events.length) { EVENTS.length = 0; EVENTS.push(...events.map(mapEvent)); }
      setVersion((v) => v + 1);
    } catch (err) { console.error("Supabase load failed:", err); }
  }, []);

  useEffect(() => { reloadData(); }, [reloadData]);

  if (showAdmin) {
    return <AdminPanel onClose={() => { setShowAdmin(false); reloadData(); }} />;
  }

  const onEvent = useCallback((e) => { setSelEvent(e); setSelVenue(null); scrollRef.current?.scrollTo(0,0); }, []);
  const onVenue = useCallback((v) => { setSelVenue(v); setSelEvent(null); scrollRef.current?.scrollTo(0,0); }, []);
  const goBack = useCallback(() => { setSelEvent(null); setSelVenue(null); }, []);
  const switchTab = useCallback((id) => { setTab(id); setSelEvent(null); setSelVenue(null); scrollRef.current?.scrollTo(0,0); }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return {
      events: EVENTS.filter(e => e.title.toLowerCase().includes(q) || e.cat.includes(q) || getVenue(e.venueId)?.name.toLowerCase().includes(q)),
      venues: VENUES.filter(v => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.hood.toLowerCase().includes(q)),
    };
  }, [search]);

  if (onboarding) return (
    <div style={{ maxWidth:420, margin:"0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:0;height:0;}`}</style>
      <Onboarding onDone={()=>setOnboarding(false)} />
    </div>
  );

  return (
    <div style={{ maxWidth:420, margin:"0 auto", height:"100vh", background:T.bg, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif;}::-webkit-scrollbar{width:0;height:0;}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:"14px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, background:T.bg, flexShrink:0 }}>
        <CircleLogo size={36} />
        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          <span style={{ fontSize:18, cursor:"pointer", filter:"grayscale(0.3)" }}>🔔</span>
          <span style={{ fontSize:18, cursor:"pointer", filter:"grayscale(0.3)" }}>🌐</span>
        </div>
      </div>

      {/* Search */}
      {!selEvent && !selVenue && (
        <div style={{ padding:"12px 20px 6px", flexShrink:0 }}>
          <div style={{ background:T.card, borderRadius:T.radius, padding:"11px 18px", display:"flex", alignItems:"center", gap:12, border:`1px solid ${T.border}` }}>
            <span style={{ color:T.textDim, fontSize:16 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events, venues, categories..."
              style={{ background:"transparent", border:"none", outline:"none", color:T.text, fontSize:14, flex:1, fontFamily:"'DM Sans', sans-serif" }} />
            {search && <span onClick={()=>setSearch("")} style={{ color:T.textDim, cursor:"pointer", fontSize:16 }}>✕</span>}
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"8px 20px 24px" }}>
        <div style={{ animation:"slideUp 0.3s ease" }}>
          {/* Search results */}
          {searchResults ? (
            <div>
              <Section title={`Events (${searchResults.events.length})`} style={{marginTop:12}}>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {searchResults.events.length > 0 ? searchResults.events.slice(0,10).map(e=><EventCard key={e.id} event={e} onClick={onEvent} />) :
                    <div style={{ color:T.textDim, fontSize:13, padding:16, textAlign:"center" }}>No events found</div>}
                </div>
              </Section>
              <Section title={`Venues (${searchResults.venues.length})`}>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {searchResults.venues.length > 0 ? searchResults.venues.map(v=><VenueCard key={v.id} venue={v} onClick={onVenue} />) :
                    <div style={{ color:T.textDim, fontSize:13, padding:16, textAlign:"center" }}>No venues found</div>}
                </div>
              </Section>
            </div>
          ) : selEvent ? (
            <EventDetail event={selEvent} onBack={goBack} onVenue={onVenue} />
          ) : selVenue ? (
            <VenueDetail venue={selVenue} onBack={goBack} onEvent={onEvent} />
          ) : (
            <>
              {tab==="home" && <HomeScreen onEvent={onEvent} onVenue={onVenue} />}
              {tab==="explore" && <ExploreScreen onEvent={onEvent} onVenue={onVenue} />}
              {tab==="venues" && <VenuesScreen onVenue={onVenue} />}
              {tab==="tickets" && <TicketsScreen />}
              {tab==="profile" && <ProfileScreen />}
            </>
          )}
        </div>
      </div>

      {/* Bottom Tabs */}
      <div style={{ display:"flex", borderTop:`1px solid ${T.border}`, background:`${T.bg}F2`, backdropFilter:"blur(12px)", padding:"8px 0 14px", flexShrink:0 }}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>switchTab(t.id)} style={{ flex:1, textAlign:"center", cursor:"pointer", padding:"4px 0", transition:"all 0.2s" }}>
            <div style={{ fontSize:22, lineHeight:1, color:tab===t.id?T.accent:T.textDim, transform:tab===t.id?"scale(1.15)":"scale(1)", transition:"all 0.2s" }}>{t.icon}</div>
            <div style={{ fontSize:10, marginTop:3, fontWeight:700, color:tab===t.id?T.accent:T.textDim, letterSpacing:0.5 }}>{t.label}</div>
            {tab===t.id && <div style={{ width:5, height:5, borderRadius:"50%", background:T.accent, margin:"4px auto 0", boxShadow:`0 0 8px ${T.accent}66` }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
