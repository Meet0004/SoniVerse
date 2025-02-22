const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let textData = "";

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.emit("load_text", textData);

    socket.on("text_change", (data) => {
        textData = data;
        socket.broadcast.emit("text_change", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

app.post("/compile", async (req, res) => {
    try {
        const { language, code } = req.body;
        if (!code || !language)
            return res.status(400).json({ error: "Code or language is missing" });

        const languageVersions = {
            "python": "3.10.0", 
            "java": "15.0.2"     
        };

        if (!languageVersions[language]) {
            return res.status(400).json({ error: "Unsupported language" });
        }

        console.log(`Compilingggg ${language} (version ${languageVersions[language]})...`);

        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
            language: language,
            version: languageVersions[language],  // ✅ Use correct version
            files: [{ name: "main", content: code }]
        });

        console.log("Compilation successful:", response.data.run);
        res.json(response.data.run);
    } catch (error) {
        console.error("Compilation Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Compilation failed" });
    }
});



server.listen(5000, () => console.log("Server running on port 5000"));