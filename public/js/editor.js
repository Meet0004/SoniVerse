const socket = io();
const ngrokLink = socket;

const editor = document.getElementById("editor");
const output = document.getElementById("output");
const language = document.getElementById("language");
const extension = document.getElementById("extension");

//initial text to load (in case)
socket.on("load_text", (data) => {
    editor.value = data;
});

// change hote hi text change
socket.on("text_change", (data) => {
    editor.value = data;
});
// same
editor.addEventListener("input", () => {
    socket.emit("text_change", editor.value);
});


// Initialize variables
let isUpdating = false;
const statusElem = document.getElementById('connection-status');
const usersCountElem = document.getElementById('users-count');
const sessionCodeElem = document.getElementById('session-code');
const copyLinkBtn = document.getElementById('copy-link');
const copiedMessage = document.getElementById('copied-message');

// Get session code from URL
const path = window.location.pathname;
const sessionCode = path.split('/').pop();

// Display session code
sessionCodeElem.textContent = sessionCode;        // DONE

// Copy share link functionality
copyLinkBtn.addEventListener('click', () => {    // DONE
  const shareLink = window.location.href;
  navigator.clipboard.writeText(shareLink).then(() => {
    copiedMessage.style.opacity = '1';
    setTimeout(() => {
      copiedMessage.style.opacity = '0';
    }, 2000);
  });
});

// Initialize CodeMirror
// editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
//   lineNumbers: true,
//   theme: 'monokai',
//   mode: 'python',
//   indentUnit: 2,
//   tabSize: 2,
//   lineWrapping: true,
//   autofocus: true
// });

// Language selector
language.addEventListener('change', (e) => {    
  const lang= e.target.value;
  editor.setOption('mode', lang);
  
  // Notify other users of language change
  socket.emit('language-change', lang);
});


// Join session when connected
socket.on('connect', () => {
  statusElem.textContent = 'Connected';
  statusElem.classList.remove('disconnected');
  statusElem.classList.add('connected');
  
  // Join the session
  socket.emit('join-session', sessionCode);
});

socket.on('disconnect', () => {
  statusElem.textContent = 'Disconnected - Reconnecting...';
  statusElem.classList.remove('connected');
  statusElem.classList.add('disconnected');
});

socket.on('reconnect', () => {
  statusElem.textContent = 'Connected';
  statusElem.classList.remove('disconnected');
  statusElem.classList.add('connected');
  
  // Rejoin the session
  socket.emit('join-session', sessionCode);
});
socket.on('user-count', (data) => {
  usersCountElem.textContent = `Users: ${data.count}`;
});
// Detect text changes and emit to server
editor.addEventListener("input", () => {
  socket.emit("code-update", editor.value);
});

// Listen for updates from the server
socket.on("code-update", (content) => {
  if (editor.value !== content) {
      editor.value = content;
  }
});


// extension badalne ka kaam
document.getElementById('extension').innerText = '.py';
language.addEventListener('change',()=>{
    const selectedLanguage = language.value;
    if(selectedLanguage == 'python'){
        document.getElementById('extension').innerText = '.py';
    }
    if(selectedLanguage == 'java'){
        document.getElementById('extension').innerText = '.java';
    }
});

// room ID
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get("room") || Math.random().toString(36).substr(2, 8);

// compilation
function compileCode() {
    fetch(`/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editor.value, language: language.value })
    })
    .then(response => response.json())
    .then(data => {
        output.innerText = data.stdout || data.stderr || "Compilation error!";
    })
    .catch(err => {
        console.error("Compilation error:", err);
        output.innerText = "Compilation failed!";
    });
}

// save to local one
async function saveCode() {
    try {
        const editor = document.getElementById("editor");
        const code = editor.value;
        const handle = await window.showSaveFilePicker({
            suggestedName: "code.txt",
            types: [
                {
                    description: "Text Files",
                    accept: { "text/plain": [".txt", ".java", ".py"] },
                },
            ],
        });

        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();

        //clearing localstorage after saving
        localStorage.removeItem("savedCode");

        alert("File saved successfully and local storage cleared!");
    } catch (error) {
        console.error("Save cancelled or failed:", error);
    }
}
// Add this script to your editor.html file


let peerConnection;
let localStream;
// socket noe defined cz its already defined above
let remoteAudio = new Audio();
remoteAudio.controls = true; 
document.body.appendChild(remoteAudio); // just to check the duration of timings

// web socket to connect
function connectSocket() {
    socket.on('connect', () => {
        document.getElementById('status').textContent = 'Connected';
    });

    socket.on('offer', (offer) => {
        showIncomingCall(offer);
    });

    socket.on('answer', async (answer) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async (candidate) => {
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        endCall(); // agar dusre user disconnects
    });
}

// initiate web socket connection
async function initializePeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch((err) => console.error('Audio autoplay issue:', err));
    };
}

// start call ka kaam
async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await initializePeerConnection();
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);

        document.getElementById('startCall').disabled = true;
        document.getElementById('endCall').disabled = false;
        document.getElementById('status').textContent = 'Call in progress';
    } catch (error) {
        console.error('Error starting call:', error);
        alert('Error starting call. Please check your microphone permissions.');
    }
}

// end call ka kaam
function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    document.getElementById('startCall').disabled = false;
    document.getElementById('endCall').disabled = true;
    document.getElementById('status').textContent = 'Call ended';
    socket.emit('end-call');
}

// popup hai ye
function showIncomingCall(offer) {
    document.getElementById('incomingCall').style.display = 'block';
    document.getElementById('acceptCall').onclick = () => acceptCall(offer);
}


// agar except kiya toh
async function acceptCall(offer) {
    document.getElementById('incomingCall').style.display = 'none';
    document.getElementById('startCall').disabled = true;
    document.getElementById('endCall').disabled = false;
    document.getElementById('status').textContent = 'Call in progress';

    await initializePeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // local audio ko connection pe bheja
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        console.error("Error accessing microphone:", error);
    }
}

// call cut kiya
function rejectCall() {
    document.getElementById('incomingCall').style.display = 'none';
    endCall();
}


document.getElementById('startCall').addEventListener('click', startCall);
document.getElementById('endCall').addEventListener('click', endCall);
document.getElementById('rejectCall').addEventListener('click', rejectCall);

// initial connection
connectSocket();



//============================================= chat =============================================
//============================================= chat =============================================
//============================================= chat =============================================
//============================================= chat =============================================
//============================================= chat =============================================

// DOM elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages-container');
const usersList = document.getElementById('users-list');
const typingIndicator = document.getElementById('typing-indicator');

let username = '';
let typingTimeout = null;

// join chat btn
joinButton.addEventListener('click', () => {
  username = usernameInput.value.trim();
  if (username) {
    socket.emit('join', username);
    loginScreen.style.display = 'none';
    chatScreen.style.display = 'grid';
    
    // phocussss on msgbtn
    messageInput.focus();
  }
});

// enter key se join
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinButton.click();
  }
});

// sendingggggggg
const sendMessage = () => {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('sendMessage', message);
    messageInput.value = '';
    
    // clear typing indicator
    socket.emit('typing', false);
  }
};

sendButton.addEventListener('click', sendMessage);

// enter se send (msg)
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// typing indicator
messageInput.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  socket.emit('typing', true);
  
  typingTimeout = setTimeout(() => {
    socket.emit('typing', false);
  }, 2000);
});

// socket ka kaam
socket.on('message', (message) => {
  const messageElement = document.createElement('div');
  const messageInfo = document.createElement('div');
  messageInfo.className = 'message-info';
  messageInfo.textContent = message.user;
  
  messageElement.appendChild(messageInfo);
  
  const messageText = document.createElement('div');
  messageText.textContent = message.text;
  messageElement.appendChild(messageText);
  
  if (message.user === 'System') {
    messageElement.className = 'message system-message';
  } else if (message.user === username) {
    messageElement.className = 'message user-message';
  } else {
    messageElement.className = 'message other-message';
  }
  
  messagesContainer.appendChild(messageElement);
  
  // automatic scroll hone chahiye chat msgs
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});


// list dikhana padega
socket.on('usersList', (users) => {
  usersList.innerHTML = '';
  users.forEach(user => {
    const userItem = document.createElement('li');
    userItem.textContent = user;
    usersList.appendChild(userItem);
  });
});

// typing ka indicator dikhana padega
socket.on('userTyping', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.user} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});


// ===================================== Drag & Drop ===========================================
// ===================================== Drag & Drop ===========================================
// ===================================== Drag & Drop ===========================================
// ===================================== Drag & Drop ===========================================
// ===================================== Drag & Drop ===========================================
// ===================================== Drag & Drop ===========================================

const fileDropArea = document.getElementById('file-drop-area');
const fileInput = document.getElementById('file-input');

  // prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  fileDropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// uske upar aye toh blue hoga
['dragenter', 'dragover'].forEach(eventName => {
  fileDropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  fileDropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  fileDropArea.classList.add('highlight');
}

function unhighlight() {
  fileDropArea.classList.remove('highlight');
}

// Handle dropped files
fileDropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFiles, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files: files } });
}

function handleFiles(e) {
  const files = e.target.files;
  if (files.length) {
    const file = files[0];
    readFileContent(file);
  }
}
  
function readFileContent(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const content = e.target.result;
    editor.value = content;
    //scroll to text section jan bujke (ni chahiye filhal)
    //fileDropArea.scrollIntoView({ behavior: 'smooth' });
  };
  
  reader.onerror = function() {
    editor.value = 'Error reading file: ' + file.name;
  };
  
  reader.readAsText(file);
}                         
// Version COntrol -----------------------

document.getElementById('commitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusDiv = document.getElementById('commit_status');
    statusDiv.innerHTML = 'Processing...';

    const formData = {
        personalAccessToken: document.getElementById('personalAccessToken').value,
        repoOwner: document.getElementById('repoOwner').value,
        repoName: document.getElementById('repoName').value,
        filePath: document.getElementById('filePath').value,
        commitMessage: document.getElementById('commitMessage').value,
        fileContent: editor.value
    };

    try {
        const response = await fetch('/commit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = 'Commit successful!';
            statusDiv.style.color = 'green';
        } else {
            statusDiv.innerHTML = `Commit failed: ${result.message}`;
            statusDiv.style.color = 'red';
        }
    } catch (error) {
        statusDiv.innerHTML = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
    }
});
