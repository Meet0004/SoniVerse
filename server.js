const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const helmet = require('helmet'); // Import Helmet for security

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    next();
});
// Use Helmet to set appropriate CSP headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                connectSrc: ["'self'", "ws:", "wss:", "https://1755-2401-4900-1c06-620b-9df5-f42a-1cfd-21ca.ngrok-free.app"],
                mediaSrc: ["'self'"],
                objectSrc: ["'none'"],
            },
        },
    })
);

server.listen(5000, () => console.log("Server running on port 5000"));

// Store text data per room
const rooms = {};
let textData = "";
// Store connected users
const users = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.emit("load_text", textData);

    socket.on("text_change", (data) => {
        if (textData !== data) { 
            textData = data;
            socket.broadcast.emit("text_change", data);
        }
    });

    socket.on("join_room", (roomId) => {
        console.log("ROOM ID : ", roomId)
        // ROOMS
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = "";


        console.log(`User ${socket.id} joined room: ${roomId}`);
        socket.emit("load_text", rooms[roomId]);

        socket.on("text_change", (data) => {
            rooms[roomId] = data;
            document.getElementById('').innerText = roomId
            socket.to(roomId).emit("text_change", data);
        });

        socket.on("disconnect", () => {
            console.log(`User ${socket.id} left room`);
        });
    });

    socket.on("disconnect", () => {
        console.log(`User ${socket.id} left room`);
    }); 


    // voice chat app bhaiiiiiiiiii
    console.log('Client connected:', socket.id);

    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });


    //================ chat ================

    socket.on('join', (username) => {
        users[socket.id] = username;
        socket.broadcast.emit('message', {
          user: 'System',
          text: `${username} has joined the chat`
        });
        
        // emit users lit to others
        io.emit('usersList', Object.values(users));
      });
      
      // incoming msg
      socket.on('sendMessage', (message) => {
        io.emit('message', {
          user: users[socket.id],
          text: message
        });
      });
      
      // typing ka indicator
      socket.on('typing', (isTyping) => {
        socket.broadcast.emit('userTyping', {
          user: users[socket.id],
          isTyping
        });
      });
      
      // disconnection kaisa
      socket.on('disconnect', () => {
        if (users[socket.id]) {
          io.emit('message', {
            user: 'System',
            text: `${users[socket.id]} has left the chat`
          });
          delete users[socket.id];
          io.emit('usersList', Object.values(users));
        }
        console.log('User disconnected:', socket.id);
      });
});

// code compilation and run (output)
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

