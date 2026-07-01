import { useState, useRef, useEffect } from "react";

const store = {
  async get(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} },
};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const COMMITTEE_MEMBERS = {
  "Sandra Hill": { title: "Department Chair", personality: "mediator", baseResistance: 0.2, course: "PSY 101 (3 sections, 280)", book: "McGraw-Hill $195", concerns: "consensus, budget" },
  "Kevin Park": { title: "Senior Professor (15y)", personality: "incumbent_loyalist", baseResistance: 0.7, course: "PSY 310 (2 sections, 140)", book: "McGraw-Hill $210", concerns: "disruption, proven system" },
  "Amy Liu": { title: "Assistant Professor (3y)", personality: "cost_advocate", baseResistance: 0.1, course: "PSY 220 (2 sections, 110)", book: "McGraw-Hill $185", concerns: "student affordability" },
  "Marcus Johnson": { title: "Associate Professor", personality: "pragmatist", baseResistance: 0.3, course: "PSY 101 (2 sections, 190)", book: "McGraw-Hill $195", concerns: "outcomes, ease" },
};

const PRESSURE_FACTORS = ["Semester starts in 3 weeks", "Budget review coming up", "Accreditation review in spring", "Competitor already pitching"];

const DEFAULT_SCENARIOS = [
  { id: "email-1", label: "Email Prospecting 1", icon: "📧", category: "Prospecting", briefing: { professorName: "Dr. Sarah Mitchell", institution: "Metro State University", department: "Psychology", courses: ["PSY 101 (320 across 4 sections)"], currentBook: "Myers' Psychology — $198", notes: "Large enrollment course." }, bant: { budget: { trigger: "Ask about student cost response", value: "Large enrollment, $198 = burden" }, authority: { trigger: "Ask if others involved", value: "Individual" }, need: { trigger: "Ask what prompted search", value: "Cost to students" }, timeline: { trigger: "Ask when teaching, when decide", value: "Spring, by Dec" } }, persona_traits: { warmth: 0.8, resistance: 0.1, openness: 0.9, patience: 0.7 }, hidden_pain: [{ name: "Student cost", reveal: "cost questions" }], opening: "Hi, do you have exam copies for Introduction to Psychology v5.0? I'm teaching a large intro section and want to review options.", tips: "She initiated contact. Confirm exam copy send, then ask discovery questions about why she's looking." },
  { id: "email-2", label: "Email Prospecting 2", icon: "📧", category: "Prospecting", briefing: { professorName: "Prof. Jennifer Rodriguez", institution: "University of the Pacific", department: "Psychology", courses: ["PSY 301 (40)", "PSY 401 (25)"], currentBook: "Gravetter & Forzano — $185", notes: "Inquiring about rigor." }, bant: { budget: { trigger: "Ask if cost is consideration", value: "Quality > cost" }, authority: { trigger: "Ask if decides alone", value: "Individual" }, need: { trigger: "Ask what gaps she sees", value: "Highest rigor" }, timeline: { trigger: "Ask when course runs", value: "Next year" } }, persona_traits: { warmth: 0.5, resistance: 0.4, openness: 0.7, patience: 0.6 }, hidden_pain: [{ name: "Content rigor", reveal: "rigor questions" }], opening: "Do you have a Research Methods title? I'm interested in reviewing it for my courses.", tips: "Rigorous professor. Ask about her current book, what works, where gaps are." },
  { id: "email-3", label: "Email Prospecting 3", icon: "📧", category: "Prospecting", briefing: { professorName: "Dr. Robert Kim", institution: "Hillside College", department: "Psychology", courses: ["PSY 101 (FlatWorld)", "PSY 310 (Pearson $210)"], currentBook: "FlatWorld for Intro, Pearson for Cognitive", notes: "Happy with FlatWorld Intro." }, bant: { budget: { trigger: "Ask about savings", value: "Cost motivated adoption" }, authority: { trigger: "Ask if decides alone", value: "Individual" }, need: { trigger: "Ask what worked about Intro", value: "Happy, wants same for Cognitive" }, timeline: { trigger: "Ask when teaching", value: "Spring, moderate urgency" } }, persona_traits: { warmth: 0.85, resistance: 0.05, openness: 0.95, patience: 0.8 }, hidden_pain: [{ name: "Ease", reveal: "transition questions" }], opening: "Hi! Do you have a Cognitive Psychology title? I love FlatWorld for my intro course and want to try it for Cognitive too.", tips: "Expansion opportunity. Confirm Cognitive v5.0, make adoption easy." },
  { id: "email-4", label: "Email Prospecting 4", icon: "📧", category: "Prospecting", briefing: { professorName: "Prof. Michael Torres", institution: "Central Community College", department: "Business", courses: ["BUS 101 (210)", "BUS 215 (95)"], currentBook: "Cengage Unlimited — $150/sem", notes: "On bundle, skeptical." }, bant: { budget: { trigger: "Ask for cost comparison", value: "$150/sem covers multiple" }, authority: { trigger: "Ask if decides for dept", value: "Influences courses" }, need: { trigger: "Ask what works about Cengage", value: "Works, open if ROI clear" }, timeline: { trigger: "Ask about cycle", value: "Not urgent" } }, persona_traits: { warmth: 0.4, resistance: 0.6, openness: 0.6, patience: 0.5 }, hidden_pain: [{ name: "ROI", reveal: "ROI questions" }], opening: "Can you send information about how FlatWorld compares to Cengage Unlimited? We're on the bundle for multiple courses.", tips: "Don't dismiss Cengage. Ask what works, then show FlatWorld advantages." },
  { id: "email-5", label: "Email Prospecting 5", icon: "📧", category: "Prospecting", briefing: { professorName: "Dr. Lisa Chen", institution: "State University", department: "Psychology", courses: ["PSY 101 (280)", "PSY 220 (110)"], currentBook: "Zimbardo — $185", notes: "Dean affordability initiative, urgent." }, bant: { budget: { trigger: "Ask about dean targets", value: "Dean mandate" }, authority: { trigger: "Ask about dean role", value: "Individual but mandated" }, need: { trigger: "Ask about goals", value: "Current doesn't meet targets" }, timeline: { trigger: "Ask about deadline", value: "Very urgent" } }, persona_traits: { warmth: 0.9, resistance: 0.05, openness: 0.95, patience: 0.7 }, hidden_pain: [{ name: "Pressure", reveal: "initiative questions" }], opening: "Our dean just launched an affordability initiative. I need options for my large intro psych course. Do you have titles that would work?", tips: "High urgency. Lead with price and speed. Ask about dean's timeline." },
  { id: "inperson-1", label: "In-Person Prospecting 1", icon: "🎓", category: "Prospecting", briefing: { professorName: "Dr. James Wilson", institution: "Riverside Community College", department: "Psychology", courses: ["PSY 101 (240)", "PSY 220 (85)"], currentBook: "Schacter — $189", notes: "7 years at RCC, large sections." }, bant: { budget: { trigger: "Reference cost", value: "Student cost is pain" }, authority: { trigger: "Ask if decides", value: "Individual" }, need: { trigger: "Ask frustrations", value: "Complaints, hassle" }, timeline: { trigger: "Ask timing", value: "Spring, has time" } }, persona_traits: { warmth: 0.3, resistance: 0.4, openness: 0.5, patience: 0.2 }, hidden_pain: [{ name: "Cost complaints", reveal: "cost questions" }], opening: "I've got 10 minutes. What's up?", tips: "Limited time. Reference his 240 students. Mention cost pain. Ask workflow challenges." },
  { id: "inperson-2", label: "In-Person Prospecting 2", icon: "💼", category: "Prospecting", briefing: { professorName: "Prof. David Park", institution: "City University Business School", department: "Business", courses: ["BUS 101 (180)", "BUS 215 (70)"], currentBook: "Cengage + Shaw — $165", notes: "18 years, values authenticity." }, bant: { budget: { trigger: "Ask if cost matters", value: "Quality > cost" }, authority: { trigger: "Ask if decides", value: "Individual" }, need: { trigger: "Ask works/frustrates", value: "Works, open if case clear" }, timeline: { trigger: "Ask timeline", value: "Not urgent" } }, persona_traits: { warmth: 0.6, resistance: 0.5, openness: 0.7, patience: 0.7 }, hidden_pain: [{ name: "Authenticity", reveal: "genuine questions" }], opening: "Come in! What brings you by?", tips: "Skip pitch. Ask genuine questions. Let him talk." },
  { id: "inperson-3", label: "In-Person Prospecting 3", icon: "🎓", category: "Prospecting", briefing: { professorName: "Dr. Marcus Chen", institution: "Metropolitan University", department: "Psychology", courses: ["PSY 280 (110)", "PSY 380 (65)"], currentBook: "Sternberg — $205", notes: "4th year, open to new approaches." }, bant: { budget: { trigger: "Ask about goals", value: "Affordability goals" }, authority: { trigger: "Ask if decides", value: "Individual" }, need: { trigger: "Ask what building", value: "Reputation, quality" }, timeline: { trigger: "Ask timeline", value: "Spring, reasonable" } }, persona_traits: { warmth: 0.7, resistance: 0.2, openness: 0.85, patience: 0.75 }, hidden_pain: [{ name: "Reputation", reveal: "uniqueness questions" }], opening: "Oh hey! Yeah, I've got a few minutes. What's this about?", tips: "More open than seniors. Ask about courses. Mention affordability goals." },
  { id: "inperson-4", label: "In-Person Prospecting 4", icon: "💼", category: "Prospecting", briefing: { professorName: "Prof. Angela Torres", institution: "Northeast State College", department: "Business", courses: ["BUS 101 (190)", "BUS 320 (85)"], currentBook: "Pearson — $175-195", notes: "Curriculum leader, data-driven." }, bant: { budget: { trigger: "Ask about budget", value: "Seeking ROI" }, authority: { trigger: "Ask role", value: "Leader, influences" }, need: { trigger: "Ask outcomes", value: "Success, efficiency" }, timeline: { trigger: "Ask timeline", value: "Fall, not urgent" } }, persona_traits: { warmth: 0.5, resistance: 0.3, openness: 0.8, patience: 0.8 }, hidden_pain: [{ name: "Outcomes", reveal: "metrics questions" }], opening: "I can give you 15 minutes. What do you need?", tips: "Be specific. She wants evidence. Ask about learning metrics." },
  { id: "inperson-5", label: "In-Person Prospecting 5", icon: "🎓", category: "Prospecting", briefing: { professorName: "Dr. Patricia Okonkwo", institution: "Large State University", department: "Psychology", courses: ["PSY 101 (350 across 4)"], currentBook: "McGraw-Hill Connect — $185", notes: "Largest sections on campus." }, bant: { budget: { trigger: "Ask about access", value: "Barriers are real" }, authority: { trigger: "Ask if decides", value: "Individual, high-impact" }, need: { trigger: "Ask feedback", value: "Access poor, barriers" }, timeline: { trigger: "Ask timeline", value: "Fall, may add urgency" } }, persona_traits: { warmth: 0.6, resistance: 0.3, openness: 0.75, patience: 0.65 }, hidden_pain: [{ name: "Access", reveal: "access questions" }], opening: "I'm between classes but I have a few minutes. What brings you to the lounge?", tips: "Lead with scale. Ask about pain points—mobile access, grading." },
  { id: "committee-decision", label: "Committee Decision", icon: "🏛️", category: "Deal Management", briefing: { institution: "Westfield State University", department: "Psychology", courses: ["PSY 101 (300)", "PSY 220", "PSY 310"], currentBook: "McGraw-Hill Connect ($185–$220)", notes: "4-person committee evaluating textbooks." }, isCommittee: true, opening: null, tips: "Navigate 4 committee members. Get all on board for presentation stage." },
];

const COACH_SYSTEM = `You are a sales coach. Analyze: Discovery (BANT), Listening, Positioning, Control, Authority understanding. Return ONLY JSON:
{
  "score": <1-10>,
  "grade": "<A-F>",
  "summary": "<2 sentences>",
  "discovery_quality": "<BANT elements>",
  "listening_score": "<evidence>",
  "positioning": "<features tied to needs>",
  "control_assessment": "<commitment>",
  "authority_understanding": "<decision structure>",
  "strengths": ["<with evidence>"],
  "improvements": ["<gap>"],
  "missed_opportunity": "<biggest miss>",
  "better_response": "<model response>",
  "next_practice": "<one drill>"
}`;

const C = { bg: "#f8f9fb", surface: "#ffffff", surfaceAlt: "#f3f6fb", border: "#e2e8f0", borderHover: "#bfdbfe", accent: "#0066cc", accentSoft: "#dbeafe", accentText: "#0066cc", text: "#1a202c", textMid: "#4b5563", textDim: "#718096", green: "#22c55e", amber: "#f59e0b", red: "#f43f5e", purple: "#a78bfa" };

export default function App() {
  const [repName, setRepName] = useState("");
  const [view, setView] = useState("login");
  const [scenarios] = useState(DEFAULT_SCENARIOS);
  const [sessions, setSessions] = useState([]);
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  const [loginTab, setLoginTab] = useState("signin");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [admins, setAdmins] = useState([]);
  
  // Admin view state: null = scenarios, "dashboard" = reps list, "settings" = manage admins
  const [adminViewMode, setAdminViewMode] = useState(null);
  const [selectedRep, setSelectedRep] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [adminError, setAdminError] = useState("");

  const [committeeStage, setCommitteeStage] = useState("initial");
  const [committeePeople, setCommitteePeople] = useState({});
  const [currentCommitteePerson, setCurrentCommitteePerson] = useState(null);
  const [committeeMessagesLog, setCommitteeMessagesLog] = useState([]);
  const [committeePressureFactors, setCommitteePressureFactors] = useState([]);
  const [committeeVotes, setCommitteeVotes] = useState({});
  const [committeeOutcome, setCommitteeOutcome] = useState(null);
  const [presentationSlide, setPresentationSlide] = useState(0);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const s = await store.get("fw-sessions");
      if (s) setSessions(s);
      const a = await store.get("fw-admins");
      if (a) setAdmins(a);
    })();
  }, []);
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, committeeMessagesLog]);

  const saveSession = async (sess) => {
    const updated = [sess, ...sessions].slice(0, 200);
    setSessions(updated);
    await store.set("fw-sessions", updated);
  };

  const handleSignUp = async () => {
    setAuthError("");
    if (!usernameInput.trim() || !passwordInput || !confirmPasswordInput) {
      setAuthError("All fields required");
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setAuthError("Passwords don't match");
      return;
    }
    if (passwordInput.length < 4) {
      setAuthError("Password must be at least 4 characters");
      return;
    }

    const accounts = (await store.get("fw-accounts")) || {};
    if (accounts[usernameInput.trim()]) {
      setAuthError("Username already exists");
      return;
    }

    const hashedPassword = await hashPassword(passwordInput);
    accounts[usernameInput.trim()] = { hashedPassword, created: new Date().toISOString() };
    await store.set("fw-accounts", accounts);
    
    setRepName(usernameInput.trim());
    setUsernameInput("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    
    const adminList = (await store.get("fw-admins")) || [];
    if (adminList.length === 0) {
      const newAdmins = [usernameInput.trim()];
      setAdmins(newAdmins);
      await store.set("fw-admins", newAdmins);
      setIsAdmin(true);
    }
    
    setView("home");
  };

  const handleSignIn = async () => {
    setAuthError("");
    if (!usernameInput.trim() || !passwordInput) {
      setAuthError("Username and password required");
      return;
    }

    const accounts = (await store.get("fw-accounts")) || {};
    const account = accounts[usernameInput.trim()];
    
    if (!account) {
      setAuthError("Username not found");
      return;
    }

    const hashedPassword = await hashPassword(passwordInput);
    if (hashedPassword !== account.hashedPassword) {
      setAuthError("Incorrect password");
      return;
    }

    setRepName(usernameInput.trim());
    
    let adminList = (await store.get("fw-admins")) || [];
    let isAdminUser = adminList.includes(usernameInput.trim());
    
    if (adminList.length === 0) {
      adminList = [usernameInput.trim()];
      await store.set("fw-admins", adminList);
      isAdminUser = true;
    }
    
    setIsAdmin(isAdminUser);
    setAdmins(adminList);
    setUsernameInput("");
    setPasswordInput("");
    setView("home");
  };

  const handleLogout = () => {
    setRepName("");
    setUsernameInput("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setAuthError("");
    setLoginTab("signin");
    setIsAdmin(false);
    setAdminViewMode(null);
    setSelectedRep(null);
    setSelectedSession(null);
    setView("login");
  };

  const startScenario = (s) => {
    if (s.isCommittee) {
      setScenario(s);
      setCommitteeStage("initial");
      setCommitteePeople({});
      setCurrentCommitteePerson(null);
      setCommitteeMessagesLog([]);
      setCommitteePressureFactors(PRESSURE_FACTORS.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2)));
      setCommitteeVotes({});
      setCommitteeOutcome(null);
      setPresentationSlide(0);
      setView("committee");
    } else {
      setScenario(s);
      setMessages([{ role: "assistant", content: s.opening }]);
      setFeedback(null);
      setView("roleplay");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startFirstMeeting = () => {
    const people = Object.keys(COMMITTEE_MEMBERS);
    const random = people[Math.floor(Math.random() * people.length)];
    setCurrentCommitteePerson(random);
    setCommitteePeople({ ...committeePeople, [random]: { attempts: 0, score: null, agreed: false, transcript: [] } });
    setCommitteeMessagesLog([{ role: "assistant", content: `You run into ${random} (${COMMITTEE_MEMBERS[random].title}) on campus. How do you start?` }]);
    setCommitteeStage("meeting");
  };

  const endMeeting = (agreed) => {
    const score = agreed ? 6 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3);
    const person = currentCommitteePerson;
    setCommitteePeople({ ...committeePeople, [person]: { ...committeePeople[person], score, agreed } });
    setCommitteeStage("meetingend");
  };

  const nextPerson = () => {
    const people = Object.keys(COMMITTEE_MEMBERS).filter(p => !committeePeople[p]);
    if (people.length === 0) {
      setCommitteeStage("presentation");
      setPresentationSlide(0);
      return;
    }
    const random = people[Math.floor(Math.random() * people.length)];
    setCurrentCommitteePerson(random);
    setCommitteePeople({ ...committeePeople, [random]: { attempts: 0, score: null, agreed: false, transcript: [] } });
    setCommitteeMessagesLog([{ role: "assistant", content: `You run into ${random} (${COMMITTEE_MEMBERS[random].title}) on campus. How do you start?` }]);
    setCommitteeStage("meeting");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const systemPrompt = `You are ${scenario.briefing.professorName}. Respond naturally. Reveal pain points gradually based on question quality.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "...";
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "(Error)" }]);
    }
    setLoading(false);
  };

  const sendCommitteeMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const updated = [...committeeMessagesLog, userMsg];
    setCommitteeMessagesLog(updated);
    setInput("");
    setLoading(true);

    const member = COMMITTEE_MEMBERS[currentCommitteePerson];
    const systemPrompt = `You are ${currentCommitteePerson}, ${member.title}. Course: ${member.course}. Concerns: ${member.concerns}. Respond naturally based on question quality.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "...";
      setCommitteeMessagesLog([...updated, { role: "assistant", content: reply }]);
    } catch {
      setCommitteeMessagesLog([...updated, { role: "assistant", content: "(Error)" }]);
    }
    setLoading(false);
  };

  const simulateVote = () => {
    const votes = {};
    Object.entries(COMMITTEE_MEMBERS).forEach(([name, member]) => {
      const personData = committeePeople[name];
      const score = personData?.score || 0;
      let vote = "No";
      if (score >= 8) vote = "Yes";
      else if (score >= 6 && member.baseResistance < 0.4) vote = "Yes";
      else if (score >= 7) vote = "Yes";
      votes[name] = vote;
    });
    const yesCount = Object.values(votes).filter(v => v === "Yes").length;
    const decision = yesCount >= 3 ? "Adopt FlatWorld" : yesCount === 2 ? "Pilot One Course" : "Reject";
    setCommitteeVotes(votes);
    setCommitteeOutcome({ votes, decision, yesCount });
    setCommitteeStage("vote");
  };

  const PRESENTATION_SLIDES = [
    { title: "FlatWorld Psychology", subtitle: "Affordable. Accessible. Effective.", bullet: "Student price: $36.95–$41.95 (vs McGraw-Hill $185–$210)" },
    { title: "The Problem", bullet: "Students pay $185–$210. 35% skip buying. Learning outcomes suffer." },
    { title: "Advantage #1: Price", bullet: "80% cost savings. Adoption increases from 75% to 95%." },
    { title: "Advantage #2: Homework", bullet: "Built-in adaptive learning. Auto grading. Customizable. Mobile-first." },
    { title: "Advantage #3: Support", bullet: "Test bank, slides, customization. Implementation training included." },
    { title: "Timeline", bullet: "Spring: Exam copies by Jan, finalized by Feb, live for spring." },
    { title: "Next Steps", bullet: "Committee vote today. If approved, move to implementation." },
  ];

  const getFeedback = async () => {
    setFeedbackLoading(true);
    setView("feedback");
    const transcript = messages.map(m => `${m.role === "user" ? "REP" : "PROFESSOR"}: ${m.content}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, system: COACH_SYSTEM, messages: [{ role: "user", content: `Scenario: ${scenario.label}\n\nTranscript:\n${transcript}` }] }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setFeedback(parsed);
      const sess = { id: Date.now(), rep: repName, scenario: scenario.label, scenarioId: scenario.id, score: parsed.score, grade: parsed.grade, summary: parsed.summary, transcript, feedback: parsed, date: new Date().toISOString() };
      await saveSession(sess);
    } catch { setFeedback({ error: true }); }
    setFeedbackLoading(false);
  };

  const addAdmin = async () => {
    setAdminError("");
    if (!newAdminUsername.trim()) {
      setAdminError("Username required");
      return;
    }
    if (admins.includes(newAdminUsername.trim())) {
      setAdminError("Already an admin");
      return;
    }
    const accounts = (await store.get("fw-accounts")) || {};
    if (!accounts[newAdminUsername.trim()]) {
      setAdminError("Username not found");
      return;
    }
    const newAdmins = [...admins, newAdminUsername.trim()];
    setAdmins(newAdmins);
    await store.set("fw-admins", newAdmins);
    setNewAdminUsername("");
  };

  const removeAdmin = async (username) => {
    if (username === repName) {
      setAdminError("Can't remove yourself");
      return;
    }
    const newAdmins = admins.filter(a => a !== username);
    setAdmins(newAdmins);
    await store.set("fw-admins", newAdmins);
  };

  const scoreColor = s => s >= 8 ? C.green : s >= 6 ? "#84cc16" : s >= 4 ? C.amber : C.red;
  const gradeColor = { A: C.green, B: "#84cc16", C: C.amber, D: "#f97316", F: C.red };

  const Header = ({ title, back, backView = "home", right }) => (
    <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.bg, flexShrink: 0 }}>
      {back && <button onClick={() => { if (backView === "home") { setAdminViewMode(null); setSelectedRep(null); setSelectedSession(null); } setView(backView); }} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontSize: 20, padding: 0 }}>‹</button>}
      <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.text }}>{title}</div>
      {right}
    </div>
  );

  // ──LOGIN────────────────────────────────────────────────────────────────
  if (view === "login") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>FW</div>
          <div><div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>FlatWorld</div><div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Sales Trainer</div></div>
        </div>

        <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => { setLoginTab("signin"); setAuthError(""); }} style={{ flex: 1, padding: "12px", background: loginTab === "signin" ? C.accent : "none", color: loginTab === "signin" ? "#fff" : C.textMid, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", borderRadius: "8px 8px 0 0" }}>Sign In</button>
          <button onClick={() => { setLoginTab("signup"); setAuthError(""); }} style={{ flex: 1, padding: "12px", background: loginTab === "signup" ? C.accent : "none", color: loginTab === "signup" ? "#fff" : C.textMid, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", borderRadius: "8px 8px 0 0" }}>Create Account</button>
        </div>

        {authError && <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, borderRadius: 8, padding: 12, marginBottom: 16, color: C.red, fontSize: 13 }}>{authError}</div>}

        {loginTab === "signin" ? (
          <>
            <label style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "block", marginBottom: 8 }}>Username</label>
            <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="Enter username" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 16 }} />
            <label style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "block", marginBottom: 8 }}>Password</label>
            <input value={passwordInput} onChange={e => setPasswordInput(e.target.value)} type="password" placeholder="Enter password" onKeyDown={e => e.key === "Enter" && handleSignIn()} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} autoFocus />
            <button onClick={handleSignIn} style={{ marginTop: 20, width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Sign In →</button>
          </>
        ) : (
          <>
            <label style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "block", marginBottom: 8 }}>Username</label>
            <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="Choose username" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 16 }} />
            <label style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "block", marginBottom: 8 }}>Password</label>
            <input value={passwordInput} onChange={e => setPasswordInput(e.target.value)} type="password" placeholder="Create password" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 16 }} />
            <label style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "block", marginBottom: 8 }}>Confirm Password</label>
            <input value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} type="password" placeholder="Confirm password" onKeyDown={e => e.key === "Enter" && handleSignUp()} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <button onClick={handleSignUp} style={{ marginTop: 20, width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Create Account →</button>
          </>
        )}
      </div>
    </div>
  );

  // ──HOME (SCENARIOS + ADMIN TOGGLE)────────────────────────────────────────────
  if (view === "home") {
    const myScores = sessions.filter(s => s.rep === repName);
    const avg = myScores.length ? (myScores.reduce((a, b) => a + (b.score || 0), 0) / myScores.length).toFixed(1) : null;

    // ──ADMIN DASHBOARD (REPS LIST)────
    if (isAdmin && adminViewMode === "dashboard") {
      const allReps = [...new Set(sessions.map(s => s.rep))];
      const repStats = allReps.map(rep => {
        const repSessions = sessions.filter(s => s.rep === rep);
        const avgScore = repSessions.length ? (repSessions.reduce((a, b) => a + (b.score || 0), 0) / repSessions.length).toFixed(1) : 0;
        const lastSession = repSessions[0];
        return { rep, sessions: repSessions.length, avgScore, lastSession };
      });

      // ──ADMIN SESSION DETAIL VIEW────
      if (selectedSession) {
        return (
          <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Header title={`${selectedRep} — ${selectedSession.scenario}`} back={true} backView="home" right={<div style={{ display: "flex", gap: 10, fontSize: 12 }}><button onClick={() => setAdminViewMode("dashboard")} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 600 }}>Dashboard</button><button onClick={() => setAdminViewMode("settings")} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontWeight: 600 }}>Settings</button><button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer" }}>Sign out</button></div>} />
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 22px 60px" }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", border: `3px solid ${scoreColor(selectedSession.score)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor(selectedSession.score) }}>{selectedSession.score}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: gradeColor[selectedSession.grade], marginTop: 6 }}>{selectedSession.grade}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.textDim, marginBottom: 4, textTransform: "uppercase" }}>Summary</div>
                    <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6 }}>{selectedSession.summary}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textDim }}>Date: {new Date(selectedSession.date).toLocaleDateString()} at {new Date(selectedSession.date).toLocaleTimeString()}</div>
              </div>

              {selectedSession.feedback && selectedSession.feedback.missed_opportunity && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Key Gap</div>
                  <div style={{ fontSize: 13, color: C.textMid, fontStyle: "italic", marginBottom: 12 }}>{selectedSession.feedback.missed_opportunity}</div>
                  <div style={{ fontSize: 11, color: C.accentText, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Better Approach</div>
                  <div style={{ fontSize: 13, color: C.accentText }}>{selectedSession.feedback.better_response}</div>
                </div>
              )}

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Transcript</div>
                <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.8, maxHeight: 400, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>{selectedSession.transcript}</div>
              </div>

              <button onClick={() => setSelectedSession(null)} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Back to Sessions</button>
            </div>
          </div>
        );
      }

      // ──ADMIN REP DETAIL VIEW────
      if (selectedRep) {
        const repSessions = sessions.filter(s => s.rep === selectedRep);
        return (
          <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Header title={selectedRep} back={true} backView="home" right={<div style={{ display: "flex", gap: 10, fontSize: 12 }}><button onClick={() => setAdminViewMode("dashboard")} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 600 }}>Dashboard</button><button onClick={() => setAdminViewMode("settings")} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontWeight: 600 }}>Settings</button><button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer" }}>Sign out</button></div>} />
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 22px 60px" }}>
              <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>{repSessions.length} sessions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {repSessions.map((sess, idx) => (
                  <button key={idx} onClick={() => setSelectedSession(sess)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{sess.scenario}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{new Date(sess.date).toLocaleDateString()} at {new Date(sess.date).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(sess.score) }}>{sess.score}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: gradeColor[sess.grade] }}>{sess.grade}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setSelectedRep(null); }} style={{ width: "100%", marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Back to Reps</button>
            </div>
          </div>
        );
      }

      // ──ADMIN REPS LIST VIEW────
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
          <Header title="📊 Admin Dashboard" right={<div style={{ display: "flex", gap: 10, fontSize: 12 }}><button onClick={() => setAdminViewMode("dashboard")} style={{ background: C.accent, border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Dashboard</button><button onClick={() => setAdminViewMode("settings")} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontWeight: 600 }}>Settings</button><button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer" }}>Sign out</button></div>} />
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 22px 60px" }}>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 16 }}>{allReps.length} reps • {sessions.length} total sessions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {repStats.map((stat, idx) => (
                <button key={idx} onClick={() => setSelectedRep(stat.rep)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{stat.rep}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{stat.sessions} sessions • Avg: {stat.avgScore}/10</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: C.textMid }}>→</div>
                </button>
              ))}
            </div>
            <button onClick={() => setAdminViewMode(null)} style={{ width: "100%", marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Back to Scenarios</button>
          </div>
        </div>
      );
    }

    // ──ADMIN SETTINGS────
    if (isAdmin && adminViewMode === "settings") {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
          <Header title="⚙️ Admin Settings" right={<div style={{ display: "flex", gap: 10, fontSize: 12 }}><button onClick={() => setAdminViewMode("dashboard")} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontWeight: 600 }}>Dashboard</button><button onClick={() => setAdminViewMode("settings")} style={{ background: C.accent, border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Settings</button><button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer" }}>Sign out</button></div>} />
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 22px 60px" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 12 }}>Current Admins</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {admins.map((admin, idx) => (
                  <div key={idx} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{admin}</div>
                      {admin === repName && <div style={{ fontSize: 11, color: C.textDim }}>You</div>}
                    </div>
                    {admin !== repName && (
                      <button onClick={() => removeAdmin(admin)} style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.accentSoft + "33", border: `1px solid ${C.accentSoft}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: C.accentText, fontWeight: 600, marginBottom: 12 }}>Add Admin</div>
              {adminError && <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, borderRadius: 8, padding: 10, marginBottom: 12, color: C.red, fontSize: 12 }}>{adminError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newAdminUsername} onChange={e => setNewAdminUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && addAdmin()} placeholder="Username" style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                <button onClick={addAdmin} style={{ background: C.accentText, border: "none", borderRadius: 8, padding: "10px 16px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
              </div>
            </div>

            <button onClick={() => setAdminViewMode(null)} style={{ width: "100%", marginTop: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Back to Scenarios</button>
          </div>
        </div>
      );
    }

    // ──HOME SCENARIOS (REP VIEW + ADMIN WITH TOGGLES)────
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 22px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div><div style={{ fontSize: 16, fontWeight: 700 }}>Hey, {repName} 👋</div></div>
            <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
              {isAdmin && (
                <>
                  <button onClick={() => setAdminViewMode("dashboard")} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 600 }}>Admin Dashboard</button>
                  <button onClick={() => setAdminViewMode("settings")} style={{ background: "none", border: "none", color: C.textMid, cursor: "pointer", fontWeight: 600 }}>Settings</button>
                </>
              )}
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer" }}>Sign out</button>
            </div>
          </div>

          {myScores.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[{ label: "Sessions", value: myScores.length }, { label: "Avg Score", value: avg + " / 10" }, { label: "Last Grade", value: myScores[0]?.grade || "—" }].map((s, idx) => (
                <div key={idx} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: C.accent, fontWeight: 700, marginBottom: 12 }}>📧 Email Prospecting</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scenarios.filter(s => s.icon === "📧").map((s, idx) => {
                  const mySess = myScores.filter(x => x.scenarioId === s.id);
                  const best = mySess.length ? Math.max(...mySess.map(x => x.score)) : null;
                  return (
                    <button key={idx} onClick={() => startScenario(s)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "15px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, color: "inherit" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <span style={{ fontSize: 24 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: C.textDim }}>{s.briefing.professorName || s.briefing.institution}</div>
                      </div>
                      {best !== null && <div><div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(best) }}>{best}</div></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: C.accent, fontWeight: 700, marginBottom: 12 }}>🎓 In-Person Prospecting</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scenarios.filter(s => (s.icon === "🎓" || s.icon === "💼") && s.category === "Prospecting").map((s, idx) => {
                  const mySess = myScores.filter(x => x.scenarioId === s.id);
                  const best = mySess.length ? Math.max(...mySess.map(x => x.score)) : null;
                  return (
                    <button key={idx} onClick={() => startScenario(s)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "15px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, color: "inherit" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <span style={{ fontSize: 24 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: C.textDim }}>{s.briefing.professorName || s.briefing.institution}</div>
                      </div>
                      {best !== null && <div><div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(best) }}>{best}</div></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: C.red, fontWeight: 700, marginBottom: 12 }}>🏛️ Advanced Scenario</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scenarios.filter(s => s.icon === "🏛️").map((s, idx) => {
                  const mySess = myScores.filter(x => x.scenarioId === s.id);
                  const best = mySess.length ? Math.max(...mySess.map(x => x.score)) : null;
                  return (
                    <button key={idx} onClick={() => startScenario(s)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "15px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, color: "inherit" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <span style={{ fontSize: 24 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: C.textDim }}>{s.briefing.professorName || s.briefing.institution}</div>
                      </div>
                      {best !== null && <div><div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(best) }}>{best}</div></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "roleplay") return (
    <div style={{ height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <Header title={`${scenario.icon} ${scenario.label}`} back backView="home" right={<button onClick={getFeedback} disabled={messages.length < 4} style={{ background: messages.length >= 4 ? C.accent : C.surface, color: messages.length >= 4 ? "#fff" : C.textDim, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Get Coaching</button>} />
      <div style={{ background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, padding: "10px 18px", fontSize: 12 }}>
        <strong>{scenario.briefing.professorName}</strong> • {scenario.briefing.department}<br/>
        <span style={{ color: C.amber }}>{scenario.briefing.courses?.[0]} • {scenario.briefing.currentBook}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "3px 14px 14px 14px", background: m.role === "user" ? C.accent : C.surface, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.textMid }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 13, color: C.textDim }}>...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, display: "flex", gap: 10 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Your response..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
        <button onClick={sendMessage} disabled={loading} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Send</button>
      </div>
    </div>
  );

  if (view === "feedback") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title="Coaching Report" back backView="roleplay" />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
        {feedbackLoading && <div style={{ textAlign: "center", padding: "72px 0" }}>Analyzing...</div>}
        {feedback?.error && <div style={{ background: C.surface, border: `1px solid ${C.red}44`, borderRadius: 10, padding: 20, color: C.red }}>Error generating feedback.</div>}
        {feedback && !feedbackLoading && !feedback.error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(feedback.score), marginBottom: 10 }}>{feedback.score} / 10 — {feedback.grade}</div>
              <div style={{ fontSize: 14, color: C.textMid }}>{feedback.summary}</div>
            </div>
            {feedback.missed_opportunity && <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}><div style={{ fontSize: 11, color: C.red, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Biggest Miss</div><div style={{ fontSize: 13, color: C.textMid, fontStyle: "italic", marginBottom: 12 }}>"{feedback.missed_opportunity}"</div><div style={{ fontSize: 13, color: C.accentText }}>{feedback.better_response}</div></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => startScenario(scenario)} style={{ background: C.accent, border: "none", borderRadius: 10, padding: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Try Again</button>
              <button onClick={() => setView("home")} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "initial") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title="🏛️ Committee Decision" back backView="home" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 22px 60px" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 28 }}>
          <strong>Westfield State University</strong> • Psychology<br/>
          <strong>Courses:</strong> PSY 101 (300), PSY 220, PSY 310<br/>
          <strong>Current:</strong> McGraw-Hill Connect ($185–$220)<br/>
          <strong>Pressure:</strong> {committeePressureFactors.join(", ")}
        </div>
        <div style={{ background: C.accentSoft + "33", border: `1px solid ${C.accentSoft}`, borderRadius: 12, padding: 18, marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: C.accentText, lineHeight: 1.6 }}><strong>Goal:</strong> Navigate a 4-person committee. Meet each person 1-on-1, ask discovery questions to learn their concerns. Get agreement from all 4 to reach the presentation stage. Then present and vote.</div>
        </div>
        <button onClick={startFirstMeeting} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>Start Meeting →</button>
        <button onClick={() => setView("home")} style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px", color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Back</button>
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "meeting") return (
    <div style={{ height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <Header title={currentCommitteePerson} back backView="home" right={<div style={{ fontSize: 12, color: C.textDim }}>Contacted: {Object.keys(committeePeople).length}/4</div>} />
      <div style={{ background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, padding: "10px 18px", fontSize: 12 }}>
        <strong>{COMMITTEE_MEMBERS[currentCommitteePerson].title}</strong> • {COMMITTEE_MEMBERS[currentCommitteePerson].course}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {committeeMessagesLog.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "3px 14px 14px 14px", background: m.role === "user" ? C.accent : C.surface, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.textMid }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 13, color: C.textDim }}>...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, display: "flex", gap: 10 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCommitteeMessage()} placeholder="Your response..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
        <button onClick={sendCommitteeMessage} disabled={loading} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Send</button>
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "meetingend") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title={currentCommitteePerson} back backView="home" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 22px 60px" }}>
        <div style={{ fontSize: 14, color: C.textMid, marginBottom: 20 }}>How did that go?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => endMeeting(true)} style={{ background: C.green, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>✓ They agreed to review exam copy</button>
          <button onClick={() => endMeeting(false)} style={{ background: C.amber, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>△ They didn't commit</button>
        </div>
        <button onClick={nextPerson} style={{ width: "100%", marginTop: 20, background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Next Person →</button>
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "presentation") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title="Presentation" back backView="home" right={<div style={{ fontSize: 12, color: C.textDim }}>{presentationSlide + 1}/{PRESENTATION_SLIDES.length}</div>} />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 30px 100px", textAlign: "center" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 60, marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.accent, marginBottom: 10 }}>{PRESENTATION_SLIDES[presentationSlide].title}</div>
          {PRESENTATION_SLIDES[presentationSlide].subtitle && <div style={{ fontSize: 16, color: C.textMid, marginBottom: 20 }}>{PRESENTATION_SLIDES[presentationSlide].subtitle}</div>}
          <div style={{ fontSize: 18, color: C.textMid, lineHeight: 1.8 }}>{PRESENTATION_SLIDES[presentationSlide].bullet}</div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => setPresentationSlide(Math.max(0, presentationSlide - 1))} disabled={presentationSlide === 0} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 18px", opacity: presentationSlide === 0 ? 0.3 : 1 }}>← Back</button>
          {presentationSlide === PRESENTATION_SLIDES.length - 1 ? (
            <button onClick={() => { simulateVote(); }} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Vote Now →</button>
          ) : (
            <button onClick={() => setPresentationSlide(presentationSlide + 1)} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "vote" && committeeOutcome) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title="Vote Results" back backView="home" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 22px 60px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {Object.entries(committeeVotes).map(([name, vote]) => (
            <div key={name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div><strong>{name}</strong><br/><span style={{ fontSize: 11, color: C.textDim }}>{COMMITTEE_MEMBERS[name].title}</span></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: vote === "Yes" ? C.green : C.red }}>{vote}</div>
            </div>
          ))}
        </div>
        <div style={{ background: committeeOutcome.decision.includes("Adopt") ? C.green + "22" : C.amber + "22", border: `1px solid ${committeeOutcome.decision.includes("Adopt") ? C.green : C.amber}`, borderRadius: 12, padding: 22, textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: committeeOutcome.decision.includes("Adopt") ? C.green : C.amber, marginBottom: 8 }}>{committeeOutcome.decision}</div>
          <div style={{ fontSize: 13, color: C.textMid }}>Vote: {committeeOutcome.yesCount} Yes, {4 - committeeOutcome.yesCount} No</div>
        </div>
        <button onClick={() => setCommitteeStage("outcome")} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>Email from Sandra Hill →</button>
        <button onClick={() => setView("home")} style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px", color: C.textMid, cursor: "pointer" }}>Home</button>
      </div>
    </div>
  );

  if (view === "committee" && committeeStage === "outcome") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header title="Email from Sandra Hill" back backView="home" />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 22px 60px" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, marginBottom: 28, lineHeight: 1.8, fontSize: 14, color: C.textMid }}>
          <strong style={{ display: "block", marginBottom: 16, fontSize: 15, color: C.text }}>Hi there,</strong>
          {committeeOutcome.decision.includes("Adopt") && (
            <>
              <div style={{ marginBottom: 12 }}>Great news! The committee voted to adopt FlatWorld textbooks for our Psychology department. The presentation resonated well, and the team appreciated the affordability, homework system, and support.</div>
              <div>Next steps: We'll finalize exam copies for all three courses and plan spring implementation. Let's schedule a call next week to discuss customization and training.</div>
            </>
          )}
          {committeeOutcome.decision.includes("Pilot") && (
            <>
              <div style={{ marginBottom: 12 }}>The committee had productive discussion. While interested, they want to pilot in one course first before full adoption. We'll start with PSY 101 in spring and evaluate results for June discussion.</div>
              <div>This is actually smart—it's a low-risk way to test the platform. Let's plan implementation for January so we have spring data.</div>
            </>
          )}
          {!committeeOutcome.decision.includes("Adopt") && !committeeOutcome.decision.includes("Pilot") && (
            <>
              <div style={{ marginBottom: 12 }}>The committee decided to stay with McGraw-Hill for now. While they appreciated your presentation, some members had concerns about switching mid-year.</div>
              <div>This isn't a final no—it's a "not yet." Reach out again next fall when we evaluate for the following year.</div>
            </>
          )}
          <strong style={{ display: "block", marginTop: 20, marginBottom: 4 }}>Best, Sandra Hill</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => startScenario(scenario)} style={{ background: C.accent, border: "none", borderRadius: 10, padding: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Try Again</button>
          <button onClick={() => setView("home")} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.textMid, fontWeight: 600, cursor: "pointer" }}>Home</button>
        </div>
      </div>
    </div>
  );

  return null;
}
