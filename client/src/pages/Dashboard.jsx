import { useState, useEffect, useCallback } from "react";
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

    // NEW Marks system — components + entries
    // components: { [subject_id]: [ { id, name, max_marks, ... } ] }
    const [components, setComponents] = useState({});
    // entries: { [subject_id]: [ { component_id, obtained } ] }
    const [entries, setEntries] = useState({});
    // Which subject's marks panel is open
    const [openMarkSubject, setOpenMarkSubject] = useState(null);
    // New component form state per subject
    const [newComponent, setNewComponent] = useState({ name: "", max_marks: "" });
    const [addingComponent, setAddingComponent] = useState(false);
    // In-flight entry saves: { [component_id]: value }
    const [entryDraft, setEntryDraft] = useState({});
    const [savingEntry, setSavingEntry] = useState({});

    // Todo
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState("");
    const [loadingTodos, setLoadingTodos] = useState(false);

    // ─── Todo ────────────────────────────────────────────────────────
    const fetchTodos = async () => {
        if (!USER_ID) return;
        setLoadingTodos(true);
        const { data, error: err } = await supabase
            .from("todos")
            .select("*")
            .eq("user_id", USER_ID)
            .order("created_at", { ascending: false });
        if (!err) setTodos(data || []);
        else setError("Failed to fetch todos: " + err.message);
        setLoadingTodos(false);
    };

    const addTodo = async () => {
        if (!newTodo.trim()) return;
        const text = newTodo.trim();
        setNewTodo("");
        const { data, error: err } = await supabase
            .from("todos")
            .insert([{ user_id: USER_ID, text, done: false }])
            .select()
            .single();
        if (!err && data) setTodos((prev) => [data, ...prev]);
        else if (err) setError("Failed to add todo: " + err.message);
    };

    const toggleTodo = async (id, currentDone) => {
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !currentDone } : t));
        const { error: err } = await supabase.from("todos").update({ done: !currentDone }).eq("id", id);
        if (err) {
            setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: currentDone } : t));
            setError("Failed to update todo: " + err.message);
        }
    };

    const deleteTodo = async (id) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        const { error: err } = await supabase.from("todos").delete().eq("id", id);
        if (err) { setError("Failed to delete todo: " + err.message); fetchTodos(); }
    };

    const clearDoneTodos = async () => {
        setTodos((prev) => prev.filter((t) => !t.done));
        const { error: err } = await supabase.from("todos").delete().eq("user_id", USER_ID).eq("done", true);
        if (err) { setError("Failed to clear todos: " + err.message); fetchTodos(); }
    };

    // ─── Subjects ────────────────────────────────────────────────────
    const fetchSubjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API}/subjects/${USER_ID}`);
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch { setError("Failed to fetch subjects"); }
        finally { setLoading(false); }
    };

    const addSubject = async () => {
        if (!newSubject.trim()) return;
        try {
            await axios.post(`${API}/subjects/add`, { subject_name: newSubject.trim(), user_id: USER_ID });
            setNewSubject("");
            await fetchSubjects();
        } catch { setError("Failed to add subject"); }
    };

    const deleteSubject = async (id) => {
        try { await axios.delete(`${API}/subjects/${id}`); await fetchSubjects(); }
        catch { setError("Failed to delete subject"); }
    };

    // ─── Attendance ──────────────────────────────────────────────────
    const fetchAttendanceSummary = async () => {
        try {
            const res = await axios.get(`${API}/attendance/summary/${USER_ID}`);
            const map = {};
            res.data.forEach((s) => { map[s.subject_id] = s; });
            setAttendanceSummary(map);
        } catch { /* ignore */ }
    };

    const fetchAttendanceHistory = async (subject_id) => {
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/attendance/${subject_id}`);
            setAttendanceHistory((prev) => ({ ...prev, [subject_id]: res.data }));
        } catch { /* ignore */ }
        finally { setLoadingHistory(false); }
    };

    const handleSelectSubject = (subject_id) => {
        const next = selectedSubject === subject_id ? null : subject_id;
        setSelectedSubject(next);
        if (next) fetchAttendanceHistory(next);
    };

    const markAttendance = async (subject_id, status) => {
        setMarkingAtt(true);
        try {
            await axios.post(`${API}/attendance/mark`, { subject_id, user_id: USER_ID, status });
            await fetchAttendanceSummary();
            await fetchAttendanceHistory(subject_id);
        } catch { setError("Failed to mark attendance"); }
        finally { setMarkingAtt(false); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    // ─── NEW Marks: Mark Components ──────────────────────────────────
    const fetchComponents = useCallback(async (subject_id) => {
        try {
            const res = await axios.get(`${API}/mark-components/${subject_id}`);
            setComponents((prev) => ({ ...prev, [subject_id]: res.data || [] }));
        } catch { /* ignore */ }
    }, []);

    const fetchEntries = useCallback(async (subject_id) => {
        try {
            const res = await axios.get(`${API}/mark-entries/${subject_id}/${USER_ID}`);
            setEntries((prev) => ({ ...prev, [subject_id]: res.data || [] }));
            // Seed drafts with saved values
            const draftMap = {};
            (res.data || []).forEach((e) => {
                draftMap[e.component_id] = e.obtained !== null && e.obtained !== undefined ? String(e.obtained) : "";
            });
            setEntryDraft((prev) => ({ ...prev, ...draftMap }));
        } catch { /* ignore */ }
    }, [USER_ID]);

    const openMarksPanel = async (subject_id) => {
        if (openMarkSubject === subject_id) {
            setOpenMarkSubject(null);
            return;
        }
        setOpenMarkSubject(subject_id);
        setNewComponent({ name: "", max_marks: "" });
        await Promise.all([fetchComponents(subject_id), fetchEntries(subject_id)]);
    };

    const addComponent = async (subject_id) => {
        if (!newComponent.name.trim() || !newComponent.max_marks) return;
        setAddingComponent(true);
        try {
            await axios.post(`${API}/mark-components/add`, {
                subject_id,
                user_id: USER_ID,
                name: newComponent.name.trim(),
                max_marks: Number(newComponent.max_marks),
            });
            setNewComponent({ name: "", max_marks: "" });
            await fetchComponents(subject_id);
        } catch { setError("Failed to add component"); }
        finally { setAddingComponent(false); }
    };

    const deleteComponent = async (component_id, subject_id) => {
        try {
            await axios.delete(`${API}/mark-components/${component_id}`);
            await fetchComponents(subject_id);
            await fetchEntries(subject_id);
        } catch { setError("Failed to delete component"); }
    };

    const saveEntry = async (component_id, subject_id, max_marks) => {
        const val = entryDraft[component_id];
        const num = Number(val);
        if (val !== "" && (isNaN(num) || num < 0 || num > max_marks)) {
            setError(`Marks must be between 0 and ${max_marks}`);
            return;
        }
        setSavingEntry((prev) => ({ ...prev, [component_id]: true }));
        try {
            await axios.post(`${API}/mark-entries/save`, {
                component_id,
                subject_id,
                user_id: USER_ID,
                obtained: val === "" ? null : num,
            });
            await fetchEntries(subject_id);
        } catch { setError("Failed to save marks"); }
        finally { setSavingEntry((prev) => ({ ...prev, [component_id]: false })); }
    };

    // ─── Derived: marks summary per subject ──────────────────────────
    const getSubjectMarksSummary = (subject_id) => {
        const comps = components[subject_id] || [];
        const ents = entries[subject_id] || [];
        if (comps.length === 0) return null;

        const entryMap = {};
        ents.forEach((e) => { entryMap[e.component_id] = e.obtained; });

        let totalMax = 0;
        let totalObtained = 0;
        let complete = true;
        comps.forEach((c) => {
            totalMax += c.max_marks;
            const ob = entryMap[c.id];
            if (ob !== null && ob !== undefined) {
                totalObtained += ob;
            } else {
                complete = false;
            }
        });

        const pct = totalMax > 0 && complete ? Math.round((totalObtained / totalMax) * 100) : null;
        return { totalMax, totalObtained, pct, complete, comps: comps.length };
    };

    const getGradeFromPct = (pct) => {
        if (pct === null) return "—";
        if (pct >= 90) return "A+";
        if (pct >= 80) return "A";
        if (pct >= 70) return "B";
        if (pct >= 60) return "C";
        if (pct >= 50) return "D";
        return "F";
    };

    // Overall avg across all subjects that have complete data
    const allSummaries = subjects.map((s) => getSubjectMarksSummary(s.id)).filter((sm) => sm && sm.pct !== null);
    const avgPct = allSummaries.length > 0
        ? Math.round(allSummaries.reduce((a, sm) => a + sm.pct, 0) / allSummaries.length)
        : "—";

    // ─── Effects ─────────────────────────────────────────────────────
    useEffect(() => { fetchSubjects(); fetchTodos(); }, []);
    useEffect(() => {
        if (subjects.length > 0) {
            fetchAttendanceSummary();
            // Pre-fetch components for all subjects (for stat card)
            subjects.forEach((s) => fetchComponents(s.id));
            subjects.forEach((s) => fetchEntries(s.id));
        }
    }, [subjects]);

    // ─── Derived stats ───────────────────────────────────────────────
    const totalPresent = Object.values(attendanceSummary).reduce((a, b) => a + b.present, 0);
    const totalClasses = Object.values(attendanceSummary).reduce((a, b) => a + b.total, 0);
    const overallAttPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    const getAttColor = (pct) => pct >= 75 ? "att-good" : pct >= 50 ? "att-warn" : "att-danger";
    const todoDone = todos.filter((t) => t.done).length;

    return (
        <div className="app-bg">
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
                        <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
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

                <div className="stat-row">
                    <StatCard label="Total Subjects" value={subjects.length} color="card-blue" />
                    <StatCard label="Overall Attendance" value={`${overallAttPct}%`} color={overallAttPct >= 75 ? "card-green" : overallAttPct >= 50 ? "card-yellow" : "card-red"} />
                    <StatCard label="Total Classes" value={totalClasses} color="card-purple" />
                    <StatCard label="Avg Marks %" value={avgPct !== "—" ? `${avgPct}%` : "—"} color="card-orange" />
                </div>

                {/* ── SUBJECTS TAB ── */}
                {tab === "Subjects" && (
                    <section className="panel">
                        <h2 className="panel-title">📚 Subjects</h2>
                        <div className="add-row">
                            <input className="input" placeholder="Enter subject name..." value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addSubject()} />
                            <button className="btn-primary" onClick={addSubject} disabled={loading}>+ Add Subject</button>
                        </div>
                        {loading && <p className="muted">Loading subjects…</p>}
                        <div className="subject-grid">
                            {subjects.map((s) => {
                                const att = attendanceSummary[s.id];
                                const pct = att ? att.percentage : null;
                                return (
                                    <div key={s.id} className="subject-card">
                                        <div className="subject-name">{s.subject_name}</div>
                                        {att
                                            ? <div className={`subject-att ${getAttColor(pct)}`}>{pct}% attendance ({att.present}/{att.total})</div>
                                            : <div className="subject-att muted">No attendance yet</div>}
                                        <button className="btn-danger-sm" onClick={() => deleteSubject(s.id)}>Delete</button>
                                    </div>
                                );
                            })}
                            {subjects.length === 0 && !loading && <p className="muted">No subjects yet. Add one above!</p>}
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
                                            {att
                                                ? <span className={`att-badge ${getAttColor(pct)}`}>{pct}% · {att.present}P / {att.absent}A</span>
                                                : <span className="att-badge muted">No records</span>}
                                        </div>
                                        {att && (
                                            <div className="progress-bar-wrap">
                                                <div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 75 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444" }} />
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <div className="att-actions">
                                                    <button className="btn-present" onClick={() => markAttendance(s.id, "present")} disabled={markingAtt}>✓ Present</button>
                                                    <button className="btn-absent" onClick={() => markAttendance(s.id, "absent")} disabled={markingAtt}>✗ Absent</button>
                                                </div>
                                                <div className="att-history-wrap">
                                                    <div className="att-history-title">📅 Attendance History</div>
                                                    {loadingHistory && <p className="muted small">Loading…</p>}
                                                    {!loadingHistory && history.length === 0 && (
                                                        <p className="muted small">No records yet for this subject.</p>
                                                    )}
                                                    {!loadingHistory && history.length > 0 && (
                                                        <div className="att-history-list">
                                                            {history.map((record, idx) => (
                                                                <div key={record.id ?? idx} className={`att-history-item ${record.status}`}>
                                                                    <span className="att-history-status">{record.status === "present" ? "✓" : "✗"}</span>
                                                                    <span className="att-history-date">{formatDate(record.date)}</span>
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

                {/* ── MARKS TAB (New Customizable System) ── */}
                {tab === "Marks" && (
                    <section className="panel">
                        <h2 className="panel-title">📝 Marks</h2>
                        <p className="muted mb-4">Click a subject to manage its mark components and enter your marks.</p>
                        <div className="marks-grid">
                            {subjects.map((s) => {
                                const isOpen = openMarkSubject === s.id;
                                const summary = getSubjectMarksSummary(s.id);
                                const grade = getGradeFromPct(summary?.pct ?? null);
                                const subComponents = components[s.id] || [];
                                const subEntries = entries[s.id] || [];
                                const entryMap = {};
                                subEntries.forEach((e) => { entryMap[e.component_id] = e.obtained; });

                                return (
                                    <div key={s.id} className={`marks-card ${isOpen ? "marks-card-selected" : ""}`}>
                                        {/* Card Header */}
                                        <div className="marks-card-header" onClick={() => openMarksPanel(s.id)}>
                                            <span className="subject-name">{s.subject_name}</span>
                                            <div className="marks-header-right">
                                                {summary && summary.complete && (
                                                    <span className="marks-pct-badge">{summary.totalObtained}/{summary.totalMax} ({summary.pct}%)</span>
                                                )}
                                                {summary && !summary.complete && summary.comps > 0 && (
                                                    <span className="marks-pct-badge muted">{summary.comps} component{summary.comps > 1 ? "s" : ""}</span>
                                                )}
                                                <span className={`grade-badge grade-${grade.replace("+", "plus")}`}>{grade}</span>
                                                <span className="marks-chevron">{isOpen ? "▲" : "▼"}</span>
                                            </div>
                                        </div>

                                        {/* Expanded Panel */}
                                        {isOpen && (
                                            <div className="marks-panel-body" onClick={(e) => e.stopPropagation()}>

                                                {/* Existing Components */}
                                                {subComponents.length === 0 && (
                                                    <p className="muted small" style={{ marginBottom: "12px" }}>
                                                        No components yet. Add your first one below (e.g. "Test 1", "Quiz", "Final Exam").
                                                    </p>
                                                )}

                                                {subComponents.length > 0 && (
                                                    <div className="components-list">
                                                        {subComponents.map((comp) => {
                                                            const obtained = entryMap[comp.id];
                                                            const draftVal = entryDraft[comp.id] ?? (obtained !== null && obtained !== undefined ? String(obtained) : "");
                                                            const isSaving = savingEntry[comp.id];
                                                            const enteredPct = obtained !== null && obtained !== undefined
                                                                ? Math.round((obtained / comp.max_marks) * 100)
                                                                : null;

                                                            return (
                                                                <div key={comp.id} className="component-row">
                                                                    <div className="component-info">
                                                                        <span className="component-name">{comp.name}</span>
                                                                        <span className="component-max">/ {comp.max_marks}</span>
                                                                        {enteredPct !== null && (
                                                                            <span className={`component-pct ${enteredPct >= 75 ? "att-good" : enteredPct >= 50 ? "att-warn" : "att-danger"}`}>
                                                                                {enteredPct}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="component-actions">
                                                                        <input
                                                                            className="input small-input"
                                                                            type="number"
                                                                            min="0"
                                                                            max={comp.max_marks}
                                                                            placeholder={`0–${comp.max_marks}`}
                                                                            value={draftVal}
                                                                            onChange={(e) => setEntryDraft((prev) => ({ ...prev, [comp.id]: e.target.value }))}
                                                                            onBlur={() => saveEntry(comp.id, s.id, comp.max_marks)}
                                                                            onKeyDown={(e) => e.key === "Enter" && saveEntry(comp.id, s.id, comp.max_marks)}
                                                                        />
                                                                        {isSaving && <span className="muted small">Saving…</span>}
                                                                        <button
                                                                            className="btn-danger-sm"
                                                                            onClick={() => deleteComponent(comp.id, s.id)}
                                                                            title="Delete this component"
                                                                        >🗑</button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Summary row */}
                                                {summary && summary.comps > 0 && (
                                                    <div className="marks-summary-row">
                                                        <span className="marks-summary-label">Total:</span>
                                                        <span className="marks-summary-value">
                                                            {summary.complete
                                                                ? `${summary.totalObtained} / ${summary.totalMax} (${summary.pct}%)`
                                                                : `— / ${summary.totalMax} (incomplete)`}
                                                        </span>
                                                        <span className={`grade-badge grade-${grade.replace("+", "plus")}`}>{grade}</span>
                                                    </div>
                                                )}

                                                {/* Add Component Form */}
                                                <div className="add-component-form">
                                                    <div className="add-component-title">➕ Add Mark Component</div>
                                                    <div className="add-component-row">
                                                        <input
                                                            className="input"
                                                            placeholder="Name (e.g. Test 1, Final Exam)"
                                                            value={newComponent.name}
                                                            onChange={(e) => setNewComponent((prev) => ({ ...prev, name: e.target.value }))}
                                                            onKeyDown={(e) => e.key === "Enter" && addComponent(s.id)}
                                                        />
                                                        <input
                                                            className="input small-input"
                                                            type="number"
                                                            placeholder="Max"
                                                            min="1"
                                                            value={newComponent.max_marks}
                                                            onChange={(e) => setNewComponent((prev) => ({ ...prev, max_marks: e.target.value }))}
                                                            onKeyDown={(e) => e.key === "Enter" && addComponent(s.id)}
                                                        />
                                                        <button
                                                            className="btn-primary"
                                                            onClick={() => addComponent(s.id)}
                                                            disabled={addingComponent || !newComponent.name.trim() || !newComponent.max_marks}
                                                        >
                                                            {addingComponent ? "Adding…" : "+ Add"}
                                                        </button>
                                                    </div>
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

                {/* ── TODO TAB ── */}
                {tab === "Todo" && (
                    <section className="panel">
                        <h2 className="panel-title">📋 Todo List</h2>
                        <div className="add-row">
                            <input className="input" placeholder="Add a new task..." value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addTodo()} />
                            <button className="btn-primary" onClick={addTodo}>+ Add Task</button>
                        </div>

                        {loadingTodos && <p className="muted">Loading todos…</p>}
                        {!loadingTodos && todos.length === 0 && (
                            <div className="todo-empty">
                                <span className="todo-empty-icon">📝</span>
                                <p>No tasks yet. Add your first task above!</p>
                            </div>
                        )}

                        {todos.length > 0 && (
                            <>
                                <div className="todo-progress-bar-wrap">
                                    <div className="todo-progress-bar" style={{ width: `${Math.round((todoDone / todos.length) * 100)}%` }} />
                                </div>
                                <p className="todo-progress-label muted small">{todoDone} of {todos.length} tasks completed</p>
                                <ul className="todo-list">
                                    {todos.map((t) => (
                                        <li key={t.id} className={`todo-item ${t.done ? "todo-done" : ""}`}>
                                            <button className={`todo-check ${t.done ? "todo-check-done" : ""}`} onClick={() => toggleTodo(t.id, t.done)}>
                                                {t.done ? "✓" : ""}
                                            </button>
                                            <span className="todo-text">{t.text}</span>
                                            <button className="todo-delete" onClick={() => deleteTodo(t.id)}>🗑</button>
                                        </li>
                                    ))}
                                </ul>
                                {todoDone > 0 && (
                                    <button className="btn-clear-done" onClick={clearDoneTodos}>
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
