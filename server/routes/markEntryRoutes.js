const router = require("express").Router();
const supabase = require("../config/supabase");

// SAVE (UPSERT) MARKS OBTAINED FOR A COMPONENT
router.post("/save", async (req, res) => {
    const { component_id, subject_id, user_id, obtained } = req.body;

    if (!component_id || !subject_id || !user_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if entry already exists
    const { data: existing } = await supabase
        .from("mark_entries")
        .select("id")
        .eq("component_id", component_id)
        .eq("user_id", user_id)
        .single();

    let result;
    if (existing) {
        result = await supabase
            .from("mark_entries")
            .update({ obtained: obtained !== "" ? Number(obtained) : null })
            .eq("id", existing.id)
            .select();
    } else {
        result = await supabase
            .from("mark_entries")
            .insert([{
                component_id,
                subject_id,
                user_id,
                obtained: obtained !== "" ? Number(obtained) : null,
            }])
            .select();
    }

    if (result.error) return res.status(500).json(result.error);
    res.json(result.data);
});

// GET ALL MARK ENTRIES FOR A SUBJECT + USER
router.get("/:subject_id/:user_id", async (req, res) => {
    const { subject_id, user_id } = req.params;

    const { data, error } = await supabase
        .from("mark_entries")
        .select("*")
        .eq("subject_id", subject_id)
        .eq("user_id", user_id);

    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// GET ALL MARK ENTRIES FOR A USER (across all subjects)
router.get("/all/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("mark_entries")
        .select("*")
        .eq("user_id", user_id);

    if (error) return res.status(500).json(error);
    res.json(data || []);
});

module.exports = router;
