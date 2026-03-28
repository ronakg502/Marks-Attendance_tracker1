const router = require("express").Router();
const supabase = require("../config/supabase");

// GET all todos for a user
router.get("/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

    if (error) return res.status(500).json(error);
    res.json(data);
});

// ADD a todo
router.post("/add", async (req, res) => {
    const { user_id, text } = req.body;

    const { data, error } = await supabase
        .from("todos")
        .insert([{ user_id, text, done: false }])
        .select();

    if (error) return res.status(500).json(error);
    res.json(data[0]);
});

// TOGGLE done status
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { done } = req.body;

    const { data, error } = await supabase
        .from("todos")
        .update({ done })
        .eq("id", id)
        .select();

    if (error) return res.status(500).json(error);
    res.json(data[0]);
});

// DELETE a todo
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id);

    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

// DELETE all completed todos for a user
router.delete("/clear-done/:user_id", async (req, res) => {
    const { user_id } = req.params;

    const { error } = await supabase
        .from("todos")
        .delete()
        .eq("user_id", user_id)
        .eq("done", true);

    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

module.exports = router;
