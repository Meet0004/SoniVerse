
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const helmet = require('helmet');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});


let url = '';
let activeUsers = 0;
const activeSessions = new Map();
const users = {};
const rooms = {};

// CSP to allow Socket.io CDN
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.socket.io; " +
        "connect-src 'self' ws: wss: *; " +
        "style-src 'self' 'unsafe-inline';"
    );
    next();
});

// remove the Helmet CSP , we're using custom headers above
const configureHelmet = () => {
    app.use(
        helmet({
            contentSecurityPolicy: false,
        })
    );
};

// acivate Helmet without CSP
configureHelmet();


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/home.html'));
});


app.get('/generate-session', (req, res) => {
    // random hai sab
    const sessionCode = Math.floor(10 + Math.random() * 90).toString();
    
    // new folder
    const sessionDir = path.join(__dirname, 'sessions', sessionCode);
    if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
        fs.mkdirSync(path.join(__dirname, 'sessions'));
    }
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir);
        fs.writeFileSync(path.join(sessionDir, 'code.txt'), '// Start coding here');
    }
    
    // adding active sessions
    activeSessions.set(sessionCode, {
        users: 0,
        created: new Date()
    });
    
    console.log(`New session created: ${sessionCode}`);
    
    // response the session code
    res.json({ sessionCode });
});


app.get('/editor/:code', (req, res) => {
    const code = req.params.code;
    
    if (!activeSessions.has(code)) {
        return res.redirect('/?error=invalid');
    }
    
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
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

        console.log(`Compiling ${language} (version ${languageVersions[language]})...`);

        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
            language: language,
            version: languageVersions[language],
            files: [{ name: "main", content: code }]
        });

        console.log("Compilation successful:", response.data.run);
        res.json(response.data.run);
    } catch (error) {
        console.error("Compilation Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Compilation failed" });
    }
});


io.on('connection', (socket) => {
    console.log("User connected:", socket.id);
    let sessionCode = null;
    
    socket.on('join-session', (code) => {
        sessionCode = code;

        if (!activeSessions.has(code)) {
            socket.emit('error', 'Invalid session code');
            return;
        }
        
        socket.join(code);
        
        const session = activeSessions.get(code);
        session.users++;
        activeSessions.set(code, session);
        
        activeUsers++;
        
        console.log(`Client joined session ${code}. Users in session: ${session.users}`);
        
        const sessionDir = path.join(__dirname, 'sessions', code);
        fs.readFile(path.join(sessionDir, 'code.txt'), 'utf8', (err, data) => {
            if (!err) {
                socket.emit('initial-code', data);
            }
        });
        
        io.to(code).emit('user-count', { count: session.users });
    });
    
    socket.on('code-update', (content) => {
        if (!sessionCode || !activeSessions.has(sessionCode)) return;
        
        const sessionDir = path.join(__dirname, 'sessions', sessionCode);
        fs.writeFile(path.join(sessionDir, 'code.txt'), content, (err) => {
            if (err) console.error('Error saving code:', err);
        });
        
        socket.to(sessionCode).emit('code-update', content);
    });
    
    socket.on('language-change', (language) => {
        if (!sessionCode) return;
        socket.to(sessionCode).emit('language-change', language);
    });
    
    socket.on('join_room', (roomId) => {
        console.log("ROOM ID: ", roomId);
        socket.join(roomId);
        
        if (!rooms[roomId]) rooms[roomId] = "";
        
        console.log(`User ${socket.id} joined room: ${roomId}`);
        socket.emit("load_text", rooms[roomId]);
        
        socket.on("text_change", (data) => {
            rooms[roomId] = data;
            socket.to(roomId).emit("text_change", data);
        });
    });
    
    socket.on("text_change", (data) => {
        if (!sessionCode) {
            socket.broadcast.emit("text_change", data);
        }
    });
    
    // --------------------- call events ---------------------
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });
    
    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });
    
    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });
    
    // --------------------- join ---------------------
    socket.on('join', (username) => {
        users[socket.id] = username;
        socket.broadcast.emit('message', {
            user: 'System',
            text: `${username} has joined the chat`
        });
        
        io.emit('usersList', Object.values(users));
    });
    
    // --------------------- msg ---------------------
    socket.on('sendMessage', (message) => {
        io.emit('message', {
            user: users[socket.id],
            text: message
        });
    });
    
    // --------------------- typing indicator ---------------------
    socket.on('typing', (isTyping) => {
        socket.broadcast.emit('userTyping', {
            user: users[socket.id],
            isTyping
        });
    });
    

    socket.on('disconnect', () => {  // full cleanup
        if (sessionCode && activeSessions.has(sessionCode)) {
            const session = activeSessions.get(sessionCode);
            session.users--;
            
            if (session.users <= 0) {
                setTimeout(() => {
                    if (activeSessions.has(sessionCode) && activeSessions.get(sessionCode).users <= 0) {
                        activeSessions.delete(sessionCode);
                        console.log(`Session ${sessionCode} closed due to inactivity`);
                    }
                }, 300000); // 5 min 
            } else {
                activeSessions.set(sessionCode, session);
            }
            
            io.to(sessionCode).emit('user-count', { count: session.users });
            
            console.log(`Client left session ${sessionCode}. Users in session: ${session.users}`);
        }
        
        if (users[socket.id]) {
            io.emit('message', {
                user: 'System',
                text: `${users[socket.id]} has left the chat`
            });
            delete users[socket.id];
            io.emit('usersList', Object.values(users));
        }
        
        activeUsers--;
        console.log('User disconnected:', socket.id);
    });
});

// Version control ---------------

app.post('/commit', async (req, res) => {
    try {
        const {
            personalAccessToken,
            repoOwner,
            repoName,
            filePath,
            commitMessage,
            fileContent
        } = req.body;

        // First, get the current file's SHA
        const fileResponse = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': `token ${personalAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        // commit payloadi
        const commitPayload = {
            message: commitMessage,
            content: Buffer.from(fileContent).toString('base64'),
            sha: fileResponse.data.sha,
            branch: 'main'
        };

        // commiting
        const commitResponse = await axios.put(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            commitPayload,
            {
                headers: {
                    'Authorization': `token ${personalAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            message: 'Commit successful',
            commitData: commitResponse.data
        });
    } catch (error) {
        console.error('GitHub Commit Error:', error.response ? error.response.data : error.message);
        res.status(500).json({
            message: error.response ? error.response.data.message : 'An error occurred',
            error: error.response ? error.response.data : error.message
        });
    }
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    try {
        url = await ngrok.connect(PORT);
        console.log(`Public URL: ${url}`);
        console.log(`Share this URL with others to start collaborating.`);
    } catch (err) {
        console.error('Failed to start ngrok:', err);
    }
});

// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const cors = require("cors");
// const axios = require("axios");
// const helmet = require('helmet'); // Import Helmet for security
// const ngrok = require('ngrok');
// const fs = require('fs');
// const path = require('path')
// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '/public/home.html'));
// });

// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: { origin: "*", methods: ["GET", "POST"] }
// });
// app.use((req, res, next) => {
//     res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline'");
//     next();
// });

// let url='';
// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, async () => {
//   console.log(`Server running on http://localhost:${PORT}`);
  
//   try {
//     url = await ngrok.connect(PORT);
//     console.log(`Public URL: ${url}`);
//     console.log(`Share this URL with others to start collaborating.`);
//   } catch (err) {
//     console.error('Failed to start ngrok:', err);
//   }
// });


// // Use Helmet to set appropriate CSP headers
// app.use(
//     helmet({
//         contentSecurityPolicy: {
//             directives: {
//                 defaultSrc: ["'self'"],
//                 scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
//                 connectSrc: ["'self'", "ws:", "wss:", `${url}`],
//                 mediaSrc: ["'self'"],
//                 objectSrc: ["'none'"],
//             },
//         },
//     })
// );


// // Track active users and session codes
// let activeUsers = 0;
// const activeSessions = new Map();
// // Generate new session
// app.get('/generate-session', (req, res) => {
//     // Generate random 2-digit code
//     const sessionCode = Math.floor(10 + Math.random() * 90).toString();
    
//     // Create session folder if it doesn't exist
//     const sessionDir = path.join(__dirname, 'sessions', sessionCode);
//     if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
//       fs.mkdirSync(path.join(__dirname, 'sessions'));
//     }
    
//     if (!fs.existsSync(sessionDir)) {
//       fs.mkdirSync(sessionDir);
//       // Initialize empty code file
//       fs.writeFileSync(path.join(sessionDir, 'code.txt'), '// Start coding here');
//     }
    
//     // Add to active sessions
//     activeSessions.set(sessionCode, {
//       users: 0,
//       created: new Date()
//     });
    
//     console.log(`New session created: ${sessionCode}`);
    
//     // Return the session code
//     res.json({ sessionCode });
//   });
  
//   // Editor page with session verification
//   app.get('/editor/:code', (req, res) => {
//     const code = req.params.code;
    
//     // Check if session exists
//     if (!activeSessions.has(code)) {
//       return res.redirect('/?error=invalid');
//     }
    
//     res.sendFile(path.join(__dirname, 'public', 'editor.html'));
//   });
  
//   // Socket.io connection handling
//   io.on('connection', (socket) => {
//     let sessionCode = null;
    
//     // Join specific session room
//     socket.on('join-session', (code) => {
//       sessionCode = code;
      
//       // Check if session exists
//       if (!activeSessions.has(code)) {
//         socket.emit('error', 'Invalid session code');
//         return;
//       }
      
//       // Join room
//       socket.join(code);
      
//       // Update session users
//       const session = activeSessions.get(code);
//       session.users++;
//       activeSessions.set(code, session);
      
//       // Update total active users
//       activeUsers++;
      
//       console.log(`Client joined session ${code}. Users in session: ${session.users}`);
      
//       // Send current code to new client
//       const sessionDir = path.join(__dirname, 'sessions', code);
//       fs.readFile(path.join(sessionDir, 'code.txt'), 'utf8', (err, data) => {
//         if (!err) {
//           socket.emit('initial-code', data);
//         }
//       });
      
//       // Broadcast updated user count to all clients in this session
//       io.to(code).emit('user-count', { count: session.users });
//     });
    
//     // Handle code updates
//     socket.on('code-update', (content) => {
//       if (!sessionCode || !activeSessions.has(sessionCode)) return;
      
//       // Save code to session file
//       const sessionDir = path.join(__dirname, 'sessions', sessionCode);
//       fs.writeFile(path.join(sessionDir, 'code.txt'), content, (err) => {
//         if (err) console.error('Error saving code:', err);
//       });
      
//       // Broadcast to all other clients in this session
//       socket.to(sessionCode).emit('code-update', content);
//     });
    
//     // Handle language changes
//     socket.on('language-change', (language) => {
//       if (!sessionCode) return;
//       socket.to(sessionCode).emit('language-change', language);
//     });
    
//     // Handle disconnection
//     socket.on('disconnect', () => {
//       if (sessionCode && activeSessions.has(sessionCode)) {
//         // Update session users
//         const session = activeSessions.get(sessionCode);
//         session.users--;
        
//         if (session.users <= 0) {
//           // Clean up if no users left
//           setTimeout(() => {
//             // Double check if still no users
//             if (activeSessions.has(sessionCode) && activeSessions.get(sessionCode).users <= 0) {
//               activeSessions.delete(sessionCode);
//               console.log(`Session ${sessionCode} closed due to inactivity`);
//             }
//           }, 300000); // 5 minutes
//         } else {
//           activeSessions.set(sessionCode, session);
//         }
        
//         // Broadcast updated user count
//         io.to(sessionCode).emit('user-count', { count: session.users });
        
//         console.log(`Client left session ${sessionCode}. Users in session: ${session.users}`);
//       }
      
//       // Update total active users
//       activeUsers--;
//     });
//   });

// // Store text data per room
// const rooms = {};
// let textData = "";
// // Store connected users
// const users = {};

// io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);
//     socket.emit("load_text", textData);

//     socket.on("text_change", (data) => {
//         if (textData !== data) { 
//             textData = data;
//             socket.broadcast.emit("text_change", data);
//         }
//     });

//     socket.on("join_room", (roomId) => {
//         console.log("ROOM ID : ", roomId)
//         // ROOMS
//         socket.join(roomId);
//         if (!rooms[roomId]) rooms[roomId] = "";


//         console.log(`User ${socket.id} joined room: ${roomId}`);
//         socket.emit("load_text", rooms[roomId]);

//         socket.on("text_change", (data) => {
//             rooms[roomId] = data;
//             document.getElementById('').innerText = roomId
//             socket.to(roomId).emit("text_change", data);
//         });

//         socket.on("disconnect", () => {
//             console.log(`User ${socket.id} left room`);
//         });
//     });

//     socket.on("disconnect", () => {
//         console.log(`User ${socket.id} left room`);
//     }); 


//     // voice chat app bhaiiiiiiiiii
//     console.log('Client connected:', socket.id);

//     socket.on('offer', (offer) => {
//         socket.broadcast.emit('offer', offer);
//     });

//     socket.on('answer', (answer) => {
//         socket.broadcast.emit('answer', answer);
//     });

//     socket.on('ice-candidate', (candidate) => {
//         socket.broadcast.emit('ice-candidate', candidate);
//     });

//     socket.on('disconnect', () => {
//         console.log('Client disconnected:', socket.id);
//     });


//     //================ chat ================

//     socket.on('join', (username) => {
//         users[socket.id] = username;
//         socket.broadcast.emit('message', {
//           user: 'System',
//           text: `${username} has joined the chat`
//         });
        
//         // emit users lit to others
//         io.emit('usersList', Object.values(users));
//       });
      
//       // incoming msg
//       socket.on('sendMessage', (message) => {
//         io.emit('message', {
//           user: users[socket.id],
//           text: message
//         });
//       });
      
//       // typing ka indicator
//       socket.on('typing', (isTyping) => {
//         socket.broadcast.emit('userTyping', {
//           user: users[socket.id],
//           isTyping
//         });
//       });
      
//       // disconnection kaisa
//       socket.on('disconnect', () => {
//         if (users[socket.id]) {
//           io.emit('message', {
//             user: 'System',
//             text: `${users[socket.id]} has left the chat`
//           });
//           delete users[socket.id];
//           io.emit('usersList', Object.values(users));
//         }
//         console.log('User disconnected:', socket.id);
//       });
// });

// // code compilation and run (output)
// app.post("/compile", async (req, res) => {
//     try {
//         const { language, code } = req.body;
//         if (!code || !language)
//             return res.status(400).json({ error: "Code or language is missing" });

//         const languageVersions = {
//             "python": "3.10.0", 
//             "java": "15.0.2"
//         };

//         if (!languageVersions[language]) {
//             return res.status(400).json({ error: "Unsupported language" });
//         }

//         console.log(`Compilingggg ${language} (version ${languageVersions[language]})...`);

//         const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
//             language: language,
//             version: languageVersions[language], 
//             files: [{ name: "main", content: code }]
//         });

//         console.log("Compilation successful:", response.data.run);
//         res.json(response.data.run);
//     } catch (error) {
//         console.error("Compilation Error:", error.response ? error.response.data : error.message);
//         res.status(500).json({ error: "Compilation failed" });
//     }
// });

