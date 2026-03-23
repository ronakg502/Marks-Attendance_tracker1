const router = require("express").Router();
const supabase = require("../config/supabase");

// ADD SUBJECT
router.post("/add", async (req, res) => {
    const { subject_name, user_id } = req.body;

    const { data, error } = await supabase
        .from("subjects")
        .insert([{ subject_name, user_id }])
        .select();

    if (error) return res.status(500).json(error);
    res.json(data);
});

// GET SUBJECTS
router.get("/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });

    if (error) return res.status(500).json(error);
    res.json(data);
});

// DELETE SUBJECT
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);

    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

module.exports = router;