const socket = io();
const ngrokLink = socket;

const editor = document.getElementById("editor");
const enteredData = document.getElementById("input");
const output = document.getElementById("output");
let language = document.getElementById("language");
const extension = document.getElementById("extension");
// username 
const myName = localStorage.getItem('myName');
document.getElementById('myName').value = myName
document.getElementById('username-input').value = myName;


// Load saved DP from localStorage
const DP = document.getElementById('displayPicture');
const savedDp = localStorage.getItem('mydp');
if (savedDp) {
    DP.src = savedDp;
}
console.log("Name: " + myName + " | My DP: " + DP.src);

//********************************** Collab **********************************
//********************************** Collab **********************************
//********************************** Collab **********************************
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


//********************************** Header details **********************************
//********************************** Header details **********************************
//********************************** Header details **********************************

let isUpdating = false;
const statusElem = document.getElementById('connection-status');
const usersCountElem = document.getElementById('users-count');
const sessionCodeElem = document.getElementById('session-code');
const copyLinkBtn = document.getElementById('copy-link');
const copiedMessage = document.getElementById('copied-message');

// get session code from URL
const path = window.location.pathname;
const sessionCode = path.split('/').pop();

// session codeeee
sessionCodeElem.textContent = sessionCode;        // DONE

copyLinkBtn.addEventListener('click', () => {   
  const shareLink = window.location.href;
  navigator.clipboard.writeText(shareLink).then(() => {
    copiedMessage.style.opacity = '1';
    setTimeout(() => {
      copiedMessage.style.opacity = '0';
    }, 2000);
  });
});

//codemirror
// editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
//     lineNumbers: true,
//     theme: 'dracula',
//     mode: 'python',
//     indentUnit: 4,
//     tabSize: 4,
//     lineWrapping: true,
//     autofocus: true
// });


language.addEventListener('change', (e) => {    
  const lang= e.target.value;
  editor.setOption('mode', lang);
  
  // Notify other users of language change
  socket.emit('language-change', lang);
});


// join session when connected
socket.on('connect', () => {
  statusElem.textContent = 'Connected';
  statusElem.classList.remove('disconnected');
  statusElem.classList.add('connected');
  
  // join the session
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
  
  // rejoin the session
  socket.emit('join-session', sessionCode);
});
socket.on('user-count', (data) => {
  usersCountElem.textContent = `Users: ${data.count}`;
});
// detecting text changes and emit to server
editor.addEventListener("input", () => {
  socket.emit("code-update", editor.value);
});

// listen for updates from the server
socket.on("code-update", (content) => {
  if (editor.value !== content) {
      editor.value = content;
  }
});




// room ID
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get("room") || Math.random().toString(36).substr(2, 8);

// compilation
async function compileCode() {
  // Show loading state
  document.getElementById('output').innerText = "Running...";
  document.getElementById('execution-time').innerText = "Calculating...";
  
  // Record start time
  const startTime = performance.now();
  
  // Prepare data to send
  const requestData = {
    code: editor.value,
    language: language.value,
    input: enteredData.value  // Include user input
  };

  console.log("Sending data:", requestData);

  // API URL
  const apiUrl = "https://emkc.org/api/v2/piston/execute";

  try {
    // Make API request
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: requestData.language,
        version: requestData.language === "python" ? "3.10.0" : "15.0.2",
        files: [{ name: "main", content: requestData.code }],
        stdin: requestData.input
      })
    });

    // Parse response
    const data = await response.json();
    
    // Calculate execution time
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2) + " ms";

    console.log("Response data:", data);

    // Display output
    document.getElementById('output').innerText = data.run?.stdout || data.run?.stderr || "Compilation error!";
    document.getElementById('execution-time').innerText = executionTime;

  } catch (error) {
    console.error("Compilation error:", error);
    document.getElementById('output').innerText = "Compilation failed!";
    document.getElementById('execution-time').innerText = "N/A";
  }
}

//********************************** Save button **********************************
//********************************** Save button **********************************
//********************************** Save button **********************************
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
//********************************** Voice chat **********************************
//********************************** Voice chat **********************************
//********************************** Voice chat **********************************
//********************************** Voice chat **********************************

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
      const fileUpload = document.getElementById('file-upload');
      const filePreviewContainer = document.getElementById('file-preview-container');
      const audioPreviewContainer = document.getElementById('audio-preview-container');
      const progressBar = document.getElementById('file-upload-progress-bar');
      const progressContainer = document.querySelector('.file-upload-progress');
      const recordButton = document.getElementById('record-button');
      const audioTime = document.getElementById('audio-time');
      
      let username = '';
      let typingTimeout = null;
      let currentFile = null;
      let mediaRecorder = null;
      let audioChunks = [];
      let isRecording = false;
      let recordingStartTime = 0;
      let recordingTimer = null;
      let audioBlob = null;
      
      // Join chat function
      joinButton.addEventListener('click', () => {
        username = usernameInput.value.trim();
        if (username) {
          socket.emit('join', username);
          loginScreen.style.display = 'none';
          chatScreen.style.display = 'grid';
          
          // Focus on message input
          messageInput.focus();
        }
      });
      
      // Also allow pressing Enter to join
      usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          joinButton.click();
        }
      });
      
      // File upload handling
      fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          currentFile = file;
          
          // Show preview
          filePreviewContainer.innerHTML = '';
          const previewElement = document.createElement('div');
          previewElement.className = 'file-preview';
          
          const fileNameElement = document.createElement('div');
          fileNameElement.textContent = file.name;
          fileNameElement.style.flex = '1';
          
          const clearButton = document.createElement('span');
          clearButton.textContent = '✖';
          clearButton.className = 'clear-file';
          clearButton.addEventListener('click', () => {
            filePreviewContainer.innerHTML = '';
            currentFile = null;
            fileUpload.value = '';
          });
          
          previewElement.appendChild(fileNameElement);
          previewElement.appendChild(clearButton);
          filePreviewContainer.appendChild(previewElement);
          
          // If it's an image, show image preview
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = document.createElement('img');
              img.src = event.target.result;
              img.style.maxHeight = '100px';
              img.style.borderRadius = '4px';
              img.style.marginTop = '5px';
              filePreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
          }
        }
      });
      
      // Audio recording functionality
      recordButton.addEventListener('click', () => {
        if (isRecording) {
          // Stop recording
          stopRecording();
        } else {
          // Start recording
          startRecording();
        }
      });
      
      async function startRecording() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];
          
          mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
          });
          
          mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            createAudioPreview(audioBlob);
          });
          
          // Start recording
          mediaRecorder.start();
          isRecording = true;
          recordButton.classList.add('recording');
          recordButton.textContent = '⏹️';
          recordButton.title = 'Stop recording';
          
          // Start timer
          recordingStartTime = Date.now();
          updateRecordingTime();
          recordingTimer = setInterval(updateRecordingTime, 1000);
          
        } catch (error) {
          console.error('Error accessing microphone:', error);
          alert('Unable to access microphone. Please make sure you have given permission.');
        }
      }
      
      function stopRecording() {
        if (mediaRecorder && isRecording) {
          mediaRecorder.stop();
          
          // Stop all tracks in the stream
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          
          isRecording = false;
          recordButton.classList.remove('recording');
          recordButton.textContent = '🎤';
          recordButton.title = 'Record audio';
          
          // Stop timer
          clearInterval(recordingTimer);
          audioTime.textContent = '';
        }
      }
      
      function updateRecordingTime() {
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
        const seconds = (duration % 60).toString().padStart(2, '0');
        audioTime.textContent = `${minutes}:${seconds}`;
      }
      
      function createAudioPreview(blob) {
        audioBlob = blob;
        
        audioPreviewContainer.innerHTML = '';
        const previewElement = document.createElement('div');
        previewElement.className = 'audio-preview';
        
        // Create audio element for preview
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(blob);
        audio.className = 'audio-player';
        
        const clearButton = document.createElement('span');
        clearButton.textContent = '✖';
        clearButton.className = 'clear-file';
        clearButton.addEventListener('click', () => {
          audioPreviewContainer.innerHTML = '';
          audioBlob = null;
        });
        
        previewElement.appendChild(audio);
        previewElement.appendChild(clearButton);
        audioPreviewContainer.appendChild(previewElement);
      }
      
      // Upload file function
      const uploadFile = (file) => {
        return new Promise((resolve, reject) => {
          const formData = new FormData();
          formData.append('file', file);
          
          const xhr = new XMLHttpRequest();
          
          // Track upload progress
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              progressBar.style.width = percentComplete + '%';
            }
          };
          
          xhr.onloadstart = () => {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
          };
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              progressContainer.style.display = 'none';
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error('Upload failed'));
            }
          };
          
          xhr.onerror = () => {
            progressContainer.style.display = 'none';
            reject(new Error('Network error'));
          };
          
          xhr.open('POST', '/upload', true);
          xhr.send(formData);
        });
      };
      
      // Send message function
      const sendMessage = async () => {
        const message = messageInput.value.trim();
        
        try {
          // If there's a file to upload
          if (currentFile) {
            sendButton.disabled = true;
            const fileData = await uploadFile(currentFile);
            
            // Send file message
            socket.emit('sendFile', {
              filePath: fileData.filePath,
              fileType: fileData.fileType,
              originalName: fileData.originalName
            });
            
            // Clear file preview and reset
            filePreviewContainer.innerHTML = '';
            currentFile = null;
            fileUpload.value = '';
          }
          
          // If there's audio to upload
          if (audioBlob) {
            sendButton.disabled = true;
            
            // Create a File object from the Blob
            const audioFile = new File([audioBlob], 'audio-message.webm', { 
              type: audioBlob.type 
            });
            
            const audioData = await uploadFile(audioFile);
            
            // Send audio message
            socket.emit('sendFile', {
              filePath: audioData.filePath,
              fileType: 'audio',
              originalName: 'Audio Message'
            });
            
            // Clear audio preview and reset
            audioPreviewContainer.innerHTML = '';
            audioBlob = null;
          }
          
          // If there's text to send
          if (message) {
            socket.emit('sendMessage', message);
            messageInput.value = '';
          }
          
          // Stop typing indicator when sending a message
          socket.emit('typing', false);
        } catch (error) {
          console.error('Error sending message:', error);
          alert('Failed to send file or audio. Please try again.');
        } finally {
          sendButton.disabled = false;
        }
      };
      
      sendButton.addEventListener('click', sendMessage);
      
      // Also allow pressing Enter to send
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
      
      // Handle typing indicator
      messageInput.addEventListener('input', () => {
        clearTimeout(typingTimeout);
        socket.emit('typing', true);
        
        typingTimeout = setTimeout(() => {
          socket.emit('typing', false);
        }, 2000);
      });
      
      // Socket event handlers
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
        
        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
      
      // Handle file messages
      socket.on('fileMessage', (data) => {
        const messageElement = document.createElement('div');
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = data.user;
        
        messageElement.appendChild(messageInfo);
        
        if (data.user === username) {
          messageElement.className = 'message user-message';
        } else {
          messageElement.className = 'message other-message';
        }
        
        // Create file content based on type
        const fileContent = document.createElement('div');
        fileContent.className = 'file-message';
        
        if (data.fileType === 'image') {
          // Handle image
          const img = document.createElement('img');
          img.src = data.filePath;
          img.className = 'file-message-image';
          img.alt = data.originalName;
          
          const downloadLink = document.createElement('a');
          downloadLink.href = data.filePath;
          downloadLink.className = 'file-download-link';
          downloadLink.download = data.originalName;
          downloadLink.appendChild(img);
          
          fileContent.appendChild(downloadLink);
        } else if (data.fileType === 'audio') {
          // Handle audio
          const audioElement = document.createElement('div');
          audioElement.className = 'audio-message';
          
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = data.filePath;
          audio.className = 'audio-player';
          
          audioElement.appendChild(audio);
          fileContent.appendChild(audioElement);
        } else {
          // Handle other file types
          const fileElement = document.createElement('div');
          fileElement.className = 'file-message-file';
          
          const downloadLink = document.createElement('a');
          downloadLink.href = data.filePath;
          downloadLink.className = 'file-download-link';
          downloadLink.download = data.originalName;
          
          const fileIcon = document.createElement('span');
          fileIcon.className = 'file-icon';
          fileIcon.textContent = '📄';
          
          const fileName = document.createElement('span');
          fileName.textContent = data.originalName;
          
          downloadLink.appendChild(fileIcon);
          downloadLink.appendChild(fileName);
          fileElement.appendChild(downloadLink);
          fileContent.appendChild(fileElement);
        }
        
        messageElement.appendChild(fileContent);
        messagesContainer.appendChild(messageElement);
        
        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
      
      socket.on('usersList', (users) => {
        usersList.innerHTML = '';
        users.forEach(user => {
          const userItem = document.createElement('li');
          userItem.textContent = user;
          usersList.appendChild(userItem);
        });
      });
      
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

//*********************************** Version Control ***********************************
//*********************************** Version Control ***********************************
//*********************************** Version Control ***********************************
function mediumEncryptKar(message) {
  let encrypted = '';
  const shifts = [3, 5, 7];
  const xorKeys = [111, 123, 145];
  for (let i = 0; i < message.length; i++) {
      let shift = shifts[i % shifts.length];
      let xorKey = xorKeys[i % xorKeys.length];
      let shiftedChar = String.fromCharCode(message.charCodeAt(i) + shift);
      let encryptedChar = String.fromCharCode(shiftedChar.charCodeAt(0) ^ xorKey);
      encrypted += encryptedChar;
  }
  return toBase64(encrypted);
}
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function fromBase64(base64) {
  return decodeURIComponent(escape(atob(base64)));
}
function mediumDecryptKar(encryptedMessage) {
    let encrypted = fromBase64(encryptedMessage);
    let decrypted = '';
    const shifts = [3, 5, 7]; 
    const xorKeys = [111, 123, 145]; 
    for (let i = 0; i < encrypted.length; i++) {
        let shift = shifts[i % shifts.length];
        let xorKey = xorKeys[i % xorKeys.length];

        let xorDecryptedChar = String.fromCharCode(encrypted.charCodeAt(i) ^ xorKey);

        let originalChar = String.fromCharCode(xorDecryptedChar.charCodeAt(0) - shift);

        decrypted += originalChar;
    }
  return decrypted;
}

// const personalAccessToken = document.getElementById('personalAccessToken').value;
// var encryptedPersonalAccessToken = mediumEncryptKar(personalAccessToken) // encrypt kiya
// localStorage.setItem('personalAccessToken', encryptedPersonalAccessToken);  // encrypted store kiya
// var decryptedPersonalAccessToken = mediumDecryptKar(encryptedPersonalAccessToken); // decrypt kiya

// console.log("OG key: "+personalAccessToken)
// console.log("Encrypted : "+encryptedPersonalAccessToken)
// console.log("Decrypted : "+decryptedPersonalAccessToken)

document.getElementById('commitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById('commit_status');
  statusDiv.innerHTML = 'Processing...';
  statusDiv.classList.remove('hide');
  statusDiv.classList.add('show');

  const personalAccessToken = document.getElementById('personalAccessToken').value;
  const repoOwner = document.getElementById('repoOwner').value;
  const repoName = document.getElementById('repoName').value;
  const filePath = document.getElementById('filePath').value;
  const commitMessage = document.getElementById('commitMessage').value;
  
  const formData = {
      personalAccessToken,
      repoOwner,
      repoName,
      filePath,
      commitMessage,
      fileContent: editor.value
  };
  const formattedTime = new Date().toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' ' + new Date().toLocaleDateString('en-GB');

  let encryptedPersonalAccessToken = mediumEncryptKar(personalAccessToken)
  console.log(encryptedPersonalAccessToken)
  localStorage.setItem('personalAccessToken', encryptedPersonalAccessToken);
  localStorage.setItem('repoOwner', repoOwner);
  localStorage.setItem('repoName', repoName);
  localStorage.setItem('filePath', filePath);
  localStorage.setItem('commitMessage', commitMessage);
  localStorage.setItem('CommitTimings', formattedTime);
  
  document.getElementById('OwnerName').innerText = localStorage.getItem('repoOwner');
  document.getElementById('RepoName').innerText = localStorage.getItem('repoName');
  document.getElementById('FilePath').innerText = localStorage.getItem('filePath');
  document.getElementById('CommitMessage').innerText = localStorage.getItem('commitMessage');
  document.getElementById('CommitTimings').innerText = localStorage.getItem('CommitTimings');
  
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
          statusDiv.innerHTML = 'Wohoo! Commit successful!';
          statusDiv.style.color = 'green';
      } else {
          statusDiv.innerHTML = `Commit failed: ${result.message}`;
          statusDiv.style.color = 'red';
      }
      setTimeout(() => {
          statusDiv.classList.remove('show');
          statusDiv.classList.add('hide');
      }, 2500);
      setTimeout(() => {
          statusDiv.innerText = '';
      }, 3000);
  } catch (error) {
      // statusDiv.innerHTML = `Error: ${error.message}`;
      statusDiv.innerHTML = `Error: Please try again!`;
      statusDiv.style.color = 'red';
  }
});

document.getElementById('getHistory').addEventListener('click', () => {
try {
    console.log("dab rah hai");
    const elements = ['history-1', 'history-2', 'history-3'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    });

    //document.getElementById('personalAccessToken').value = mediumDecryptKar(localStorage.getItem('personalAccessToken'));
    document.getElementById('OwnerName').innerText = localStorage.getItem('repoOwner');
    document.getElementById('RepoName').innerText = localStorage.getItem('repoName');
    document.getElementById('FilePath').innerText = localStorage.getItem('filePath');
    document.getElementById('CommitMessage').innerText = localStorage.getItem('commitMessage');
    document.getElementById('CommitTimings').innerText = localStorage.getItem('CommitTimings');

} catch (error) {
    console.log(error);
}
});


document.getElementById('fill-details-btn').addEventListener('click',() =>{
    document.getElementById('personalAccessToken').value = mediumDecryptKar(localStorage.getItem('personalAccessToken'));
    document.getElementById('repoOwner').value = document.getElementById('OwnerName').innerText;
    document.getElementById('repoName').value = document.getElementById('RepoName').innerText;
    document.getElementById('filePath').value = document.getElementById('FilePath').innerText;
    document.getElementById('commitMessage').value = document.getElementById('CommitMessage').innerText;
});

document.getElementById('refresh-vcdetails').addEventListener('click', () => {
    document.getElementById('personalAccessToken').value = '';
    document.getElementById('repoOwner').value  = '';
    document.getElementById('repoName').value = '';
    document.getElementById('filePath').value = '';
    document.getElementById('commitMessage').value = '';
});
