import { useState, useEffect, useRef } from "react";

const WORK_OPTIONS = [5, 10, 15, 25, 45, 60];
const BREAK_OPTIONS = [5, 10, 15, 20, 30, 60];

const pad = (n) => String(n).padStart(2, "0");

export default function Pomodoro() {
  const [screen, setScreen] = useState("setup");
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState("work");
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const intervalRef = useRef(null);
  const phaseRef = useRef("work");
  const roundRef = useRef(1);
  const workMinRef = useRef(25);
  const breakMinRef = useRef(5);
  const phaseEndTimeRef = useRef(null); // timestamp ที่รอบนี้จะสิ้นสุด

  const isWork = phase === "work";

  const colors = {
    bg: "#18181C",
    surface: "#202026",
    surfaceAlt: "#28282F",
    border: "#30303A",
    muted: "#62627A",
    text: "#DDDDF0",
    textDim: "#88889A",
    work: "#C8906A",
    workSoft: "#2A1F18",
    workDim: "#7A4A28",
    break: "#6A9EB0",
    breakSoft: "#182028",
    breakDim: "#325E70",
  };

  const accent = isWork ? colors.work : colors.break;
  const accentSoft = isWork ? colors.workSoft : colors.breakSoft;
  const accentDim = isWork ? colors.workDim : colors.breakDim;

  const totalSeconds = (isWork ? workMin : breakMin) * 60;
  const progress = secondsLeft / totalSeconds;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const R = 108;
  const circ = 2 * Math.PI * R;
  const dash = circ * progress;

  // ฟังก์ชัน advance phase — คำนวณว่าเวลาที่ผ่านไปข้ามกี่รอบ แล้ว sync state
  function syncFromNow() {
    if (!phaseEndTimeRef.current) return;

    let remaining = Math.round((phaseEndTimeRef.current - Date.now()) / 1000);

    // ถ้าเวลายังเหลือ — update secondsLeft ตรงๆ
    if (remaining > 0) {
      setSecondsLeft(remaining);
      return;
    }

    // เวลาหมดไปแล้ว — คำนวณข้ามรอบ
    let elapsed = -remaining; // วินาทีที่เลยมาแล้ว
    let curPhase = phaseRef.current;
    let curRound = roundRef.current;

    while (elapsed >= 0) {
      const phaseDuration =
        curPhase === "work"
          ? workMinRef.current * 60
          : breakMinRef.current * 60;

      if (elapsed < phaseDuration) {
        // อยู่ในรอบนี้
        remaining = phaseDuration - elapsed;
        break;
      }

      // ข้ามรอบนี้ไป
      elapsed -= phaseDuration;
      const nextPhase = curPhase === "work" ? "break" : "work";
      if (nextPhase === "work") curRound += 1;
      curPhase = nextPhase;
    }

    // อัปเดต refs และ state
    phaseRef.current = curPhase;
    roundRef.current = curRound;
    setPhase(curPhase);
    setRound(curRound);
    setSecondsLeft(remaining);

    // ตั้ง phaseEndTime ใหม่
    phaseEndTimeRef.current = Date.now() + remaining * 1000;
  }

  function start() {
    workMinRef.current = workMin;
    breakMinRef.current = breakMin;
    phaseRef.current = "work";
    roundRef.current = 1;
    const duration = workMin * 60;
    phaseEndTimeRef.current = Date.now() + duration * 1000;
    setPhase("work");
    setRound(1);
    setSecondsLeft(duration);
    setScreen("running");
  }

  function stop() {
    clearInterval(intervalRef.current);
    phaseEndTimeRef.current = null;
    setScreen("setup");
  }

  // Tick ทุก 500ms — ใช้ Date.now() คำนวณแทนนับ -1
  useEffect(() => {
    if (screen !== "running") return;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      syncFromNow();
    }, 500);
    return () => clearInterval(intervalRef.current);
  }, [screen]);

  // visibilitychange — sync ทันทีเมื่อกลับมาเปิดหน้าจอ
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && screen === "running") {
        syncFromNow();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [screen]);

  if (screen === "setup") {
    return (
      <div style={{ ...s.page, background: colors.bg }}>
        <div style={{ ...s.card, background: colors.surface, border: `1px solid ${colors.border}` }}>

          <div style={s.header}>
            <span style={s.emoji}>🍅</span>
            <div>
              <div style={{ ...s.title, color: colors.text }}>โปโมโดโร</div>
              <div style={{ ...s.subtitle, color: colors.muted }}>ตั้งค่าแล้วปล่อยให้มันทำงาน</div>
            </div>
          </div>

          <div style={{ height: 1, background: colors.border }} />

          <div style={s.section}>
            <div style={{ ...s.label, color: colors.muted }}>🧠 ช่วงทำงาน</div>
            <div style={s.grid}>
              {WORK_OPTIONS.map((m) => {
                const active = workMin === m;
                return (
                  <button key={m} onClick={() => setWorkMin(m)} style={{
                    ...s.chip,
                    background: active ? colors.work : colors.surfaceAlt,
                    color: active ? "#FFF4EE" : colors.textDim,
                    border: `1px solid ${active ? colors.work : colors.border}`,
                    fontFamily: "inherit",
                  }}>
                    {m}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.65 }}>นาที</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={s.section}>
            <div style={{ ...s.label, color: colors.muted }}>☕ ช่วงพัก</div>
            <div style={s.grid}>
              {BREAK_OPTIONS.map((m) => {
                const active = breakMin === m;
                return (
                  <button key={m} onClick={() => setBreakMin(m)} style={{
                    ...s.chip,
                    background: active ? colors.break : colors.surfaceAlt,
                    color: active ? "#EEF6FF" : colors.textDim,
                    border: `1px solid ${active ? colors.break : colors.border}`,
                    fontFamily: "inherit",
                  }}>
                    {m}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.65 }}>นาที</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: colors.border }} />

          <div style={{ ...s.summary, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
            <span style={{ color: colors.work, fontWeight: 600 }}>🧠 {workMin} นาที</span>
            <span style={{ color: colors.muted, fontSize: 12 }}>→</span>
            <span style={{ color: colors.break, fontWeight: 600 }}>☕ {breakMin} นาที</span>
            <span style={{ color: colors.muted, fontSize: 12 }}>→ วนซ้ำ</span>
          </div>

          <button onClick={start} style={{ ...s.startBtn, background: colors.work, fontFamily: "inherit" }}>
            เริ่มเลย →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...s.page,
      background: isWork
        ? "linear-gradient(160deg, #1E1610 0%, #18181C 65%)"
        : "linear-gradient(160deg, #101820 0%, #18181C 65%)",
      transition: "background 1.2s ease",
    }}>
      <div style={s.runWrap}>

        <div style={{
          ...s.phaseBadge,
          background: accentSoft,
          color: accent,
          border: `1px solid ${accentDim}`,
        }}>
          {isWork ? "🧠 กำลังทำงาน" : "☕ พักผ่อน"}
        </div>

        <div style={{ fontSize: 13, color: colors.muted, fontWeight: 500, letterSpacing: "0.2px" }}>
          รอบที่ {round}
        </div>

        <div style={{ position: "relative", width: 256, height: 256 }}>
          <svg width={256} height={256} viewBox="0 0 256 256">
            <circle cx={128} cy={128} r={120} fill="none"
              stroke={accentSoft} strokeWidth={1} />
            <circle cx={128} cy={128} r={R} fill="none"
              stroke={accentSoft} strokeWidth={7} />
            <circle
              cx={128} cy={128} r={R} fill="none"
              stroke={accent}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={0}
              transform="rotate(-90 128 128)"
              style={{ transition: "stroke-dasharray 0.6s linear, stroke 1.2s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              fontSize: 60, fontWeight: 800,
              letterSpacing: "-3px", lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: accent,
              transition: "color 1.2s ease",
            }}>
              {pad(minutes)}:{pad(seconds)}
            </div>
            {!isWork && (
              <div style={{ fontSize: 13, color: accentDim, marginTop: 6 }}>
                😌 พักผ่อนสักครู่
              </div>
            )}
          </div>
        </div>

        <div style={{ ...s.infoRow, background: colors.surface, border: `1px solid ${colors.border}` }}>
          <div style={s.infoItem}>
            <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>ทำงาน</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.work }}>{workMin} นาที</span>
          </div>
          <div style={{ width: 1, height: 24, background: colors.border }} />
          <div style={s.infoItem}>
            <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>พัก</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.break }}>{breakMin} นาที</span>
          </div>
        </div>

        <button onClick={stop} style={{
          ...s.stopBtn,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
          fontFamily: "inherit",
        }}>
          ⏹ หยุด
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
    padding: 20,
  },
  card: {
    borderRadius: 22,
    padding: "30px 26px 34px",
    width: "100%",
    maxWidth: 370,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: { display: "flex", alignItems: "center", gap: 14 },
  emoji: { fontSize: 38, lineHeight: 1 },
  title: { fontSize: 21, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 },
  subtitle: { fontSize: 13, marginTop: 3 },
  section: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 },
  chip: {
    padding: "9px 4px",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  summary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "11px 16px",
    borderRadius: 12,
    fontSize: 14,
  },
  startBtn: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: 13,
    fontSize: 16,
    fontWeight: 700,
    color: "#160E08",
    cursor: "pointer",
    letterSpacing: "0.3px",
  },
  runWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  },
  phaseBadge: {
    padding: "8px 22px",
    borderRadius: 24,
    fontSize: 15,
    fontWeight: 700,
  },
  infoRow: {
    display: "flex",
    gap: 24,
    alignItems: "center",
    padding: "12px 28px",
    borderRadius: 14,
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },
  stopBtn: {
    padding: "11px 36px",
    background: "transparent",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
