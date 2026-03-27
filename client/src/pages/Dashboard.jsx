import { useState, useEffect } from "react";
import axios from "axios";
import supabase from "../supabase";

const API = "https://marks-attendance-tracker1.onrender.com/api";

const TABS = ["Subjects", "Attendance", "Marks", "Todo"];

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
    const [attendanceHistory, setAttendanceHistory] = useState({});
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Marks
    const [marksData, setMarksData] = useState({});
    const [marksForm, setMarksForm] = useState({ test1: "", test2: "", final: "" });
    const [selectedMarksSubject, setSelectedMarksSubject] = useState(null);
    const [savingMarks, setSavingMarks] = useState(false);

    // Todo
    const TODO_KEY = `todos_${USER_ID}`;
    const [todos, setTodos] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`todos_${USER_ID}`) || "[]");
        } catch { return []; }
    });
    const [newTodo, setNewTodo] = useState("");

    // Persist todos to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    }, [todos, TODO_KEY]);

    const addTodo = () => {
        if (!newTodo.trim()) return;
        const item = { id: Date.now(), text: newTodo.trim(), done: false };
        setTodos((prev) => [item, ...prev]);
        setNewTodo("");
    };

    const toggleTodo = (id) => {
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    };

    const deleteTodo = (id) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
    };

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
            // refresh history for this subject too
            await fetchAttendanceHistory(subject_id);
        } catch (e) {
            setError("Failed to mark attendance");
        } finally {
            setMarkingAtt(false);
        }
    };

    // ─── Fetch date-wise history for a subject ───────────────────────
    const fetchAttendanceHistory = async (subject_id) => {
        if (attendanceHistory[subject_id]) return; // already loaded
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/attendance/${subject_id}`);
            setAttendanceHistory((prev) => ({ ...prev, [subject_id]: res.data }));
        } catch (e) { /* ignore */ } finally {
            setLoadingHistory(false);
        }
    };

    const handleSelectSubject = (subject_id) => {
        const nowSelected = selectedSubject === subject_id ? null : subject_id;
        setSelectedSubject(nowSelected);
        if (nowSelected) fetchAttendanceHistory(nowSelected);
    };

    // ─── Force-refresh history after marking ────────────────────────
    const refreshHistory = async (subject_id) => {
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/attendance/${subject_id}`);
            setAttendanceHistory((prev) => ({ ...prev, [subject_id]: res.data }));
        } catch (e) { /* ignore */ } finally {
            setLoadingHistory(false);
        }
    };

    const markAttendanceFull = async (subject_id, status) => {
        setMarkingAtt(true);
        try {
            await axios.post(`${API}/attendance/mark`, { subject_id, user_id: USER_ID, status });
            await fetchAttendanceSummary();
            await refreshHistory(subject_id);
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
    const calcTotal = (m) => (((m.test1 || 0) + (m.test2 || 0)) / 2) + (m.final || 0);
    const avgFinal = allMarks.length > 0
        ? Math.round(allMarks.reduce((a, m) => a + calcTotal(m), 0) / allMarks.length)
        : "—";

    const getGrade = (marks) => {
        if (!marks) return "—";
        const total = calcTotal(marks);
        if (total >= 90) return "A+";
        if (total >= 80) return "A";
        if (total >= 70) return "B";
        if (total >= 60) return "C";
        if (total >= 50) return "D";
        return "F";
    };

    const getAttColor = (pct) => {
        if (pct >= 75) return "att-good";
        if (pct >= 50) return "att-warn";
        return "att-danger";
    };

    const todoDone = todos.filter((t) => t.done).length;

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
                                {t === "Todo" ? `✅ Todo${todos.length > 0 ? ` (${todoDone}/${todos.length})` : ""}` : t}
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
                        <p className="muted mb-4">Select a subject to mark attendance and view history.</p>
                        <div className="subject-list">
                            {subjects.map((s) => {
                                const att = attendanceSummary[s.id];
                                const pct = att ? att.percentage : 0;
                                const isSelected = selectedSubject === s.id;
                                const history = attendanceHistory[s.id] || [];
                                return (
                                    <div key={s.id} className={`att-row ${isSelected ? "att-row-selected" : ""}`} onClick={() => handleSelectSubject(s.id)}>
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
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <div className="att-actions">
                                                    <button className="btn-present" onClick={() => markAttendanceFull(s.id, "present")} disabled={markingAtt}>
                                                        ✓ Present
                                                    </button>
                                                    <button className="btn-absent" onClick={() => markAttendanceFull(s.id, "absent")} disabled={markingAtt}>
                                                        ✗ Absent
                                                    </button>
                                                </div>

                                                {/* ── Attendance Date History ── */}
                                                <div className="att-history-wrap">
                                                    <div className="att-history-title">📅 Attendance History</div>
                                                    {loadingHistory && <p className="muted small">Loading history…</p>}
                                                    {!loadingHistory && history.length === 0 && (
                                                        <p className="muted small">No records yet for this subject.</p>
                                                    )}
                                                    {!loadingHistory && history.length > 0 && (
                                                        <div className="att-history-list">
                                                            {history.map((record) => (
                                                                <div key={record.id} className={`att-history-item ${record.status}`}>
                                                                    <span className="att-history-status">
                                                                        {record.status === "present" ? "✓" : "✗"}
                                                                    </span>
                                                                    <span className="att-history-date">{record.date}</span>
                                                                    <span className={`att-history-label ${record.status === "present" ? "att-good" : "att-danger"}`}>
                                                                        {record.status === "present" ? "Present" : "Absent"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
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
                                                <span>Test 1: <b>{m.test1 ?? "—"}</b>/30</span>
                                                <span>Test 2: <b>{m.test2 ?? "—"}</b>/30</span>
                                                <span>Final: <b>{m.final ?? "—"}</b>/70</span>
                                                <span>Total: <b>{m.test1 != null && m.test2 != null && m.final != null ? Math.round(calcTotal(m)) : "—"}</b>/100</span>
                                            </div>
                                        )}
                                        {!m && <p className="muted small">No marks entered</p>}
                                        {isSelected && (
                                            <div className="marks-form" onClick={(e) => e.stopPropagation()}>
                                                <div className="marks-inputs">
                                                    {["test1", "test2", "final"].map((field) => {
                                                        const isTest = field === "test1" || field === "test2";
                                                        const maxVal = isTest ? 30 : 70;
                                                        const label = field === "final" ? `Final (/70)` : field === "test1" ? "Test 1 (/30)" : "Test 2 (/30)";
                                                        return (
                                                            <div key={field} className="mark-input-group">
                                                                <label className="mark-label">{label}</label>
                                                                <input
                                                                    className="input small-input"
                                                                    type="number"
                                                                    min="0"
                                                                    max={maxVal}
                                                                    placeholder={`0–${maxVal}`}
                                                                    value={marksForm[field]}
                                                                    onChange={(e) => setMarksForm({ ...marksForm, [field]: e.target.value })}
                                                                />
                                                            </div>
                                                        );
                                                    })}
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

                {/* ── TODO TAB ── */}
                {tab === "Todo" && (
                    <section className="panel">
                        <h2 className="panel-title">📋 Todo List</h2>
                        <div className="add-row">
                            <input
                                className="input"
                                placeholder="Add a new task..."
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                            />
                            <button className="btn-primary" onClick={addTodo}>
                                + Add Task
                            </button>
                        </div>

                        {todos.length === 0 && (
                            <div className="todo-empty">
                                <span className="todo-empty-icon">📝</span>
                                <p>No tasks yet. Add your first task above!</p>
                            </div>
                        )}

                        {todos.length > 0 && (
                            <>
                                <div className="todo-progress-bar-wrap">
                                    <div
                                        className="todo-progress-bar"
                                        style={{ width: `${Math.round((todoDone / todos.length) * 100)}%` }}
                                    />
                                </div>
                                <p className="todo-progress-label muted small">
                                    {todoDone} of {todos.length} tasks completed
                                </p>
                                <ul className="todo-list">
                                    {todos.map((t) => (
                                        <li key={t.id} className={`todo-item ${t.done ? "todo-done" : ""}`}>
                                            <button
                                                className={`todo-check ${t.done ? "todo-check-done" : ""}`}
                                                onClick={() => toggleTodo(t.id)}
                                                aria-label="Toggle task"
                                            >
                                                {t.done ? "✓" : ""}
                                            </button>
                                            <span className="todo-text">{t.text}</span>
                                            <button
                                                className="todo-delete"
                                                onClick={() => deleteTodo(t.id)}
                                                aria-label="Delete task"
                                            >
                                                🗑
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {todoDone > 0 && (
                                    <button
                                        className="btn-clear-done"
                                        onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
                                    >
                                        🗑 Clear completed ({todoDone})
                                    </button>
                                )}
                            </>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
