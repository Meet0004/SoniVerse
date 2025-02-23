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
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // Store text for each room

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = "";
        socket.emit("load_text", rooms[roomId]);
    });

    socket.on("text_change", ({ roomId, content }) => {
        rooms[roomId] = content;
        socket.to(roomId).emit("text_change", content);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

app.post("/compile", async (req, res) => {
    try {
        const { language, code } = req.body;
        if (!code || !language) return res.status(400).json({ error: "Missing code or language" });

        const languageVersions = { "python": "3.10.0", "java": "15.0.2" };

        if (!languageVersions[language]) return res.status(400).json({ error: "Unsupported language" });

        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
            language,
            version: languageVersions[language],
            files: [{ name: "main", content: code }]
        });

        res.json(response.data.run);
    } catch (error) {
        res.status(500).json({ error: "Compilation failed" });
    }
});

server.listen(3000, () => console.log("Server running on port 3000"));
