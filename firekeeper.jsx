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

let _id = Date.now();
const mkId = () => String(++_id);
const today = () => new Date().toISOString().slice(0,10);

/* ─── PERSISTENCE (localStorage + 6-month archive) ─── */
const STORAGE_KEY = "campfre_state";
const ARCHIVE_MONTHS = 6;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Archive: drop completedLog entries older than 6 months
    if (state.completedLog) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - ARCHIVE_MONTHS);
      const cutoffStr = cutoff.toISOString().slice(0,10);
      state.completedLog = state.completedLog.filter(e => e.date >= cutoffStr);
    }
    return state;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ─── LOADING TIPS (game-style, shown sparingly) ─── */
const LOADING_TIPS = [
  "Side lanes aren't distractions — they're scheduled freedom.",
  "The matrix rebalances when you change lanes.",
  "Boredom is a feature, not a bug.",
  "Double-tap any item to edit it inline.",
  "Your phase doesn't judge you. It locates you.",
  "Completing items builds your streak. Check in daily.",
  "The gap is where your next obsession germinates.",
  "Use ⇄ to move items between quadrants.",
  "Lock-in isn't forever. You cycle. That's healthy.",
  "One primary lane. Everything else is a side lane.",
];

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

/* ─── PHASE-SPECIFIC CONTENT ─── */
const PHASE_CONTENT = {
  "lock-in": {
    icon:"🔒", mode:"Lock-In Mode", color:T.sage,
    title:"Build the momentum.\nOne brick at a time.",
    subtitle:"You chose this. Now trust the process —\nshow up and let the work compound.",
    distinction:{ label:"The key insight", title:"Discipline ≠ Punishment", body:"Discipline is freedom in disguise. You're not depriving yourself — you're investing in the version of you that's about to emerge." },
    journalTitle:"Log the Grind",
    journalSubtitle:"What moved today? What's next?",
    placeholder:"What did I ship today? What's the next target...",
    prompts:["What did I finish today?","What's blocking me right now?","What's the smallest next step?","Where did I waste energy?","What am I building toward?"],
    rituals:[
      { icon:"🎯", title:"Set the target", desc:"Pick one thing. Just one. Ship it before you do anything else." },
      { icon:"⏱", title:"Time block", desc:"25 minutes. No phone. No tabs. Just the work." },
      { icon:"📋", title:"Review the plan", desc:"Read your matrix. Are you working on Q2 or getting pulled into Q3?" },
      { icon:"💪", title:"Move your body", desc:"5 minutes. Push-ups, stretches, a walk. Movement feeds momentum." },
      { icon:"🔇", title:"Go dark", desc:"Notifications off. Social off. Let the silence become focus." },
      { icon:"📓", title:"End-of-day log", desc:"3 bullets: what you did, what you learned, what's tomorrow." },
    ],
    truths:[
      { text:"Lock-in isn't mania — it's alignment. You chose this lane for a reason.", bold:"alignment" },
      { text:"Momentum compounds. Every session builds on the last one.", bold:"compounds" },
      { text:"You don't need motivation. You need to start. Motivation follows action.", bold:"start" },
      { text:"Distractions aren't evil — they're just not your lane right now.", bold:"not your lane" },
      { text:"Rest is part of the grind. Burnout isn't a badge. Pace yourself.", bold:"Pace yourself" },
      { text:"The gap will come again. That's fine. Right now, build.", bold:"build" },
    ],
    closingTitle:"This is where things get built.",
    closingBody:"Not in bursts of inspiration — in the quiet discipline of showing up. You're in lock-in because you chose to be. Honor that.",
  },
  "expansion": {
    icon:"🌱", mode:"Expansion Mode", color:T.amber,
    title:"Try everything.\nFollow the curiosity.",
    subtitle:"No commitments yet — just exploration.\nLet yourself be a beginner again.",
    distinction:{ label:"The shift to notice", title:"Exploration ≠ Distraction", body:"You're not scattered — you're sampling. Expansion is how you discover what deserves your lock-in next." },
    journalTitle:"Capture the Sparks",
    journalSubtitle:"What caught your attention? What felt alive?",
    placeholder:"What made me curious today? What do I want to try...",
    prompts:["What surprised me today?","What do I want to explore more?","What felt exciting vs. obligatory?","If I could learn anything, what would it be?","What's pulling me that I keep ignoring?"],
    rituals:[
      { icon:"🧪", title:"Try something new", desc:"A tool, a skill, a genre, a route. Novelty feeds expansion." },
      { icon:"🗣", title:"Talk to someone different", desc:"New perspectives open doors you didn't know existed." },
      { icon:"📖", title:"Read widely", desc:"Not for a goal. For the joy of it. Let ideas cross-pollinate." },
      { icon:"🎨", title:"Make something ugly", desc:"Not for an audience. Just to see what comes out." },
      { icon:"🚶", title:"Take the scenic route", desc:"Walk somewhere new. Eat somewhere different. Break the pattern." },
      { icon:"📓", title:"List 10 ideas", desc:"Bad ones count. Volume over quality. Let the subconscious play." },
    ],
    truths:[
      { text:"Expansion isn't wasted time — it's the research phase of your next chapter.", bold:"research phase" },
      { text:"You don't have to commit yet. Sampling is how you find the signal.", bold:"find the signal" },
      { text:"The things that light you up in expansion? Those become your next lock-in.", bold:"next lock-in" },
      { text:"Feeling scattered is normal. You're not broken — you're browsing.", bold:"browsing" },
      { text:"Give yourself permission to be bad at new things. That's how growth starts.", bold:"permission" },
      { text:"Not everything you try needs to become a project. Some things are just for you.", bold:"just for you" },
    ],
    closingTitle:"Curiosity is not a weakness.",
    closingBody:"It's how you've always found the next thing. Trust the wandering — it's working even when it doesn't feel productive.",
  },
  "gap": {
    icon:"🌫", mode:"Gap Mode", color:T.lavBlue,
    title:"The drift is part\nof the design.",
    subtitle:"You don't need to fix this feeling.\nYou need to live through it — with intention.",
    distinction:{ label:"The distinction that changes everything", title:"Meaning ≠ Target Lock", body:"Your meaning is intact. What's missing is a current target. That arrives on its own. Boredom is how it gestates." },
    journalTitle:"Journal the Drift",
    journalSubtitle:"No format. No goal. Just what's there.",
    placeholder:"Begin anywhere. The gap has texture — describe it...",
    prompts:["What does this gap feel like?","What am I actually craving?","What made me curious today?","If boredom was speaking, what would it say?","What would I build if nothing was at stake?"],
    rituals:[
      { icon:"☕", title:"Sit with it", desc:"Make a drink. Do nothing on purpose. Let boredom breathe." },
      { icon:"📓", title:"Journal the drift", desc:"Don't analyze. Just describe. What does this gap feel like?" },
      { icon:"👁", title:"Observe yourself", desc:"Watch your thoughts like weather. You are not the restlessness." },
      { icon:"🎮", title:"Play without guilt", desc:"Gaming from the gap is rest, not avoidance." },
      { icon:"🚶", title:"Walk with no destination", desc:"No podcast. No goal. Move and notice what surfaces." },
      { icon:"✏️", title:"Sketch or scribble", desc:"Not art. Just marks. Boredom turns to texture." },
    ],
    truths:[
      { text:"The gap isn't a problem to solve — it's a phase to live through.", bold:"live through" },
      { text:"Your brain needs space, boredom, wandering to find the next mission.", bold:"boredom, wandering" },
      { text:"You are not lacking meaning. You are lacking target lock. Those are different.", bold:"target lock" },
      { text:"High-drive people don't stay locked in forever. They cycle. You're cycling.", bold:"They cycle." },
      { text:"This phase feels like regression. It's actually transition.", bold:"transition" },
      { text:"Boredom is creative soil. The next obsession is already germinating.", bold:"creative soil" },
    ],
    closingTitle:"This idea was born out of boredom.",
    closingBody:"That's not ironic. That's the proof. The gap isn't emptiness — it's where the next version of you takes shape.",
  },
  "relock": {
    icon:"⚡", mode:"Re-lock Mode", color:T.coral,
    title:"Something's emerging.\nLean into it.",
    subtitle:"The fog is lifting. A new direction is forming —\ndon't force it, but don't ignore it either.",
    distinction:{ label:"The transition to honor", title:"Interest ≠ Commitment", body:"You're feeling a pull — that's the signal. Test it before you commit. Re-lock is about confirming, not forcing." },
    journalTitle:"Name the Pull",
    journalSubtitle:"What's emerging? What feels different?",
    placeholder:"I'm starting to feel pulled toward...",
    prompts:["What's been on my mind repeatedly?","What feels different from last week?","If I had to pick one thing to focus on, what would it be?","What am I ready to let go of?","What does my next lock-in look like?"],
    rituals:[
      { icon:"🔍", title:"Test the signal", desc:"Spend 30 minutes on the thing pulling you. Does it hold up?" },
      { icon:"📋", title:"Draft a plan", desc:"Not perfect. Just a rough sketch. What would lock-in look like?" },
      { icon:"🧹", title:"Clear the decks", desc:"Archive old items. Clean your matrix. Make space for what's next." },
      { icon:"💬", title:"Tell someone", desc:"Say it out loud. 'I think I want to focus on...' — makes it real." },
      { icon:"⏳", title:"Set a trial period", desc:"Commit for one week. Not forever. Just enough to test the fit." },
      { icon:"🔥", title:"Start before you're ready", desc:"Perfection is procrastination. Ship something rough. Jorgin'." },
    ],
    truths:[
      { text:"Re-lock isn't about finding the perfect thing — it's about choosing one good enough thing.", bold:"good enough" },
      { text:"You've done this before. You know how to lock in. Trust the muscle memory.", bold:"muscle memory" },
      { text:"The pull you're feeling is valid. It doesn't need to be logical to be right.", bold:"valid" },
      { text:"Commitment isn't a trap. It's the doorway to depth. And you crave depth.", bold:"depth" },
      { text:"Every great phase of your life started with this exact feeling.", bold:"this exact feeling" },
      { text:"Stop waiting for certainty. Start with curiosity. The lock-in will follow.", bold:"curiosity" },
    ],
    closingTitle:"The fire is relighting.",
    closingBody:"You can feel it. Don't overthink it. The next chapter doesn't need a perfect plan — it needs a first step.",
  },
};

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

/* ─── EMBER HEAT (days since last stoke) ─── */
const TIME_BOXES = [{label:"15m",mins:15},{label:"30m",mins:30},{label:"1hr",mins:60}];

function getContainState(containedDates) {
  if (!containedDates || containedDates.length===0) return null;
  const d = today();
  const todayEntry = containedDates.find(e=>e.date===d);
  return todayEntry || null; // { date, mins }
}

function getEmberState(stokedDates) {
  if (!stokedDates || stokedDates.length === 0) return "cold";
  const d = today();
  if (stokedDates.includes(d)) return "stoked";
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate()-2);
  if (stokedDates.includes(yesterday.toISOString().slice(0,10))) return "warm";
  if (stokedDates.includes(twoDaysAgo.toISOString().slice(0,10))) return "cooling";
  return "cold";
}

/* ─── ITEM ROW (matrix sheet) ─── */
function TaskRow({ item, quadColor, onDelete, onEdit, onMove, onComplete, onStoke, onDeflect, onContain, isQ2, isQ3, primaryLane, sideLanes }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.text);
  const [showMove, setShowMove] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [justStoked, setJustStoked] = useState(false);
  const [deflecting, setDeflecting] = useState(null);
  const [showTimebox, setShowTimebox] = useState(false);
  const [justContained, setJustContained] = useState(false);
  const inputRef = useRef();
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);

  const commit = () => {
    if(val.trim()&&val.trim()!==item.text) onEdit(item.id, val.trim());
    else setVal(item.text);
    setEditing(false);
  };

  const handleComplete = () => {
    setCompleting(true);
    setTimeout(()=>onComplete(item.id), 400);
  };

  const handleStoke = () => {
    onStoke(item.id);
    setJustStoked(true);
    setTimeout(()=>setJustStoked(false), 800);
  };

  const handleDeflect = (action) => {
    setDeflecting(action);
    setTimeout(()=>onDeflect(item.id, action), 450);
  };

  const handleContain = (mins) => {
    onContain(item.id, mins);
    setShowTimebox(false);
    setJustContained(true);
    setTimeout(()=>setJustContained(false), 800);
  };

  const ember = isQ2 ? getEmberState(item.stokedDates) : null;
  const contained = (isQ3 && item.recurring) ? getContainState(item.containedDates) : null;
  const stokedToday = ember === "stoked";

  const moveOptions = [
    { label:"⚡ Do Now",       urgency:"q1" },
    { label:"🔥 Focus Deeply", urgency:null, forceLane: primaryLane },
    { label:"⏱ Limit",        urgency:"q3" },
    { label:"🎮 Enjoy Freely", urgency:null, forceLane: sideLanes[0]||"gaming" },
  ];

  // Ember visual styles
  const emberIcon = ember==="stoked"?"🔥": ember==="warm"?"🔥": ember==="cooling"?"🪨":"🪨";
  const emberOpacity = ember==="stoked"?1 : ember==="warm"?0.65 : ember==="cooling"?0.35 : 0.2;

  return (
    <div style={{ marginBottom:6, opacity:completing?0:1, transform:completing?"scale(0.95)": justStoked?"scale(1.02)":"scale(1)", transition:"all 0.35s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background: isQ2&&stokedToday ? `${quadColor}18` : deflecting ? (deflecting==="deflect"?`${T.sage}18`:`${T.coral}18`) : `${quadColor}10`, border:`1px solid ${isQ2&&stokedToday ? quadColor+"44" : quadColor+"28"}`, borderRadius:12, transition:"all 0.3s ease" }}>
        {isQ2 ? (
          /* Ember button for Q2 */
          <button onClick={stokedToday?undefined:handleStoke} style={{ width:24, height:24, borderRadius:"50%", background:stokedToday?`${quadColor}30`:"transparent", border:`2px solid ${stokedToday?quadColor:quadColor+"44"}`, cursor:stokedToday?"default":"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:0, transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", transform:justStoked?"scale(1.3)":"scale(1)", opacity:emberOpacity, fontSize:12 }}
            title={stokedToday?"Stoked today":"Stoke the ember"}>
            {emberIcon}
          </button>
        ) : isQ3 && item.recurring ? (
          /* Time-box for recurring Q3 */
          <button onClick={()=>contained?undefined:setShowTimebox(!showTimebox)} style={{ width:26, height:26, borderRadius:"50%", background:contained?`${T.amber}30`:"transparent", border:`2px solid ${contained?T.amber:T.amber+"44"}`, cursor:contained?"default":"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:0, fontSize:12, transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", transform:justContained?"scale(1.25)":"scale(1)", opacity:contained?1:0.6 }}
            title={contained?`Contained ${contained.mins}m today`:"Set time box"}>
            {contained?"⏱":"⏱"}
          </button>
        ) : isQ3 ? (
          /* Deflect / Absorb for one-off Q3 */
          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
            <button onClick={()=>handleDeflect("deflect")} style={{ width:24, height:24, borderRadius:"50%", background:deflecting==="deflect"?`${T.sage}44`:"transparent", border:`2px solid ${T.sage}55`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, fontSize:11, transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)", transform:deflecting==="deflect"?"scale(1.2)":"scale(1)" }}
              title="Deflect — said no or delegated">🛡</button>
            <button onClick={()=>handleDeflect("absorb")} style={{ width:24, height:24, borderRadius:"50%", background:deflecting==="absorb"?`${T.coral}44`:"transparent", border:`2px solid ${T.coral}44`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, fontSize:11, transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)", transform:deflecting==="absorb"?"scale(1.2)":"scale(1)" }}
              title="Absorb — it ate your time">🫠</button>
          </div>
        ) : (
          /* Checkbox for Q1/Q4 */
          <button onClick={handleComplete} style={{ width:20, height:20, borderRadius:"50%", background:"transparent", border:`2px solid ${quadColor}66`, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", padding:0, transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.background=`${quadColor}33`;e.currentTarget.style.borderColor=quadColor;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=`${quadColor}66`;}}>
            {completing && <span style={{ color:quadColor, fontSize:11 }}>✓</span>}
          </button>
        )}
        {editing ? (
          <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
            onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(item.text);setEditing(false);}}}
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:T.ink, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}
          />
        ) : (
          <div style={{ flex:1, minWidth:0 }}>
            <div onDoubleClick={()=>setEditing(true)} style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.4, cursor:"text", marginBottom:3 }}>{item.text}</div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <LaneBadge laneId={item.lane} small />
              {item.recurring && <span style={{ fontSize:9, color:T.amber, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, background:`${T.amber}18`, padding:"1px 5px", borderRadius:8 }}>recurring</span>}
              {contained && <span style={{ fontSize:9, color:T.sage, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, background:`${T.sage}18`, padding:"1px 5px", borderRadius:8 }}>{contained.mins}m today</span>}
            </div>
          </div>
        )}
        <button onClick={()=>setShowMove(!showMove)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:13, padding:"0 2px", opacity:0.7, flexShrink:0 }} title="Move to quad">⇄</button>
        <button onClick={()=>setEditing(true)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:13, padding:"0 2px", opacity:0.7, flexShrink:0 }}>✎</button>
        <button onClick={()=>onDelete(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.dusty, fontSize:17, padding:"0 2px", lineHeight:1, opacity:0.7, flexShrink:0 }}>×</button>
      </div>
      {showTimebox && (
        <div className="fade-up" style={{ display:"flex", gap:6, padding:"6px 4px 0" }}>
          {TIME_BOXES.map(tb=>(
            <button key={tb.mins} onClick={()=>handleContain(tb.mins)} style={{ padding:"5px 12px", background:`${T.amber}15`, border:`1px solid ${T.amber}33`, borderRadius:20, fontSize:11, color:T.amber, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, transition:"all 0.2s" }}>
              ⏱ {tb.label}
            </button>
          ))}
          <button onClick={()=>setShowTimebox(false)} style={{ padding:"5px 10px", background:"transparent", border:`1px solid ${T.cardBdr}`, borderRadius:20, fontSize:11, color:T.dusty, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>cancel</button>
        </div>
      )}
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
        </div>
      </div>
    </div>
  );
}

/* ══════════════ SCREENS ══════════════ */

/* HOME */
/* ─── SERENDIPITY ─── */
function getSerendipity(items, phase, mood, primaryLane, sideLanes) {
  const pc = PHASE_CONTENT[phase] || PHASE_CONTENT["gap"];
  const sources = [];
  // Random item with context
  if (items.length > 0) {
    const item = items[Math.floor(Math.random()*items.length)];
    const quad = deriveQuad(item, primaryLane, sideLanes);
    const qm = QUAD_META[quad];
    sources.push({ type:"item", icon:qm.emoji, label:`From ${qm.title}`, text:item.text, color:qm.color });
  }
  // Random mantra
  const m = MANTRAS[Math.floor(Math.random()*MANTRAS.length)];
  sources.push({ type:"mantra", icon:"🔥", label:"Mantra", text:m.text, sub:m.sub, color:T.coral });
  // Random ritual from current phase
  const r = pc.rituals[Math.floor(Math.random()*pc.rituals.length)];
  sources.push({ type:"ritual", icon:r.icon, label:`${pc.mode.replace(" Mode","")} Ritual`, text:r.title, sub:r.desc, color:pc.color });
  // Random truth from current phase
  const tr = pc.truths[Math.floor(Math.random()*pc.truths.length)];
  sources.push({ type:"truth", icon:"💬", label:"Truth", text:tr.text, color:pc.color });
  // Cross-lane connection
  if (items.length >= 2) {
    const shuffled = [...items].sort(()=>Math.random()-0.5);
    const a = shuffled[0], b = shuffled.find(x=>x.lane!==a.lane) || shuffled[1];
    if (a && b && a.id !== b.id) {
      sources.push({ type:"connection", icon:"🔗", label:"What if these connected?", text:`${a.text}`, sub:`${b.text}`, color:T.purple });
    }
  }
  // Mood-adaptive prompt
  const moodPrompts = mood <= 2
    ? [{ type:"prompt", icon:"🌙", label:"Gentle nudge", text:"Low energy is information, not failure. What do you actually need right now?", color:T.lavBlue }]
    : mood >= 4
    ? [{ type:"prompt", icon:"⚡", label:"Momentum check", text:"You're riding a wave — what's the one thing you'd regret not doing today?", color:T.coral }]
    : [{ type:"prompt", icon:"🙂", label:"Steady state", text:"Steady is powerful. What small thing would make today feel complete?", color:T.sage }];
  sources.push(...moodPrompts);
  return sources[Math.floor(Math.random()*sources.length)];
}

function SerendipityCard({ spark, onShuffle }) {
  if (!spark) return null;
  return (
    <div style={{ padding:"14px 20px 0" }}>
      <div style={{ background:`linear-gradient(135deg,${T.purple}14,${T.amber}08)`, border:`1.5px solid ${T.purple}33`, borderRadius:20, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
        <Orb size={70} color1={T.purple} opacity={0.15} style={{ top:-16, right:-10 }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>✨</span>
              <div style={{ fontSize:10, letterSpacing:2, color:T.purple, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>Serendipity</div>
            </div>
            <button onClick={onShuffle} style={{ background:`${T.purple}18`, border:`1px solid ${T.purple}33`, borderRadius:20, padding:"4px 10px", cursor:"pointer", fontSize:11, color:T.purple, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              🔀 shuffle
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`${spark.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{spark.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:spark.color, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>{spark.label}</div>
              <div style={{ fontSize:14, color:T.ink, fontFamily:"'Clash Display',sans-serif", fontWeight:700, lineHeight:1.35 }}>{spark.text}</div>
              {spark.sub && <div style={{ fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:3, lineHeight:1.45 }}>{spark.sub}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ phase, mood, setMood, primaryLane, sideLanes, mantraIdx, onNav, items, spark, onShuffle, completedToday, deflectStats, completedLog }) {
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

      {/* Serendipity */}
      <SerendipityCard spark={spark} onShuffle={onShuffle} />

      {/* Phase reflection callout */}
      {(()=>{
        const pc = PHASE_CONTENT[phase] || PHASE_CONTENT["gap"];
        const phaseLabels = {"lock-in":"You're locked in","expansion":"You're exploring","gap":"You're in the gap","relock":"Something's emerging"};
        const phaseCtas = {"lock-in":"Stay on target →","expansion":"Follow the curiosity →","gap":"Let boredom do its work →","relock":"Lean into the pull →"};
        return (
          <div style={{ padding:"14px 20px 0" }}>
            <button onClick={()=>onNav("reflect")} style={{ width:"100%", cursor:"pointer", background:"linear-gradient(135deg,#181628,#111020)", border:`1.5px solid ${pc.color}33`, borderRadius:20, padding:"16px 20px", textAlign:"left", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
              onTouchStart={e=>e.currentTarget.style.transform="scale(0.98)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
              <Orb size={100} color1={pc.color} opacity={0.18} style={{ top:-20, right:-20 }}/>
              <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28 }}>{pc.icon}</span>
                <div>
                  <div style={{ fontSize:10, letterSpacing:2, color:pc.color, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>{phaseLabels[phase]||"Reflect"}</div>
                  <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:T.ink }}>{phaseCtas[phase]||"Open reflection →"}</div>
                </div>
              </div>
            </button>
          </div>
        );
      })()}

      {/* Stats row */}
      <div style={{ padding:"14px 20px 0" }}>
        <div style={{ background:T.card, borderRadius:18, padding:"16px", border:`1px solid ${T.cardBdr}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0 }}>
            {[{val:total,label:"Active",color:T.ink},{val:completedToday,label:"Done Today",color:T.sage},{val:q1,label:"Do Now",color:T.coral},{val:deflectStats.total>0?`${deflectStats.deflected}/${deflectStats.total}`:"-",label:"Deflected",color:deflectStats.deflected>=deflectStats.absorbed?T.sage:T.coral}].map((s,i)=>(
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

/* ─── INLINE QUAD ADD ─── */
function InlineQuadAdd({ qid, quadColor, onAdd, primaryLane, sideLanes }) {
  const [val, setVal] = useState("");
  const [selLane, setSelLane] = useState(
    qid==="q2" ? primaryLane :
    qid==="q4" ? (sideLanes[0]||"gaming") :
    qid==="q1" ? primaryLane : "social"
  );
  const [showLanes, setShowLanes] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const inputRef = useRef();

  const add = () => {
    if (!val.trim()) return;
    const urgency = qid==="q1"?"q1" : qid==="q3"?"q3" : null;
    const item = { id:mkId(), text:val.trim(), lane:selLane, urgency };
    if (qid==="q3" && recurring) item.recurring = true;
    onAdd(item);
    setVal("");
  };

  return (
    <div style={{ marginTop:8 }}>
      {showLanes && (
        <div className="fade-up" style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:6 }}>
          {LANES.map(lane=>(
            <button key={lane.id} onClick={()=>setSelLane(lane.id)} style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:3, padding:"4px 8px", borderRadius:16, background:selLane===lane.id?`${lane.color}20`:T.bg, border:`1px solid ${selLane===lane.id?lane.color:T.cardBdr}`, color:selLane===lane.id?lane.color:T.dusty, fontSize:10, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:selLane===lane.id?700:400 }}>
              {lane.icon} {lane.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={()=>setShowLanes(!showLanes)} style={{ width:30, height:30, borderRadius:8, background:`${quadColor}12`, border:`1px solid ${quadColor}28`, color:quadColor, fontSize:12, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }} title="Select lane">
          {LANES.find(l=>l.id===selLane)?.icon||"🏷"}
        </button>
        <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Add item..."
          style={{ flex:1, padding:"9px 12px", background:T.bg, border:`1px solid ${quadColor}28`, borderRadius:10, fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.ink, outline:"none" }}
        />
        {qid==="q3" && (
          <button onClick={()=>setRecurring(!recurring)} style={{ width:30, height:30, borderRadius:8, background:recurring?`${T.amber}25`:`${quadColor}12`, border:`1px solid ${recurring?T.amber:quadColor+"28"}`, color:recurring?T.amber:quadColor, fontSize:12, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }} title={recurring?"Recurring (stays)":"One-off (removed after)"}>
            {recurring?"🔄":"1×"}
          </button>
        )}
        <button onClick={add} style={{ width:30, height:30, borderRadius:8, background:quadColor, border:"none", color:"white", fontSize:16, cursor:"pointer", flexShrink:0 }}>+</button>
      </div>
    </div>
  );
}

/* MATRIX */
function MatrixScreen({ items, onAddItem, onDeleteItem, onEditItem, onMoveItem, onCompleteItem, onStokeItem, onDeflectItem, onContainItem, completedToday, deflectStats, primaryLane, sideLanes }) {
  const byQuad = qid => items.filter(i => deriveQuad(i, primaryLane, sideLanes) === qid);

  return (
    <div className="fade-up" style={{ padding:"20px 20px 110px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink }}>Focus Matrix</div>
          <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Tap ○ to complete · 🔥 stoke · 🛡🫠 limit · double-tap edit
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {deflectStats.total > 0 && (
            <div style={{ background:`${deflectStats.deflected>=deflectStats.absorbed?T.sage:T.coral}18`, border:`1px solid ${deflectStats.deflected>=deflectStats.absorbed?T.sage:T.coral}33`, borderRadius:14, padding:"6px 10px", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:12 }}>🛡</span>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, color:deflectStats.deflected>=deflectStats.absorbed?T.sage:T.coral }}>{deflectStats.deflected}/{deflectStats.total}</div>
            </div>
          )}
          {completedToday > 0 && (
            <div style={{ background:`${T.sage}18`, border:`1px solid ${T.sage}33`, borderRadius:14, padding:"6px 10px", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:12 }}>✓</span>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, color:T.sage }}>{completedToday}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {(["q1","q2","q3","q4"]).map(qid=>{
          const q = QUAD_META[qid];
          const qItems = byQuad(qid);
          const isPrimary = qid==="q2";
          return (
            <div key={qid} style={{ background:isPrimary?`linear-gradient(145deg,${q.dim},${T.card})`:T.card, border:`1.5px solid ${isPrimary?q.color+"44":T.cardBdr}`, borderRadius:20, padding:"18px 18px 14px", position:"relative", overflow:"hidden", boxShadow:isPrimary?`0 8px 28px ${q.color}18`:"none" }}>
              {isPrimary&&<div style={{ position:"absolute", top:12, right:12, background:q.color, color:"white", fontSize:8, fontWeight:800, letterSpacing:1.5, padding:"3px 8px", borderRadius:20, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>Main</div>}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:12, background:q.dim, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{q.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, color:T.ink }}>{q.title}</div>
                  <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{q.label} · {qItems.length} item{qItems.length!==1?"s":""}</div>
                </div>
              </div>
              {/* Lane badges */}
              {qid==="q2" && <div style={{ marginBottom:8 }}><LaneBadge laneId={primaryLane} small /></div>}
              {qid==="q4" && sideLanes.length>0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                  {sideLanes.map(lid=><LaneBadge key={lid} laneId={lid} small />)}
                </div>
              )}
              {/* Items inline */}
              {qItems.length===0
                ? <div style={{ padding:"10px 0", color:T.dusty, fontSize:12, fontStyle:"italic", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Nothing here yet</div>
                : qItems.map(item=>(
                  <TaskRow key={item.id} item={item} quadColor={q.color}
                    onDelete={onDeleteItem} onEdit={onEditItem} onMove={onMoveItem} onComplete={onCompleteItem}
                    onStoke={onStokeItem} onDeflect={onDeflectItem} onContain={onContainItem}
                    isQ2={qid==="q2"} isQ3={qid==="q3"}
                    primaryLane={primaryLane} sideLanes={sideLanes}
                  />
                ))
              }
              {/* Inline add */}
              <InlineQuadAdd qid={qid} quadColor={q.color} onAdd={onAddItem} primaryLane={primaryLane} sideLanes={sideLanes} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* REFLECT (phase-aware) */
function ReflectScreen({ phase }) {
  const pc = PHASE_CONTENT[phase] || PHASE_CONTENT["gap"];
  const c = pc.color;
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
        <Orb size={180} color1={c} opacity={0.18} style={{ top:-40, right:-30 }}/>
        <Orb size={140} color1={T.sage} opacity={0.1} style={{ bottom:-40, left:-20 }}/>
        {[...Array(7)].map((_,i)=>(
          <div key={i} style={{ position:"absolute", width:2+(i%3), height:2+(i%3), borderRadius:"50%", background:[c,T.sage,T.dusty][i%3], opacity:0.12+(i%3)*0.06, left:`${12+i*13}%`, top:`${25+Math.sin(i*1.2)*28}%`, animation:`breathe ${3+i*0.5}s ease-in-out infinite`, animationDelay:`${i*0.35}s` }}/>
        ))}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:`${c}26`, border:`1.5px solid ${c}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, animation:"breathe 5s ease-in-out infinite" }}>{pc.icon}</div>
            <div style={{ fontSize:10, letterSpacing:3, fontWeight:600, color:`${c}99`, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase" }}>{pc.mode}</div>
          </div>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:T.ink, lineHeight:1.25, marginBottom:10, whiteSpace:"pre-line" }}>{pc.title}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6, whiteSpace:"pre-line" }}>{pc.subtitle}</div>
        </div>
      </div>
      <div style={{ padding:"0 20px" }}>
        {/* Distinction callout */}
        <div style={{ marginTop:18, background:`linear-gradient(135deg,${c}14,${c}06)`, border:`1.5px solid ${c}28`, borderRadius:18, padding:"16px 18px" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:c, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:"uppercase", marginBottom:6 }}>{pc.distinction.label}</div>
          <div style={{ fontSize:17, fontFamily:"'Clash Display',sans-serif", fontWeight:700, color:T.ink, marginBottom:6 }}>{pc.distinction.title}</div>
          <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6 }}>{pc.distinction.body}</div>
        </div>
        {/* Journal */}
        <div style={{ marginTop:22 }}>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:2 }}>{pc.journalTitle}</div>
          <div style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:12 }}>{pc.journalSubtitle}</div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:12 }}>
            {pc.prompts.map((p,i)=>(
              <button key={i} onClick={()=>setText(prev=>prev?prev+"\n\n"+p+" ":p+" ")} style={{ flexShrink:0, padding:"9px 14px", background:T.card, border:`1.5px solid ${T.cardBdr}`, borderRadius:12, cursor:"pointer", fontSize:12, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", maxWidth:170, textAlign:"left", lineHeight:1.4 }}>{p}</button>
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={pc.placeholder}
            style={{ width:"100%", minHeight:150, background:T.card, border:`1.5px solid ${c}30`, borderRadius:18, padding:"16px", fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.ink, lineHeight:1.7, outline:"none", resize:"none", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, marginBottom:18 }}>
            <span style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{wc} words</span>
            <button onClick={save} style={{ padding:"10px 22px", background:saved?T.sage:`linear-gradient(135deg,${c},${c}bb)`, border:"none", borderRadius:12, color:"white", fontSize:13, fontFamily:"'Clash Display',sans-serif", fontWeight:700, cursor:"pointer", letterSpacing:1, transition:"all 0.3s ease" }}>{saved?"✓ Captured":"Capture it"}</button>
          </div>
          {entries.map(e=>(
            <div key={e.id} style={{ background:T.card, border:`1px solid ${T.cardBdr}`, borderRadius:14, padding:"12px 14px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>{e.time}</span>
                <button onClick={()=>setEntries(prev=>prev.filter(x=>x.id!==e.id))} style={{ background:"none", border:"none", color:T.dusty, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
              </div>
              <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{e.text}</div>
            </div>
          ))}
        </div>
        {/* Rituals */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:4 }}>{pc.mode.replace(" Mode","")} Rituals</div>
          <div style={{ fontSize:12, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:12 }}>Gentle anchors for this phase.</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {pc.rituals.map((r,i)=>{
              const on=ritual===i;
              return (
                <button key={i} onClick={()=>setRitual(on?null:i)} style={{ background:on?`${c}14`:T.card, border:`1.5px solid ${on?c+"55":T.cardBdr}`, borderRadius:16, padding:"14px", cursor:"pointer", textAlign:"left", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:on?"scale(1.02)":"scale(1)" }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{r.icon}</div>
                  <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:3 }}>{r.title}</div>
                  {on?<div className="fade-up" style={{ fontSize:11, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.5 }}>{r.desc}</div>:<div style={{ fontSize:10, color:c, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>tap →</div>}
                </button>
              );
            })}
          </div>
        </div>
        {/* Truths */}
        <div style={{ marginBottom:22 }}>
          <button onClick={()=>setShowTruths(!showTruths)} style={{ width:"100%", background:showTruths?`${c}12`:T.card, border:`1.5px solid ${showTruths?c+"44":T.cardBdr}`, borderRadius:16, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:14, fontWeight:700, color:T.ink }}>Truths for this phase</div>
                <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Reminders that ground you</div>
              </div>
            </div>
            <span style={{ color:c, fontSize:16, display:"inline-block", transition:"transform 0.25s", transform:showTruths?"rotate(180deg)":"none" }}>↓</span>
          </button>
          {showTruths&&(
            <div className="fade-up" style={{ paddingTop:8 }}>
              {pc.truths.map((t,i)=>(
                <div key={i} style={{ padding:"11px 14px", background:T.card, border:`1px solid ${T.cardBdr}`, borderLeft:`3px solid ${c}`, borderRadius:12, marginBottom:7 }}>
                  <div style={{ fontSize:13, color:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.6 }}>
                    {t.text.split(t.bold).map((part,j,arr)=>(<span key={j}>{part}{j<arr.length-1&&<strong style={{color:c}}>{t.bold}</strong>}</span>))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Closing */}
        <div style={{ padding:"18px 20px", background:"linear-gradient(135deg,#181628,#0f0e1a)", borderRadius:20, marginBottom:8, border:`1px solid ${c}18`, position:"relative", overflow:"hidden" }}>
          <Orb size={90} color1={c} opacity={0.18} style={{ top:-20, right:-20 }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:17, fontWeight:700, color:T.ink, lineHeight:1.3, marginBottom:6 }}>{pc.closingTitle}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.65 }}>{pc.closingBody}</div>
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

    </div>
  );
}

/* ─── NAV ─── */
/* ─── CONFIG FLOW (dream-like wizard) ─── */
function ConfigFlow({ step, setStep, mood, setMood, phase, setPhase, primaryLane, setPrimaryLane, sideLanes, setSideLanes, onAddItem, onClose }) {
  const [quickText, setQuickText] = useState("");
  const [quickLane, setQuickLane] = useState("ai");
  const totalSteps = 5;

  const addQuick = () => {
    if (!quickText.trim()) return;
    onAddItem({ id:mkId(), text:quickText.trim(), lane:quickLane, urgency:"q1" });
    setQuickText("");
  };

  const next = () => { if (step < totalSteps-1) setStep(step+1); else onClose(); };
  const back = () => { if (step > 0) setStep(step-1); };

  const toggleSide = id => setSideLanes(prev=>prev.includes(id)?prev.filter(l=>l!==id):[...prev,id]);

  const pages = [
    // Step 0: Mood
    <div key="mood" className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"0 20px" }}>
      <div style={{ fontSize:32 }}>🔥</div>
      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, textAlign:"center", lineHeight:1.2 }}>How's the fire<br/>burning?</div>
      <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>Check in with your energy right now.</div>
      <div style={{ display:"flex", gap:10, marginTop:8 }}>
        {MOODS.map(mo=>(
          <button key={mo.val} onClick={()=>setMood(mo.val)} style={{ width:60, padding:"14px 4px", background:mood===mo.val?`${T.coral}20`:"rgba(255,255,255,0.04)", border:`2px solid ${mood===mo.val?T.coral:"rgba(255,255,255,0.08)"}`, borderRadius:18, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:mood===mo.val?"scale(1.1)":"scale(1)" }}>
            <span style={{ fontSize:28 }}>{mo.emoji}</span>
            <span style={{ fontSize:10, color:mood===mo.val?T.coral:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:mood===mo.val?700:400 }}>{mo.label}</span>
          </button>
        ))}
      </div>
    </div>,
    // Step 1: Phase
    <div key="phase" className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"0 20px" }}>
      <div style={{ fontSize:32 }}>🌀</div>
      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, textAlign:"center", lineHeight:1.2 }}>Where are you<br/>in the cycle?</div>
      <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>No judgement. Just honesty.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", marginTop:4 }}>
        {PHASES.map(p=>{
          const on=phase===p.id;
          return (
            <button key={p.id} onClick={()=>setPhase(p.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:on?`${p.color}18`:T.card, border:`2px solid ${on?p.color:T.cardBdr}`, borderRadius:18, cursor:"pointer", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:on?"scale(1.02)":"scale(1)" }}>
              <div style={{ width:44, height:44, borderRadius:14, background:`${p.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{p.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, color:T.ink }}>{p.label}</div>
                <div style={{ fontSize:12, color:on?p.color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{p.sub}</div>
              </div>
              {on&&<div style={{ width:20, height:20, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{color:"white",fontSize:11}}>✓</span></div>}
            </button>
          );
        })}
      </div>
    </div>,
    // Step 2: Primary Lane
    <div key="lane" className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"0 20px" }}>
      <div style={{ fontSize:32 }}>🎯</div>
      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, textAlign:"center", lineHeight:1.2 }}>What's your<br/>main lane?</div>
      <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>This feeds Focus Deeply (Q2).</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", marginTop:4 }}>
        {LANES.map(lane=>{
          const on=primaryLane===lane.id;
          return (
            <button key={lane.id} onClick={()=>setPrimaryLane(lane.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", background:on?`${lane.color}18`:T.card, border:`2px solid ${on?lane.color:T.cardBdr}`, borderRadius:16, cursor:"pointer", transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform:on?"scale(1.02)":"scale(1)" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${lane.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{lane.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:T.ink }}>{lane.label}</div>
              </div>
              {on&&<div style={{ width:20, height:20, borderRadius:"50%", background:lane.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{color:"white",fontSize:11}}>✓</span></div>}
            </button>
          );
        })}
      </div>
    </div>,
    // Step 3: Side Lanes
    <div key="sides" className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"0 20px" }}>
      <div style={{ fontSize:32 }}>🎮</div>
      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, textAlign:"center", lineHeight:1.2 }}>Which side lanes<br/>today?</div>
      <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>These feed Enjoy Freely (Q4). No guilt.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", marginTop:4 }}>
        {LANES.filter(l=>l.id!==primaryLane).map(lane=>{
          const on=sideLanes.includes(lane.id);
          return (
            <button key={lane.id} onClick={()=>toggleSide(lane.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:on?`${lane.color}12`:T.card, border:`1.5px solid ${on?lane.color+"55":T.cardBdr}`, borderRadius:14, cursor:"pointer", transition:"all 0.2s ease" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${lane.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{lane.icon}</div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:600, color:on?T.ink:T.inkSoft, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{lane.label}</div>
              </div>
              <div style={{ width:32, height:18, borderRadius:9, background:on?lane.color:T.muted, display:"flex", alignItems:"center", padding:"0 3px", transition:"all 0.2s", justifyContent:on?"flex-end":"flex-start" }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:"white" }}/>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    // Step 4: Quick Add
    <div key="quick" className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"0 20px" }}>
      <div style={{ fontSize:32 }}>⚡</div>
      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:28, fontWeight:700, color:T.ink, textAlign:"center", lineHeight:1.2 }}>Anything urgent<br/>right now?</div>
      <div style={{ fontSize:13, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center" }}>Add to Do Now (Q1) or skip.</div>
      <div style={{ width:"100%", marginTop:4 }}>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8 }}>
          {LANES.map(lane=>(
            <button key={lane.id} onClick={()=>setQuickLane(lane.id)} style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:3, padding:"5px 10px", borderRadius:16, background:quickLane===lane.id?`${lane.color}20`:T.bg, border:`1.5px solid ${quickLane===lane.id?lane.color:T.cardBdr}`, color:quickLane===lane.id?lane.color:T.dusty, fontSize:11, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:quickLane===lane.id?700:400 }}>
              {lane.icon} {lane.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <input value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addQuick()}
            placeholder="What needs doing now?"
            style={{ flex:1, padding:"12px 16px", background:T.card, border:`1.5px solid ${T.coral}30`, borderRadius:14, fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.ink, outline:"none" }}
          />
          <button onClick={addQuick} style={{ width:46, height:46, borderRadius:14, background:T.coral, border:"none", color:"white", fontSize:22, cursor:"pointer", flexShrink:0 }}>+</button>
        </div>
      </div>
    </div>,
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", flexDirection:"column", background:"rgba(10,9,20,0.96)", backdropFilter:"blur(30px)" }}>
      {/* Ambient orbs */}
      <Orb size={300} color1={T.coral} opacity={0.06} style={{ top:-80, left:-80 }}/>
      <Orb size={250} color1={T.sage} opacity={0.05} style={{ bottom:-60, right:-60 }}/>
      <Orb size={200} color1={T.lavBlue} opacity={0.04} style={{ top:"30%", right:-40 }}/>
      <Orb size={180} color1={T.purple} opacity={0.05} style={{ bottom:"20%", left:-30 }}/>
      {/* Close button */}
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"16px 20px 0" }}>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.cardBdr}`, borderRadius:12, width:36, height:36, cursor:"pointer", fontSize:14, color:T.dusty, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>
      {/* Content */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        <div key={step} style={{ width:"100%", maxWidth:400 }}>
          {pages[step]}
        </div>
      </div>
      {/* Navigation */}
      <div style={{ padding:"0 20px 40px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        {/* Dots */}
        <div style={{ display:"flex", gap:8 }}>
          {Array.from({length:totalSteps}).map((_,i)=>(
            <div key={i} style={{ width:i===step?24:8, height:8, borderRadius:4, background:i===step?T.coral:`${T.dusty}44`, transition:"all 0.3s ease" }}/>
          ))}
        </div>
        {/* Buttons */}
        <div style={{ display:"flex", gap:12, width:"100%" }}>
          {step>0 && (
            <button onClick={back} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${T.cardBdr}`, borderRadius:16, color:T.inkSoft, fontSize:15, fontFamily:"'Clash Display',sans-serif", fontWeight:700, cursor:"pointer" }}>Back</button>
          )}
          <button onClick={next} style={{ flex:step>0?1:undefined, width:step===0?"100%":undefined, padding:"14px", background:`linear-gradient(135deg,${T.coral},${T.amber})`, border:"none", borderRadius:16, color:"white", fontSize:15, fontFamily:"'Clash Display',sans-serif", fontWeight:700, cursor:"pointer", boxShadow:`0 4px 20px ${T.coral}44` }}>
            {step===totalSteps-1?"Let's go 🔥":"Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── NAV ─── */
const NAV = [
  { id:"home",   icon:"🏠", label:"Home"   },
  { id:"matrix", icon:"⚡", label:"Matrix" },
  { id:"reflect",icon:"✨", label:"Reflect"},
  { id:"phase",  icon:"🌀", label:"Phase"  },
  { id:"lanes",  icon:"🎯", label:"Lanes"  },
];

/* ─── APP ─── */
export default function App() {
  const saved = useRef(loadState()).current;
  const [screen, setScreen]           = useState("home");
  const [items, setItems]             = useState(saved?.items || INITIAL_ITEMS);
  const [phase, setPhase]             = useState(saved?.phase || "gap");
  const [mood, setMood]               = useState(saved?.mood || 3);
  const [primaryLane, setPrimaryLane] = useState(saved?.primaryLane || "ai");
  const [sideLanes, setSideLanes]     = useState(saved?.sideLanes || ["gaming","fitness","social"]);
  const [completedLog, setCompletedLog] = useState(saved?.completedLog || []);
  const [mantraIdx, setMantraIdx]     = useState(0);
  const [spark, setSpark]             = useState(null);
  const [showConfig, setShowConfig]   = useState(!saved);
  const [configStep, setConfigStep]   = useState(0);
  const [loadingTip, setLoadingTip]   = useState(()=>LOADING_TIPS[Math.floor(Math.random()*LOADING_TIPS.length)]);
  const [showTip, setShowTip]         = useState(!saved);

  const refreshSpark = () => setSpark(getSerendipity(items, phase, mood, primaryLane, sideLanes));

  // Persist state on every change
  useEffect(()=>{
    saveState({ items, phase, mood, primaryLane, sideLanes, completedLog });
  },[items, phase, mood, primaryLane, sideLanes, completedLog]);

  useEffect(()=>{
    const id=setInterval(()=>setMantraIdx(m=>(m+1)%MANTRAS.length),6000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{ refreshSpark(); },[phase, mood, primaryLane]);

  // Dismiss loading tip after 3s
  useEffect(()=>{
    if (showTip) {
      const id = setTimeout(()=>setShowTip(false), 3000);
      return ()=>clearTimeout(id);
    }
  },[showTip]);

  const completedToday = completedLog.filter(e => e.date === today() && !e.action).length;
  const deflectStats = (() => {
    const todayEntries = completedLog.filter(e => e.date === today() && e.action);
    return { deflected: todayEntries.filter(e=>e.action==="deflect").length, absorbed: todayEntries.filter(e=>e.action==="absorb").length, total: todayEntries.length };
  })();

  /* Item CRUD */
  const addItem    = (item) => setItems(prev=>[...prev, item]);
  const deleteItem = (id)   => setItems(prev=>prev.filter(i=>i.id!==id));
  const editItem   = (id, text) => setItems(prev=>prev.map(i=>i.id===id?{...i,text}:i));
  const moveItem   = (id, urgency, forceLane) => setItems(prev=>prev.map(i=>i.id===id?{...i, urgency, lane: forceLane||i.lane}:i));
  const completeItem = (id) => {
    const item = items.find(i=>i.id===id);
    if (item) {
      setCompletedLog(prev=>[...prev, { text:item.text, lane:item.lane, quad:deriveQuad(item, primaryLane, sideLanes), date:today(), time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]);
      setItems(prev=>prev.filter(i=>i.id!==id));
    }
  };
  const stokeItem = (id) => {
    const d = today();
    setItems(prev=>prev.map(i=>i.id===id?{...i, stokedDates:[...(i.stokedDates||[]).filter(s=>s!==d), d]}:i));
  };
  const deflectItem = (id, action) => {
    const item = items.find(i=>i.id===id);
    if (item) {
      setCompletedLog(prev=>[...prev, { text:item.text, lane:item.lane, quad:"q3", action, date:today(), time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]);
      setItems(prev=>prev.filter(i=>i.id!==id));
    }
  };
  const containItem = (id, mins) => {
    const d = today();
    setItems(prev=>prev.map(i=>i.id===id?{...i, containedDates:[...(i.containedDates||[]).filter(e=>e.date!==d), {date:d, mins}]}:i));
  };

  const renderScreen = () => {
    switch(screen){
      case "home":   return <HomeScreen phase={phase} mood={mood} setMood={setMood} primaryLane={primaryLane} sideLanes={sideLanes} mantraIdx={mantraIdx} onNav={setScreen} items={items} spark={spark} onShuffle={refreshSpark} completedToday={completedToday} deflectStats={deflectStats} completedLog={completedLog}/>;
      case "matrix": return <MatrixScreen items={items} onAddItem={addItem} onDeleteItem={deleteItem} onEditItem={editItem} onMoveItem={moveItem} onCompleteItem={completeItem} onStokeItem={stokeItem} onDeflectItem={deflectItem} onContainItem={containItem} completedToday={completedToday} deflectStats={deflectStats} primaryLane={primaryLane} sideLanes={sideLanes}/>;
      case "reflect": return <ReflectScreen phase={phase}/>;
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
      {/* Loading tip — game-style */}
      {showTip && (
        <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, zIndex:400, padding:"env(safe-area-inset-top,12px) 20px 12px", background:"linear-gradient(180deg,rgba(19,18,32,0.98),rgba(19,18,32,0))", animation:"fadeIn 0.5s ease" }}>
          <div style={{ fontSize:11, color:T.dusty, fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:"center", fontStyle:"italic" }}>
            {loadingTip}
          </div>
        </div>
      )}
      {screen!=="home"&&(
        <div style={{ display:"flex", alignItems:"center", padding:"16px 20px 0", gap:12 }}>
          <button onClick={()=>setScreen("home")} style={{ background:T.card, border:`1px solid ${T.cardBdr}`, borderRadius:12, width:36, height:36, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:T.inkSoft }}>←</button>
          <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:18, fontWeight:700, color:T.ink }}>{NAV.find(n=>n.id===screen)?.label}</div>
        </div>
      )}
      <div key={screen}>{renderScreen()}</div>
      {/* FAB — config flow trigger */}
      {!showConfig && (
        <button onClick={()=>{setShowConfig(true);setConfigStep(0);}} style={{ position:"fixed", bottom:"calc(72px + env(safe-area-inset-bottom,0px))", left:"50%", transform:"translateX(-50%)", width:56, height:56, borderRadius:"50%", background:`linear-gradient(135deg,${T.coral},${T.amber})`, border:"none", zIndex:55, boxShadow:`0 4px 24px ${T.coral}66`, fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" }}
          onTouchStart={e=>e.currentTarget.style.transform="translateX(-50%) scale(0.92)"} onTouchEnd={e=>e.currentTarget.style.transform="translateX(-50%) scale(1)"}>
          🔥
        </button>
      )}
      {/* Config Flow overlay */}
      {showConfig && (
        <ConfigFlow
          step={configStep} setStep={setConfigStep}
          mood={mood} setMood={setMood}
          phase={phase} setPhase={setPhase}
          primaryLane={primaryLane} setPrimaryLane={setPrimaryLane}
          sideLanes={sideLanes} setSideLanes={setSideLanes}
          onAddItem={addItem}
          onClose={()=>{setShowConfig(false);setScreen("home");refreshSpark();}}
        />
      )}
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
