const router = require("express").Router();
const supabase = require("../config/supabase");

// ADD A MARK COMPONENT (e.g. "Test 1", max_marks: 30)
router.post("/add", async (req, res) => {
    const { subject_id, user_id, name, max_marks } = req.body;

    if (!subject_id || !user_id || !name || !max_marks) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
        .from("mark_components")
        .insert([{ subject_id, user_id, name, max_marks: Number(max_marks) }])
        .select();

    if (error) return res.status(500).json(error);
    res.json(data);
});

// GET ALL COMPONENTS FOR A SUBJECT
router.get("/:subject_id", async (req, res) => {
    const { subject_id } = req.params;

    const { data, error } = await supabase
        .from("mark_components")
        .select("*")
        .eq("subject_id", subject_id)
        .order("created_at", { ascending: true });

    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// GET ALL COMPONENTS FOR ALL SUBJECTS OF A USER
router.get("/all/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("mark_components")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });

    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// DELETE A MARK COMPONENT (cascades to mark_entries)
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from("mark_components")
        .delete()
        .eq("id", id);

    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

module.exports = router;
