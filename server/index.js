const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Running...");
});

app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/marks", require("./routes/marksRoutes"));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
console.log(process.env.SUPABASE_URL);

app.get("/api/subjects", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("subjects")
            .select("*");

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/subjects", async (req, res) => {
    const { name } = req.body;

    const { data, error } = await supabase
        .from("subjects")
        .insert([{ name }]);

    if (error) return res.status(500).json({ error });

    res.json(data);
});