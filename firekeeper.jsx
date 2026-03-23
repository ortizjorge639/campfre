import { useState, useEffect, useRef } from "react";

/* ─── TOKENS ─── */
const T = {
coral:   "#FF6B4A", amber:  "#FFAA5A", sage:   "#4FBFA8",
lavBlue: "#8BA4D4", purple: "#C17ADA", dusty:  "#6B6880",
muted:   "#3A3850", card:   "#1E1C2E", cardBdr:"#2C2A40",
bg:      "#131220", ink:    "#F0EEF8", inkSoft:"#A9A6C0",
};

const LANES = [
{ id:"ai",      label:"AI & Building",   icon:"🤖", color:T.sage,    q:"q2" },
{ id:"gaming",  label:"Gaming & Fun",    icon:"🎮", color:T.amber,   q:"q4" },
{ id:"fitness", label:"Fitness",         icon:"💪", color:T.coral,   q:"q2" },
{ id:"social",  label:"Social Time",     icon:"🌐", color:T.lavBlue, q:"q4" },
{ id:"reflect", label:"Reflection",      icon:"📓", color:T.purple,  q:"q2" },
];

/* lane → which quadrant it naturally belongs to:
   primary lane → q2 (Focus Deeply)
   side lanes   → q4 (Enjoy Freely) by default
   any lane can also appear in q1 (urgent) or q3 (limit) with an urgency override */

/* Each item: { id, text, lane, urgency }
   urgency: null | "q1" | "q3"  (override quad placement)
   Derived quadrant:
     urgency === "q1" → q1
     urgency === "q3" → q3
     lane === primaryLane → q2
     lane in sideLanes → q4
     else → q3  */

function deriveQuad(item, primaryLane, sideLanes) {
  if (item.urgency === "q1") return "q1";
  if (item.urgency === "q3") return "q3";
  if (item.lane === primaryLane) return "q2";
  if (sideLanes.includes(item.lane)) return "q4";
  return "q3";
}

let _id = 100;
const mkId = () => String(++_id);

/* ─── INITIAL ITEMS ─── */
const INITIAL_ITEMS = [
  // Q1 — urgency overrides
  { id:mkId(), text:"Catch movie at 6 PM",                  lane:"social",  urgency:"q1" },
  { id:mkId(), text:"Charge laptop / PC",                   lane:"ai",      urgency:"q1" },
  { id:mkId(), text:"Quick essential tasks to feel ready",  lane:"ai",      urgency:"q1" },
  // Q2 — main lane (ai)
  { id:mkId(), text:"AI & learning experiments",            lane:"ai",      urgency:null },
  { id:mkId(), text:"Planning & journaling",                lane:"reflect", urgency:null },
  // Q2 — fitness is also a side lane mapped to q2 when primary
  { id:mkId(), text:"Exercise / fitness",                   lane:"fitness", urgency:null },
  // Q3 — limit overrides
  { id:mkId(), text:"Social media scrolling",               lane:"social",  urgency:"q3" },
  { id:mkId(), text:"Excessive notifications",              lane:"ai",      urgency:"q3" },
  { id:mkId(), text:"Casual gaming (reactive)",             lane:"gaming",  urgency:"q3" },
  // Q4 — side lanes enjoy freely
  { id:mkId(), text:"Endless binge-watching",               lane:"social",  urgency:null },
  { id:mkId(), text:"Mindless browsing",                    lane:"social",  urgency:null },
  { id:mkId(), text:"Gaming session (intentional)",         lane:"gaming",  urgency:null },
];

const PHASES = [
  { id:"lock-in",   icon:"🔒", label:"Lock-In",  sub:"Build, learn, grind",             color:T.sage    },
  { id:"expansion", icon:"🌱", label:"Expansion", sub:"Try things, play, explore",        color:T.amber   },
  { id:"gap",       icon:"🌫", label:"The Gap",   sub:"Drift, observe, let boredom work", color:T.lavBlue },
  { id:"relock",    icon:"⚡", label:"Re-lock",   sub:"New focus emerging",               color:T.coral   },
];

const MOODS = [
  { val:1, emoji:"😴", label:"Need rest first"   },
  { val:2, emoji:"😐", label:"Low energy"        },
  { val:3, emoji:"🙂", label:"Steady state"      },
  { val:4, emoji:"⚡", label:"Building momentum" },
  { val:5, emoji:"🔥", label:"Full lock-in mode" },
];

const MANTRAS = [
  { text:"You're not lazy. You want intensity and meaning.", sub:"That's different." },
  { text:"Boredom is creative soil.", sub:"The next mission grows from here." },
  { text:"Meaning ≠ Target lock.", sub:"Your direction is intact." },
  { text:"One primary lane.", sub:"Everything else is a side lane — not a threat." },
  { text:"You're not falling behind.", sub:"You're between phases." },
  { text:"Structure isn't a cage.", sub:"It's what lets fire burn." },
  { text:"The gap isn't emptiness.", sub:"It's the space between chapters." },
  { text:"Act before you feel ready.", sub:"Jorgin'." },
];

const GAP_RITUALS = [
  { icon:"☕", title:"Sit with it",              desc:"Make a drink. Do nothing on purpose. Let boredom breathe." },
  { icon:"📓", title:"Journal the drift",         desc:"Don't analyze. Just describe. What does this gap feel like?" },
  { icon:"👁",  title:"Observe yourself",         desc:"Watch your thoughts like weather. You are not the restlessness." },
  { icon:"🎮", title:"Play without guilt",        desc:"Gaming from the gap is rest, not avoidance." },
  { icon:"🚶", title:"Walk with no destination",  desc:"No podcast. No goal. Move and notice what surfaces." },
  { icon:"✏️", title:"Sketch or scribble",       desc:"Not art. Just marks. Boredom turns to texture." },
];

const GAP_TRUTHS = [
  { text:"The gap isn't a problem to solve — it's a phase to live through.", bold:"live through" },
  { text:"Your brain needs space, boredom, wandering to find the next mission.", bold:"boredom, wandering" },
  { text:"You are not lacking meaning. You are lacking target lock. Those are different.", bold:"target lock" },
  { text:"High-drive people don't stay locked in forever. They cycle. You're cycling.", bold:"They cycle." },
  { text:"This phase feels like regression. It's actually transition.", bold:"transition" },
  { text:"Boredom is creative soil. The next obsession is already germinating.", bold:"creative soil" },
];

const QUAD_META = {
  q1: { title:"Do Now",       label:"Urgent & Important",         emoji:"⚡", color:T.coral,   dim:"rgba(255,107,74,0.12)",  bdr:"rgba(255,107,74,0.28)"  },
  q2: { title:"Focus Deeply", label:"Not Urgent & Important",     emoji:"🔥", color:T.sage,    dim:"rgba(79,191,168,0.12)",  bdr:"rgba(79,191,168,0.28)"  },
  q3: { title:"Limit",        label:"Urgent & Not Important",     emoji:"⏱", color:T.lavBlue, dim:"rgba(139,164,212,0.12)", bdr:"rgba(139,164,212,0.28)" },
  q4: { title:"Enjoy Freely", label:"Not Urgent & Not Important", emoji:"🎮", color:T.amber,   dim:"rgba(255,170,90,0.12)",  bdr:"rgba(255,170,90,0.28)"  },
};

/* ─── HELPERS ─── */
function Orb({ size=200, color1, opacity=0.15, style={} }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:`radial-gradient(circle at 35% 35%, ${color1}, transparent)`, opacity, position:"absolute", pointerEvents:"none", ...style }} />;
}

function BreathOrb({ phase }) {
  const p = PHASES.find(x=>x.id===phase)||PHASES[0];
  return (
    <div style={{ position:"relative", width:76, height:76 }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:`${p.color}22`, animation:"ripple 3s ease-out infinite" }}/>
      <div style={{ position:"absolute", inset:8, borderRadius:"50%", background:`linear-gradient(135deg,${p.color}ee,${p.color}77)`, animation:"breathe 4s ease-in-out infinite", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 8px 28px ${p.color}44` }}>{p.icon}</div>
    </div>
  );
}

/* Lane badge pill */
function LaneBadge({ laneId, small=false }) {
  const lane = LANES.find(l=>l.id===laneId);
  if (!lane) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding: small?"2px 7px":"4px 9px", borderRadius:20, background:`${lane.color}18`, border:`1px solid ${lane.color}44`, fontSize: small?10:11, color:lane.color, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
      {lane.icon} {lane.label}
    </span>
  );
}

/* ─── ITEM ROW (matrix sheet) ─── */
function TaskRow({ item, quadColor, onDelete, onEdit, onMove, primaryLane, sideLanes }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.text);
  const [showMove, setShowMove] = useState(false);
  const inputRef = useRef();
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);

  const commit = () => {
    if(val.trim()&&val.trim()!==item.text) onEdit(item.id, val.trim());
    else setVal(item.text);
    setEditing(false);
  };

  const moveOptions = [
    { label:"⚡ Do Now",       urgency:"q1" },
    { label:"🔥 Focus Deeply", urgency:null, forceLane: primaryLane },
    { label:"⏱ Limit",        urgency:"q3" },
    { label:"🎮 Enjoy Freely", urgency:null, forceLane: sideLanes[0]||"gaming" },
  ];

  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:`${quadColor}10`, border:`1px solid ${quadColor}28`, borderRadius:12 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:quadColor, flexShrink:0, opacity:0.8 }}/>
        {editing ? (
          <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
            onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(item.text);setEditing(false);}}}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:T.ink, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}
          />
        ) : (
          <div style={{ flex:1, minWidth:0 }}>
            <div onDoubleClick={()=>setEditing(true)} style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.4, cursor:"text", marginBottom:3 }}>{item.text}</div>
            <LaneBadge laneId={item.lane} small />
          </div>
        )}
        <button onClick={()=>setShowMove(!showMove)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:13, padding:"0 2px", opacity:0.7, flexShrink:0 }} title="Move to quad">⇄</button>
        <button onClick={()=>setEditing(true)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:13, padding:"0 2px", opacity:0.7, flexShrink:0 }}>✎</button>
        <button onClick={()=>onDelete(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:17, padding:"0 2px", lineHeight:1, opacity:0.7, flexShrink:0 }}>×</button>
      </div>
      {showMove && (
        <div className="fade-up" style={{ display:"flex", gap:6, padding:"6px 4px 0", flexWrap:"wrap" }}>
          {moveOptions.map((opt,i)=>(
            <button key={i} onClick={()=>{ onMove(item.id, opt.urgency, opt.forceLane); setShowMove(false); }} style={{ padding:"5px 10px", background:T.muted, border:`1px solid ${T.cardBdr}`, borderRadius:20, fontSize:11, color:T.inkSoft, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {opt.label}
            </button>
          ))}
          <button onClick={()=>setShowMove(false)} style={{ padding:"5px 10px", background:"transparent", border:`1px solid ${T.cardBdr}`, borderRadius:20, fontSize:11, color:T.dusty, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>cancel</button>
        </div>
      )}
    </div>
  );
}

/* ─── QUADRANT SHEET ─── */
function QuadrantSheet({ qid, items, onAdd, onDelete, onEdit, onMove, onClose, primaryLane, sideLanes }) {
  const q = QUAD_META[qid];
  const [val, setVal] = useState("");
  const [selLane, setSelLane] = useState(
    qid==="q2" ? primaryLane :
    qid==="q4" ? (sideLanes[0]||"gaming") :
    qid==="q1" ? primaryLane : "social"
  );
  const inputRef = useRef();
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),350); },[]);

  const add = () => {
    if (!val.trim()) return;
    const urgency = qid==="q1"?"q1" : qid==="q3"?"q3" : null;
    onAdd({ id:mkId(), text:val.trim(), lane:selLane, urgency });
    setVal("");
  };

  const hintMap = {
    q1:"Clear these fast — they free your mind for what matters.",
    q2:"Your primary lane. This is where meaning lives.",
    q3:"Feels pressing — isn't. 15 min max.",
    q4:"Rest is not the enemy. No guilt.",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(10,9,20,0.78)", backdropFilter:"blur(6px)", animation:"fadeIn 0.25s ease" }}/>
      <div style={{ position:"relative", zIndex:1, background:T.card, borderRadius:"28px 28px 0 0", padding:"0 0 40px", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 -12px 60px rgba(0,0,0,0.6)", animation:"slideUp 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T.muted }}/>
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 22px 12px", borderBottom:`1px solid ${T.cardBdr}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:q.dim, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{q.emoji}</div>
            <div>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:18, fontWeight:700, color:T.ink }}>{q.title}</div>
              <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{q.label}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:T.muted, border:"none", borderRadius:"50%", width:30, height:30, color:T.inkSoft, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>

        {/* Hint + lane context */}
        <div style={{ margin:"12px 22px 8px", padding:"10px 14px", background:q.dim, borderRadius:12, borderLeft:`3px solid ${q.color}`, fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5 }}>
          {hintMap[qid]}
          {qid==="q2" && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, marginLeft:6 }}>
              → <LaneBadge laneId={primaryLane} small />
            </span>
          )}
          {qid==="q4" && sideLanes.length>0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
              {sideLanes.map(lid=><LaneBadge key={lid} laneId={lid} small />)}
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ padding:"4px 22px 14px" }}>
          {items.length===0
            ? <div style={{ textAlign:"center", padding:"16px 0", color:T.dusty, fontSize:12, fontStyle:"italic", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Nothing here — add below ↓</div>
            : items.map(item=>(
              <TaskRow key={item.id} item={item} quadColor={q.color}
                onDelete={onDelete} onEdit={onEdit} onMove={onMove}
                primaryLane={primaryLane} sideLanes={sideLanes}
              />
            ))
          }
        </div>

        {/* Add input + lane selector */}
        <div style={{ padding:"0 22px" }}>
          {/* Lane selector */}
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:8 }}>
            {LANES.map(lane=>(
              <button key={lane.id} onClick={()=>setSelLane(lane.id)} style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:20, background:selLane===lane.id?`${lane.color}20`:T.bg, border:`1.5px solid ${selLane===lane.id?lane.color:T.cardBdr}`, color:selLane===lane.id?lane.color:T.dusty, fontSize:11, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:selLane===lane.id?700:400, transition:"all 0.18s" }}>
                {lane.icon} {lane.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
              placeholder={`Add to ${q.title.toLowerCase()}...`}
              style={{ flex:1, padding:"12px 16px", background:T.bg, border:`1.5px solid ${q.bdr}`, borderRadius:14, fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.ink, outline:"none" }}
            />
            <button onClick={add} style={{ width:46, height:46, borderRadius:14, background:q.color, border:"none", color:"white", fontSize:22, cursor:"pointer", boxShadow:`0 4px 16px ${q.color}44`, flexShrink:0 }}>+</button>
          </div>
          <div style={{ marginTop:8, padding:"7px 12px", background:`${T.muted}60`, borderRadius:10, fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            💡 Tag each item with a lane · Use ⇄ on any item to move it · Double-tap to edit text
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ SCREENS ══════════════ */

/* HOME */
function HomeScreen({ phase, mood, setMood, primaryLane, sideLanes, mantraIdx, onNav, items }) {
  const m = MANTRAS[mantraIdx];
  const phaseObj = PHASES.find(p=>p.id===phase);
  const lane = LANES.find(l=>l.id===primaryLane);
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  // Derived counts
  const total = items.length;
  const q2 = items.filter(i=>deriveQuad(i,primaryLane,sideLanes)==="q2").length;
  const q1 = items.filter(i=>deriveQuad(i,primaryLane,sideLanes)==="q1").length;

  // Per-lane counts for active lanes
  const laneStats = [primaryLane, ...sideLanes].map(lid=>{
    const l = LANES.find(x=>x.id===lid);
    return { ...l, count: items.filter(i=>i.lane===lid).length };
  });

  return (
    <div className="fade-up" style={{ padding:"0 0 110px" }}>
      <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(160deg,#1e1a32 0%,#131220 100%)", padding:"56px 24px 32px", borderRadius:"0 0 32px 32px" }}>
        <Orb size={220} color1={T.coral} opacity={0.12} style={{ top:-60, right:-60 }}/>
        <Orb size={180} color1={T.sage} opacity={0.1} style={{ bottom:-40, left:-40 }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ fontSize:12, letterSpacing:2.5, fontWeight:600, color:"rgba(255,255,255,0.35)", fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:4 }}>{greeting}, Jorge</div>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, lineHeight:1.2, marginBottom:20 }}>How's the<br/>fire burning?</div>
          <div style={{ display:"flex", gap:8 }}>
            {MOODS.map(mo=>(
              <button key={mo.val} onClick={()=>setMood(mo.val)} style={{ flex:1, padding:"10px 4px", background:mood===mo.val?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)", border:`1.5px solid ${mood===mo.val?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.07)"}`, borderRadius:14, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:mood===mo.val?"scale(1.06)":"scale(1)" }}>
                <span style={{ fontSize:20 }}>{mo.emoji}</span>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{mo.val}</span>
              </button>
            ))}
          </div>
          {mood&&<div style={{ marginTop:8, textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif", fontStyle:"italic" }}>{MOODS.find(x=>x.val===mood)?.label}</div>}
        </div>
      </div>

      {/* Mantra */}
      <div style={{ padding:"18px 20px 0" }}>
        <div style={{ background:`linear-gradient(135deg,${T.coral}18,${T.amber}10)`, border:`1.5px solid ${T.coral}22`, borderRadius:20, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
          <Orb size={80} color1={T.amber} opacity={0.18} style={{ top:-20, right:-10 }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:T.coral, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:6 }}>Today's Reminder</div>
            <div key={mantraIdx} className="fade-up" style={{ fontSize:16, fontWeight:700, color:T.ink, fontFamily:"'Clash Display',sans-serif", lineHeight:1.35, marginBottom:4 }}>{m.text}</div>
            <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{m.sub}</div>
          </div>
        </div>
      </div>

      {/* Gap callout */}
      {phase==="gap"&&(
        <div style={{ padding:"14px 20px 0" }}>
          <button onClick={()=>onNav("gap")} style={{ width:"100%", cursor:"pointer", background:"linear-gradient(135deg,#181628,#111020)", border:`1.5px solid ${T.lavBlue}33`, borderRadius:20, padding:"16px 20px", textAlign:"left", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
            onTouchStart={e=>e.currentTarget.style.transform="scale(0.98)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
            <Orb size={100} color1={T.lavBlue} opacity={0.18} style={{ top:-20, right:-20 }}/>
            <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:28 }}>🌫</span>
              <div>
                <div style={{ fontSize:10, letterSpacing:2, color:T.lavBlue, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>You're in the gap</div>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:T.ink }}>Let boredom do its work →</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ padding:"14px 20px 0" }}>
        <div style={{ background:T.card, borderRadius:18, padding:"16px", border:`1px solid ${T.cardBdr}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0 }}>
            {[{val:total,label:"Total",color:T.ink},{val:q2,label:"Deep Focus",color:T.sage},{val:q1,label:"Do Now",color:T.coral}].map((s,i)=>(
              <div key={i} style={{ textAlign:"center", borderRight:i<2?`1px solid ${T.cardBdr}`:"none", padding:"0 8px" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:30, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase + Main Lane */}
      <div style={{ padding:"12px 20px 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ background:T.card, borderRadius:18, padding:"16px", border:`1px solid ${T.cardBdr}` }}>
          <div style={{ fontSize:10, letterSpacing:2, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:10 }}>Phase</div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <BreathOrb phase={phase}/>
            <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:14, fontWeight:700, color:T.ink, marginTop:8, textAlign:"center" }}>{phaseObj?.label}</div>
            <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>{phaseObj?.sub}</div>
          </div>
        </div>
        <div style={{ background:T.card, borderRadius:18, padding:"16px", border:`1px solid ${T.cardBdr}` }}>
          <div style={{ fontSize:10, letterSpacing:2, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:10 }}>Main Lane</div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:`${lane?.color}18`, border:`2px solid ${lane?.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:8 }}>{lane?.icon}</div>
            <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:13, fontWeight:700, color:T.ink, textAlign:"center" }}>{lane?.label}</div>
            <div style={{ fontSize:11, color:lane?.color, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>→ Focus Deeply</div>
          </div>
        </div>
      </div>

      {/* Lane breakdown */}
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ fontSize:12, fontWeight:700, letterSpacing:1.5, color:T.dusty, textTransform:"uppercase", fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:10 }}>
          Active Lanes · Items
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {laneStats.map((l,i)=>(
            <div key={l.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:T.card, borderRadius:14, border:`1px solid ${i===0?l.color+"44":T.cardBdr}` }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${l.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{l.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.ink, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{l.label}</div>
                <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{i===0?"main lane":"side lane"} · {l.count} item{l.count!==1?"s":""}</div>
              </div>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:22, fontWeight:700, color: l.count>0?l.color:T.muted }}>{l.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* MATRIX */
function MatrixScreen({ items, onAddItem, onDeleteItem, onEditItem, onMoveItem, primaryLane, sideLanes }) {
  const [activeQ, setActiveQ] = useState(null);

  const byQuad = qid => items.filter(i => deriveQuad(i, primaryLane, sideLanes) === qid);

  return (
    <div className="fade-up" style={{ padding:"20px 20px 110px" }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink }}>Focus Matrix</div>
        <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          Items auto-sort by lane · Tap to manage
        </div>
      </div>

      {/* Sync callout */}
      <div style={{ marginBottom:16, padding:"10px 14px", background:`${T.sage}10`, border:`1px solid ${T.sage}28`, borderRadius:14, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:16 }}>⇄</span>
        <div style={{ fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.45 }}>
          <strong style={{color:T.sage}}>Live sync:</strong> Your main lane feeds Q2 · Side lanes feed Q4 · Change lanes to rebalance
        </div>
      </div>

      <div style={{ fontSize:10, letterSpacing:2.5, color:T.dusty, textTransform:"uppercase", fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center", marginBottom:8 }}>↑ Urgent</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {(["q1","q2","q3","q4"]).map(qid=>{
          const q = QUAD_META[qid];
          const qItems = byQuad(qid);
          const isPrimary = qid==="q2";
          const laneForQ = qid==="q2" ? LANES.find(l=>l.id===primaryLane) : null;
          return (
            <button key={qid} onClick={()=>setActiveQ(qid)} style={{ background:isPrimary?`linear-gradient(145deg,${q.dim},${T.card})`:T.card, border:`1.5px solid ${isPrimary?q.color+"44":T.cardBdr}`, borderRadius:20, padding:"18px 16px", cursor:"pointer", textAlign:"left", boxShadow:isPrimary?`0 8px 28px ${q.color}18`:"none", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", overflow:"hidden" }}
              onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
              {isPrimary&&<div style={{ position:"absolute", top:10, right:10, background:q.color, color:"white", fontSize:8, fontWeight:800, letterSpacing:1.5, padding:"3px 8px", borderRadius:20, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>Main</div>}
              <div style={{ width:38, height:38, borderRadius:12, background:q.dim, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, marginBottom:8 }}>{q.emoji}</div>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:T.ink, marginBottom:2 }}>{q.title}</div>
              {/* Show lane badge for q2 */}
              {laneForQ && <div style={{ marginBottom:6 }}><LaneBadge laneId={laneForQ.id} small /></div>}
              {/* Show side lane badges for q4 */}
              {qid==="q4" && sideLanes.length>0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:6 }}>
                  {sideLanes.slice(0,2).map(lid=><LaneBadge key={lid} laneId={lid} small />)}
                  {sideLanes.length>2&&<span style={{fontSize:10,color:T.dusty,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>+{sideLanes.length-2}</span>}
                </div>
              )}
              <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:q.dim, borderRadius:20, padding:"3px 10px", marginBottom:8 }}>
                <span style={{ fontSize:11, color:q.color, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{qItems.length} item{qItems.length!==1?"s":""}</span>
              </div>
              {qItems.slice(0,2).map((item,i)=>(
                <div key={i} style={{ fontSize:11, color:T.inkSoft+"77", fontFamily:"'Plus Jakarta Sans',sans-serif", padding:"1px 0", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>· {item.text}</div>
              ))}
              {qItems.length>2&&<div style={{ fontSize:10, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>+{qItems.length-2} more</div>}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:10, letterSpacing:2.5, color:T.dusty, textTransform:"uppercase", fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center", marginTop:8 }}>↓ Not Urgent</div>

      {activeQ && (
        <QuadrantSheet
          qid={activeQ}
          items={byQuad(activeQ)}
          onAdd={onAddItem}
          onDelete={onDeleteItem}
          onEdit={onEditItem}
          onMove={onMoveItem}
          onClose={()=>setActiveQ(null)}
          primaryLane={primaryLane}
          sideLanes={sideLanes}
        />
      )}
    </div>
  );
}

/* GAP */
function GapScreen() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]);
  const [saved, setSaved] = useState(false);
  const [ritual, setRitual] = useState(null);
  const [showTruths, setShowTruths] = useState(false);
  const wc = text.trim().split(/\s+/).filter(Boolean).length;
  const save = () => {
    if(!text.trim())return;
    setEntries(prev=>[{text:text.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),id:Date.now()},...prev]);
    setText(""); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div className="fade-up" style={{ padding:"0 0 110px" }}>
      <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(160deg,#181628 0%,#0f0e1a 100%)", padding:"52px 24px 32px", borderRadius:"0 0 32px 32px" }}>
        <Orb size={180} color1={T.lavBlue} opacity={0.18} style={{ top:-40, right:-30 }}/>
        <Orb size={140} color1={T.sage} opacity={0.1} style={{ bottom:-40, left:-20 }}/>
        {[...Array(7)].map((_,i)=>(
          <div key={i} style={{ position:"absolute", width:2+(i%3), height:2+(i%3), borderRadius:"50%", background:[T.lavBlue,T.sage,T.dusty][i%3], opacity:0.12+(i%3)*0.06, left:`${12+i*13}%`, top:`${25+Math.sin(i*1.2)*28}%`, animation:`breathe ${3+i*0.5}s ease-in-out infinite`, animationDelay:`${i*0.35}s` }}/>
        ))}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(139,164,212,0.15)", border:"1.5px solid rgba(139,164,212,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, animation:"breathe 5s ease-in-out infinite" }}>🌫</div>
            <div style={{ fontSize:10, letterSpacing:3, fontWeight:600, color:"rgba(139,164,212,0.6)", fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>Gap Mode</div>
          </div>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink, lineHeight:1.25, marginBottom:10 }}>The drift is part<br/>of the design.</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6 }}>You don't need to fix this feeling.<br/>You need to <em>live through it</em> — with intention.</div>
        </div>
      </div>
      <div style={{ padding:"0 20px" }}>
        <div style={{ marginTop:18, background:`linear-gradient(135deg,${T.lavBlue}14,${T.lavBlue}06)`, border:`1.5px solid ${T.lavBlue}28`, borderRadius:18, padding:"16px 18px" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:T.lavBlue, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:6 }}>The distinction that changes everything</div>
          <div style={{ fontSize:17, fontFamily:"'Clash Display',sans-serif", fontWeight:700, color:T.ink, marginBottom:6 }}>Meaning ≠ Target Lock</div>
          <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6 }}>Your <strong style={{color:T.sage}}>meaning is intact</strong>. What's missing is a <strong style={{color:T.coral}}>current target</strong>. That arrives on its own. <em>Boredom is how it gestates.</em></div>
        </div>
        <div style={{ marginTop:22 }}>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:2 }}>Journal the Drift</div>
          <div style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:12 }}>No format. No goal. Just what's there.</div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:12 }}>
            {["What does this gap feel like?","What am I actually craving?","What made me curious today?","If boredom was speaking, what would it say?","What would I build if nothing was at stake?"].map((p,i)=>(
              <button key={i} onClick={()=>setText(prev=>prev?prev+"\n\n"+p+" ":p+" ")} style={{ flexShrink:0, padding:"9px 14px", background:T.card, border:`1.5px solid ${T.cardBdr}`, borderRadius:12, cursor:"pointer", fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", maxWidth:170, textAlign:"left", lineHeight:1.4 }}>{p}</button>
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Begin anywhere. The gap has texture — describe it..."
            style={{ width:"100%", minHeight:150, background:T.card, border:`1.5px solid ${T.lavBlue}30`, borderRadius:18, padding:"16px", fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.ink, lineHeight:1.7, outline:"none", resize:"none", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, marginBottom:18 }}>
            <span style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{wc} words</span>
            <button onClick={save} style={{ padding:"10px 22px", background:saved?T.sage:`linear-gradient(135deg,${T.lavBlue},#6a8fc4)`, border:"none", borderRadius:12, color:"white", fontSize:13, fontFamily:"'Clash Display',sans-serif", fontWeight:700, cursor:"pointer", letterSpacing:1, transition:"all 0.3s ease" }}>{saved?"✓ Captured":"Capture it"}</button>
          </div>
          {entries.map(e=>(
            <div key={e.id} style={{ background:T.card, border:`1px solid ${T.cardBdr}`, borderRadius:14, padding:"12px 14px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, color:T.lavBlue, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>{e.time}</span>
                <button onClick={()=>setEntries(prev=>prev.filter(x=>x.id!==e.id))} style={{ background:"none", border:"none", color:T.dusty, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
              </div>
              <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{e.text}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:4 }}>Gap Rituals</div>
          <div style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:12 }}>Not productivity. Just gentle anchors.</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {GAP_RITUALS.map((r,i)=>{
              const on=ritual===i;
              return (
                <button key={i} onClick={()=>setRitual(on?null:i)} style={{ background:on?`${T.lavBlue}14`:T.card, border:`1.5px solid ${on?T.lavBlue+"55":T.cardBdr}`, borderRadius:16, padding:"14px", cursor:"pointer", textAlign:"left", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:on?"scale(1.02)":"scale(1)" }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{r.icon}</div>
                  <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:3 }}>{r.title}</div>
                  {on?<div className="fade-up" style={{ fontSize:11, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5 }}>{r.desc}</div>:<div style={{ fontSize:10, color:T.lavBlue, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>tap →</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom:22 }}>
          <button onClick={()=>setShowTruths(!showTruths)} style={{ width:"100%", background:showTruths?`${T.lavBlue}12`:T.card, border:`1.5px solid ${showTruths?T.lavBlue+"44":T.cardBdr}`, borderRadius:16, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:14, fontWeight:700, color:T.ink }}>Truths from your session</div>
                <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>What your therapist actually said</div>
              </div>
            </div>
            <span style={{ color:T.lavBlue, fontSize:16, display:"inline-block", transition:"transform 0.25s", transform:showTruths?"rotate(180deg)":"none" }}>↓</span>
          </button>
          {showTruths&&(
            <div className="fade-up" style={{ paddingTop:8 }}>
              {GAP_TRUTHS.map((t,i)=>(
                <div key={i} style={{ padding:"11px 14px", background:T.card, border:`1px solid ${T.cardBdr}`, borderLeft:`3px solid ${T.lavBlue}`, borderRadius:12, marginBottom:7 }}>
                  <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6 }}>
                    {t.text.split(t.bold).map((part,j,arr)=>(<span key={j}>{part}{j<arr.length-1&&<strong style={{color:T.lavBlue}}>{t.bold}</strong>}</span>))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding:"18px 20px", background:"linear-gradient(135deg,#181628,#0f0e1a)", borderRadius:20, marginBottom:8, border:`1px solid ${T.lavBlue}18`, position:"relative", overflow:"hidden" }}>
          <Orb size={90} color1={T.lavBlue} opacity={0.18} style={{ top:-20, right:-20 }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:17, fontWeight:700, color:T.ink, lineHeight:1.3, marginBottom:6 }}>This idea was born out of boredom.</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.65 }}>That's not ironic. That's the proof. The gap isn't emptiness — it's where the next version of you takes shape.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* PHASE */
function PhaseScreen({ phase, setPhase }) {
  return (
    <div className="fade-up" style={{ padding:"20px 20px 110px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink, marginBottom:4 }}>Life Phase</div>
        <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Your phase doesn't judge you. It tells your brain where it is.</div>
      </div>
      <div style={{ background:T.card, borderRadius:18, padding:"16px", border:`1px solid ${T.cardBdr}`, marginBottom:18 }}>
        <div style={{ fontSize:10, letterSpacing:2, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", textAlign:"center", marginBottom:12 }}>The Healthy Cycle</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          {PHASES.map((p,i)=>(
            <div key={p.id} style={{ display:"flex", alignItems:"center" }}>
              <div style={{ textAlign:"center", padding:"4px 8px" }}>
                <div style={{ fontSize:20 }}>{p.icon}</div>
                <div style={{ fontSize:10, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:2 }}>{p.label}</div>
              </div>
              {i<3&&<div style={{ color:T.dusty, fontSize:12 }}>→</div>}
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:T.dusty+"66", fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:6, fontStyle:"italic" }}>→ loops back</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {PHASES.map(p=>{
          const on=phase===p.id;
          return (
            <button key={p.id} onClick={()=>setPhase(p.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:on?`linear-gradient(135deg,${p.color}18,${p.color}08)`:T.card, border:`1.5px solid ${on?p.color:T.cardBdr}`, borderRadius:18, cursor:"pointer", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:on?`0 6px 24px ${p.color}20`:"none", transform:on?"scale(1.02)":"scale(1)" }}>
              <div style={{ width:46, height:46, borderRadius:14, background:`${p.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, animation:on?"breathe 4s ease-in-out infinite":"none" }}>{p.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, color:T.ink }}>{p.label} Phase</div>
                <div style={{ fontSize:12, color:on?p.color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{p.sub}</div>
              </div>
              {on&&<div style={{ background:p.color, color:"white", fontSize:9, fontWeight:800, letterSpacing:1.5, padding:"4px 10px", borderRadius:20, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>NOW</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* LANES */
function LanesScreen({ primaryLane, setPrimaryLane, sideLanes, setSideLanes, items }) {
  const toggle = id => setSideLanes(prev=>prev.includes(id)?prev.filter(l=>l!==id):[...prev,id]);

  return (
    <div className="fade-up" style={{ padding:"20px 20px 110px" }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink, marginBottom:4 }}>Your Lanes</div>
        <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5 }}>One primary lane. Everything else is a side lane.</div>
      </div>

      {/* Sync callout */}
      <div style={{ marginBottom:18, padding:"10px 14px", background:`${T.sage}10`, border:`1px solid ${T.sage}28`, borderRadius:14, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:16 }}>⇄</span>
        <div style={{ fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.45 }}>
          <strong style={{color:T.sage}}>Changing lanes instantly updates the Matrix.</strong> Main lane → Focus Deeply. Side lanes → Enjoy Freely.
        </div>
      </div>

      <div style={{ fontSize:11, letterSpacing:2, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:12 }}>Main Lane → Focus Deeply (Q2)</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
        {LANES.map(lane=>{
          const on=primaryLane===lane.id;
          const count = items.filter(i=>i.lane===lane.id).length;
          return (
            <button key={lane.id} onClick={()=>setPrimaryLane(lane.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", background:on?`linear-gradient(135deg,${lane.color}18,${lane.color}08)`:T.card, border:`1.5px solid ${on?lane.color:T.cardBdr}`, borderRadius:16, cursor:"pointer", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:on?`0 6px 22px ${lane.color}18`:"none", transform:on?"scale(1.02)":"scale(1)" }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${lane.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{lane.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:T.ink }}>{lane.label}</div>
                <div style={{ fontSize:11, color:on?lane.color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {on?"✓ main lane · Focus Deeply":`${count} item${count!==1?"s":""}`}
                </div>
              </div>
              <div style={{ width:22, height:22, borderRadius:"50%", background:on?lane.color:"transparent", border:`2px solid ${on?lane.color:T.muted}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {on&&<span style={{color:"white",fontSize:11}}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize:11, letterSpacing:2, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:4 }}>Side Lanes → Enjoy Freely (Q4)</div>
      <div style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:12 }}>Toggle what's allowed today. Scheduling removes the guilt.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {LANES.filter(l=>l.id!==primaryLane).map(lane=>{
          const on=sideLanes.includes(lane.id);
          const count = items.filter(i=>i.lane===lane.id).length;
          return (
            <button key={lane.id} onClick={()=>toggle(lane.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", background:on?`${lane.color}12`:T.card, border:`1.5px solid ${on?lane.color+"55":T.cardBdr}`, borderRadius:14, cursor:"pointer", transition:"all 0.2s ease", transform:on?"scale(1.01)":"scale(1)" }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${lane.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{lane.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:600, color:on?T.ink:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{lane.label}</div>
                <div style={{ fontSize:11, color:on?lane.color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{on?`✓ side lane · ${count} item${count!==1?"s":""}`:`${count} item${count!==1?"s":""} · off`}</div>
              </div>
              <div style={{ width:28, height:16, borderRadius:8, background:on?lane.color:T.muted, display:"flex", alignItems:"center", padding:"0 2px", transition:"all 0.2s", justifyContent:on?"flex-end":"flex-start" }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:"white" }}/>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop:18, padding:"12px 14px", background:`${T.amber}12`, borderRadius:12, borderLeft:`3px solid ${T.amber}` }}>
        <div style={{ fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5 }}>
          💡 When your main direction is clear, side lanes stop competing for your identity.
        </div>
      </div>
    </div>
  );
}

/* ─── NAV ─── */
const NAV = [
  { id:"home",   icon:"🏠", label:"Home"   },
  { id:"matrix", icon:"⚡", label:"Matrix" },
  { id:"gap",    icon:"🌫", label:"Gap"    },
  { id:"phase",  icon:"🌀", label:"Phase"  },
  { id:"lanes",  icon:"🎯", label:"Lanes"  },
];

/* ─── APP ─── */
export default function App() {
  const [screen, setScreen]           = useState("home");
  const [items, setItems]             = useState(INITIAL_ITEMS);
  const [phase, setPhase]             = useState("gap");
  const [mood, setMood]               = useState(3);
  const [primaryLane, setPrimaryLane] = useState("ai");
  const [sideLanes, setSideLanes]     = useState(["gaming","fitness","social"]);
  const [mantraIdx, setMantraIdx]     = useState(0);

  useEffect(()=>{
    const id=setInterval(()=>setMantraIdx(m=>(m+1)%MANTRAS.length),6000);
    return ()=>clearInterval(id);
  },[]);

  /* Item CRUD */
  const addItem    = (item) => setItems(prev=>[...prev, item]);
  const deleteItem = (id)   => setItems(prev=>prev.filter(i=>i.id!==id));
  const editItem   = (id, text) => setItems(prev=>prev.map(i=>i.id===id?{...i,text}:i));
  /* Move: change urgency (and optionally forceLane) */
  const moveItem   = (id, urgency, forceLane) => setItems(prev=>prev.map(i=>i.id===id?{...i, urgency, lane: forceLane||i.lane}:i));

  const renderScreen = () => {
    switch(screen){
      case "home":   return <HomeScreen phase={phase} mood={mood} setMood={setMood} primaryLane={primaryLane} sideLanes={sideLanes} mantraIdx={mantraIdx} onNav={setScreen} items={items}/>;
      case "matrix": return <MatrixScreen items={items} onAddItem={addItem} onDeleteItem={deleteItem} onEditItem={editItem} onMoveItem={moveItem} primaryLane={primaryLane} sideLanes={sideLanes}/>;
      case "gap":    return <GapScreen/>;
      case "phase":  return <PhaseScreen phase={phase} setPhase={setPhase}/>;
      case "lanes":  return <LanesScreen primaryLane={primaryLane} setPrimaryLane={setPrimaryLane} sideLanes={sideLanes} setSideLanes={setSideLanes} items={items}/>;
      default:       return null;
    }
  };

  return (
    <div style={{ maxWidth:430, margin:"0 auto", background:T.bg, minHeight:"100vh", position:"relative", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        body{background:${T.bg};}
        ::placeholder{color:${T.dusty};opacity:0.6;}
        ::-webkit-scrollbar{display:none;}
        input,textarea,button{font-family:inherit;}
        @keyframes breathe{0%,100%{transform:scale(0.9);opacity:0.75}50%{transform:scale(1.1);opacity:1}}
        @keyframes ripple{0%{transform:scale(0.9);opacity:0.35}100%{transform:scale(1.65);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(0.88);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        .fade-up{animation:fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;}
        .pop{animation:pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;}
      `}</style>
      <div style={{ height:"env(safe-area-inset-top,0px)" }}/>
      {screen!=="home"&&(
        <div style={{ display:"flex", alignItems:"center", padding:"16px 20px 0", gap:12 }}>
          <button onClick={()=>setScreen("home")} style={{ background:T.card, border:`1px solid ${T.cardBdr}`, borderRadius:12, width:36, height:36, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:T.inkSoft }}>←</button>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:18, fontWeight:700, color:T.ink }}>{NAV.find(n=>n.id===screen)?.label}</div>
        </div>
      )}
      <div key={screen}>{renderScreen()}</div>
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(19,18,32,0.95)", backdropFilter:"blur(20px)", borderTop:`1px solid ${T.cardBdr}`, padding:"8px 16px calc(8px + env(safe-area-inset-bottom,0px))", display:"flex", justifyContent:"space-around", zIndex:50 }}>
        {NAV.map(n=>{
          const active=screen===n.id;
          return (
            <button key={n.id} onClick={()=>setScreen(n.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 10px", background:active?`${T.coral}15`:"transparent", border:"none", borderRadius:14, cursor:"pointer", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:active?"scale(1.08)":"scale(1)" }}>
              <span style={{ fontSize:20 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:active?700:400, color:active?T.coral:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:0.3 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
