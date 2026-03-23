import { useState, useEffect } from "react";
import axios from "axios";
import supabase from "../supabase";

const API = "http://localhost:5000/api";

const TABS = ["Subjects", "Attendance", "Marks"];

function StatCard({ label, value, color }) {
    return (
        <div className={`stat-card ${color}`}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

export default function Dashboard({ user }) {
    const USER_ID = user?.id;
    const [tab, setTab] = useState("Subjects");
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Attendance
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [attendanceSummary, setAttendanceSummary] = useState({});
    const [markingAtt, setMarkingAtt] = useState(false);

    // Marks
    const [marksData, setMarksData] = useState({});
    const [marksForm, setMarksForm] = useState({ test1: "", test2: "", final: "" });
    const [selectedMarksSubject, setSelectedMarksSubject] = useState(null);
    const [savingMarks, setSavingMarks] = useState(false);

    // ─── Fetch subjects ─────────────────────────────────────────────
    const fetchSubjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API}/subjects/${USER_ID}`);
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setError("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const addSubject = async () => {
        if (!newSubject.trim()) return;
        try {
            await axios.post(`${API}/subjects/add`, { subject_name: newSubject.trim(), user_id: USER_ID });
            setNewSubject("");
            await fetchSubjects();
        } catch (e) {
            setError("Failed to add subject");
        }
    };

    const deleteSubject = async (id) => {
        try {
            await axios.delete(`${API}/subjects/${id}`);
            await fetchSubjects();
        } catch (e) {
            setError("Failed to delete subject");
        }
    };

    // ─── Fetch attendance summary ────────────────────────────────────
    const fetchAttendanceSummary = async () => {
        try {
            const res = await axios.get(`${API}/attendance/summary/${USER_ID}`);
            const map = {};
            res.data.forEach((s) => { map[s.subject_id] = s; });
            setAttendanceSummary(map);
        } catch (e) { /* ignore */ }
    };

    const markAttendance = async (subject_id, status) => {
        setMarkingAtt(true);
        try {
            await axios.post(`${API}/attendance/mark`, { subject_id, user_id: USER_ID, status });
            await fetchAttendanceSummary();
        } catch (e) {
            setError("Failed to mark attendance");
        } finally {
            setMarkingAtt(false);
        }
    };

    // ─── Fetch marks ─────────────────────────────────────────────────
    const fetchAllMarks = async () => {
        const map = {};
        await Promise.all(
            subjects.map(async (s) => {
                try {
                    const res = await axios.get(`${API}/marks/${s.id}`);
                    if (res.data) map[s.id] = res.data;
                } catch (e) { /* ignore */ }
            })
        );
        setMarksData(map);
    };

    const saveMarks = async () => {
        if (!selectedMarksSubject) return;
        setSavingMarks(true);
        try {
            await axios.post(`${API}/marks/add`, {
                subject_id: selectedMarksSubject,
                user_id: USER_ID,
                test1: Number(marksForm.test1) || null,
                test2: Number(marksForm.test2) || null,
                final: Number(marksForm.final) || null,
            });
            await fetchAllMarks();
        } catch (e) {
            setError("Failed to save marks");
        } finally {
            setSavingMarks(false);
        }
    };

    const openMarksForm = (subject) => {
        setSelectedMarksSubject(subject.id);
        const existing = marksData[subject.id];
        setMarksForm({
            test1: existing?.test1 ?? "",
            test2: existing?.test2 ?? "",
            final: existing?.final ?? "",
        });
    };

    // ─── Effects ─────────────────────────────────────────────────────
    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (subjects.length > 0) {
            fetchAttendanceSummary();
            fetchAllMarks();
        }
    }, [subjects]);

    // ─── Derived stats ───────────────────────────────────────────────
    const totalPresent = Object.values(attendanceSummary).reduce((a, b) => a + b.present, 0);
    const totalClasses = Object.values(attendanceSummary).reduce((a, b) => a + b.total, 0);
    const overallAttPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

    const allMarks = Object.values(marksData);
    const avgFinal = allMarks.length > 0
        ? Math.round(allMarks.reduce((a, m) => a + (m.final || 0), 0) / allMarks.length)
        : "—";

    const getGrade = (marks) => {
        if (!marks) return "—";
        const avg = ((marks.test1 || 0) + (marks.test2 || 0) + (marks.final || 0)) / 3;
        if (avg >= 90) return "A+";
        if (avg >= 80) return "A";
        if (avg >= 70) return "B";
        if (avg >= 60) return "C";
        if (avg >= 50) return "D";
        return "F";
    };

    const getAttColor = (pct) => {
        if (pct >= 75) return "att-good";
        if (pct >= 50) return "att-warn";
        return "att-danger";
    };

    return (
        <div className="app-bg">
            {/* Header */}
            <header className="header">
                <div className="header-inner">
                    <div className="logo">
                        <span className="logo-icon">🎓</span>
                        <span className="logo-text">Student Tracker</span>
                    </div>
                    <nav className="tab-nav">
                        {TABS.map((t) => (
                            <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? "tab-active" : ""}`}>
                                {t}
                            </button>
                        ))}
                    </nav>
                    <div className="header-right">
                        <span className="user-email">{user?.email}</span>
                        <button
                            className="btn-logout"
                            onClick={() => supabase.auth.signOut()}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                {error && (
                    <div className="error-banner">
                        ⚠️ {error}
                        <button onClick={() => setError(null)} className="error-close">✕</button>
                    </div>
                )}

                {/* Stat Cards */}
                <div className="stat-row">
                    <StatCard label="Total Subjects" value={subjects.length} color="card-blue" />
                    <StatCard label="Overall Attendance" value={`${overallAttPct}%`} color={overallAttPct >= 75 ? "card-green" : overallAttPct >= 50 ? "card-yellow" : "card-red"} />
                    <StatCard label="Total Classes" value={totalClasses} color="card-purple" />
                    <StatCard label="Avg Final Marks" value={avgFinal} color="card-orange" />
                </div>

                {/* ── SUBJECTS TAB ── */}
                {tab === "Subjects" && (
                    <section className="panel">
                        <h2 className="panel-title">📚 Subjects</h2>
                        <div className="add-row">
                            <input
                                className="input"
                                placeholder="Enter subject name..."
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                            />
                            <button className="btn-primary" onClick={addSubject} disabled={loading}>
                                + Add Subject
                            </button>
                        </div>
                        {loading && <p className="muted">Loading subjects…</p>}
                        <div className="subject-grid">
                            {subjects.map((s) => {
                                const att = attendanceSummary[s.id];
                                const pct = att ? att.percentage : null;
                                return (
                                    <div key={s.id} className="subject-card">
                                        <div className="subject-name">{s.subject_name}</div>
                                        {att && (
                                            <div className={`subject-att ${getAttColor(pct)}`}>
                                                {pct}% attendance ({att.present}/{att.total})
                                            </div>
                                        )}
                                        {!att && <div className="subject-att muted">No attendance yet</div>}
                                        <button className="btn-danger-sm" onClick={() => deleteSubject(s.id)}>Delete</button>
                                    </div>
                                );
                            })}
                            {subjects.length === 0 && !loading && (
                                <p className="muted">No subjects yet. Add one above!</p>
                            )}
                        </div>
                    </section>
                )}

                {/* ── ATTENDANCE TAB ── */}
                {tab === "Attendance" && (
                    <section className="panel">
                        <h2 className="panel-title">✅ Attendance</h2>
                        <p className="muted mb-4">Select a subject and mark today's attendance.</p>
                        <div className="subject-list">
                            {subjects.map((s) => {
                                const att = attendanceSummary[s.id];
                                const pct = att ? att.percentage : 0;
                                const isSelected = selectedSubject === s.id;
                                return (
                                    <div key={s.id} className={`att-row ${isSelected ? "att-row-selected" : ""}`} onClick={() => setSelectedSubject(isSelected ? null : s.id)}>
                                        <div className="att-info">
                                            <span className="subject-name">{s.subject_name}</span>
                                            {att ? (
                                                <span className={`att-badge ${getAttColor(pct)}`}>
                                                    {pct}% · {att.present}P / {att.absent}A
                                                </span>
                                            ) : (
                                                <span className="att-badge muted">No records</span>
                                            )}
                                        </div>
                                        {att && (
                                            <div className="progress-bar-wrap">
                                                <div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 75 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444" }} />
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="att-actions" onClick={(e) => e.stopPropagation()}>
                                                <button className="btn-present" onClick={() => markAttendance(s.id, "present")} disabled={markingAtt}>
                                                    ✓ Present
                                                </button>
                                                <button className="btn-absent" onClick={() => markAttendance(s.id, "absent")} disabled={markingAtt}>
                                                    ✗ Absent
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {subjects.length === 0 && <p className="muted">Add subjects first from the Subjects tab.</p>}
                        </div>
                    </section>
                )}

                {/* ── MARKS TAB ── */}
                {tab === "Marks" && (
                    <section className="panel">
                        <h2 className="panel-title">📝 Marks</h2>
                        <p className="muted mb-4">Click a subject to enter or update marks.</p>
                        <div className="marks-grid">
                            {subjects.map((s) => {
                                const m = marksData[s.id];
                                const isSelected = selectedMarksSubject === s.id;
                                const grade = getGrade(m);
                                return (
                                    <div key={s.id} className={`marks-card ${isSelected ? "marks-card-selected" : ""}`}>
                                        <div className="marks-card-header" onClick={() => isSelected ? setSelectedMarksSubject(null) : openMarksForm(s)}>
                                            <span className="subject-name">{s.subject_name}</span>
                                            <span className={`grade-badge grade-${grade.replace("+", "plus")}`}>{grade}</span>
                                        </div>
                                        {m && (
                                            <div className="marks-row">
                                                <span>Test 1: <b>{m.test1 ?? "—"}</b></span>
                                                <span>Test 2: <b>{m.test2 ?? "—"}</b></span>
                                                <span>Final: <b>{m.final ?? "—"}</b></span>
                                            </div>
                                        )}
                                        {!m && <p className="muted small">No marks entered</p>}
                                        {isSelected && (
                                            <div className="marks-form" onClick={(e) => e.stopPropagation()}>
                                                <div className="marks-inputs">
                                                    {["test1", "test2", "final"].map((field) => (
                                                        <div key={field} className="mark-input-group">
                                                            <label className="mark-label">{field === "final" ? "Final" : field === "test1" ? "Test 1" : "Test 2"}</label>
                                                            <input
                                                                className="input small-input"
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                placeholder="0–100"
                                                                value={marksForm[field]}
                                                                onChange={(e) => setMarksForm({ ...marksForm, [field]: e.target.value })}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button className="btn-primary mt-2" onClick={saveMarks} disabled={savingMarks}>
                                                    {savingMarks ? "Saving…" : "💾 Save Marks"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {subjects.length === 0 && <p className="muted">Add subjects first from the Subjects tab.</p>}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
