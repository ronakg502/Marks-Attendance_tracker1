const router = require("express").Router();
const supabase = require("../config/supabase");

// ADD / UPDATE MARKS FOR A SUBJECT
router.post("/add", async (req, res) => {
    const { subject_id, user_id, test1, test2, final } = req.body;

    // Check if marks already exist for this subject
    const { data: existing } = await supabase
        .from("marks")
        .select("id")
        .eq("subject_id", subject_id)
        .eq("user_id", user_id)
        .single();

    let result;
    if (existing) {
        result = await supabase
            .from("marks")
            .update({ test1, test2, final })
            .eq("id", existing.id);
    } else {
        result = await supabase
            .from("marks")
            .insert([{ subject_id, user_id, test1, test2, final }]);
    }

    if (result.error) return res.status(500).json(result.error);
    res.json(result.data);
});

// GET MARKS FOR A SUBJECT
router.get("/:subject_id", async (req, res) => {
    const { subject_id } = req.params;

    const { data, error } = await supabase
        .from("marks")
        .select("*")
        .eq("subject_id", subject_id)
        .single();

    if (error && error.code !== "PGRST116") return res.status(500).json(error);
    res.json(data || null);
});

// GET ALL MARKS FOR A USER
router.get("/all/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("marks")
        .select("*")
        .eq("user_id", user_id);

    if (error) return res.status(500).json(error);
    res.json(data);
});

module.exports = router;