Here's the complete `README.md` file in proper markdown format:  

# Collaborative Code Editor

This project is a **real-time collaborative code editor** that supports:
- Collaborative - Real-time code synchronization  
- Compilaton - Multi-language code compilation (Java and Python)
- Voice chat - WebRTC-based voice calling  
- text chat - Chat box between
- Save code - File management (local)
as of 02-03-2025

## Project Structure
```
/node_modules
/public
  ├── index.html       # Frontend UI
  ├── style.css        # Styling
  ├── script.js        # Main JavaScript (WebSockets + WebRTC)
  
/server
  ├── server.js        # Node.js server
README.md              # Project documentation
package.json           # Dependencies
```

### 1 download xip file and extract

### 2️ Install dependencies (for backend)
```sh
npm install
```
### 2️ Install dependencies (for backend)
```sh
npm i socket.io express helmet http axios cors
```

### 3️ Run the server
```sh
node server.js
```

### 4 Start Ngrok in cmd (folder)
```sh
ngrok http 5000
```

 ### 5 Replace the `ngrok` link in `script.js` and `server.js`with your generated link.

## License
This project is **MIT Licensed**.
