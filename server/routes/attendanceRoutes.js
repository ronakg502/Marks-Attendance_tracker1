const router = require("express").Router();
const supabase = require("../config/supabase");

// MARK ATTENDANCE
router.post("/mark", async (req, res) => {
    const { subject_id, user_id, status, date } = req.body;

    const { data, error } = await supabase
        .from("attendance")
        .insert([{ subject_id, user_id, status, date: date || new Date().toISOString().split("T")[0] }]);

    if (error) return res.status(500).json(error);
    res.json(data);
});

// GET ATTENDANCE FOR A SUBJECT
router.get("/:subject_id", async (req, res) => {
    const { subject_id } = req.params;

    const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("subject_id", subject_id)
        .order("date", { ascending: false });

    if (error) return res.status(500).json(error);
    res.json(data);
});

// GET ATTENDANCE SUMMARY PER SUBJECT FOR A USER
router.get("/summary/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("attendance")
        .select("subject_id, status")
        .eq("user_id", user_id);

    if (error) return res.status(500).json(error);

    // Group by subject_id and calculate %
    const summary = {};
    data.forEach(({ subject_id, status }) => {
        if (!summary[subject_id]) summary[subject_id] = { present: 0, absent: 0 };
        summary[subject_id][status]++;
    });

    const result = Object.entries(summary).map(([subject_id, counts]) => {
        const total = counts.present + counts.absent;
        return {
            subject_id,
            present: counts.present,
            absent: counts.absent,
            total,
            percentage: total > 0 ? Math.round((counts.present / total) * 100) : 0,
        };
    });

    res.json(result);
});

module.exports = router;