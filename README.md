Here's the complete `README.md` file in proper markdown format:  

# Real-Time Collaborative Code Editor with WebRTC Calls

This project is a **real-time collaborative code editor** that supports:  
- Live code editing using WebSockets  
- Code compilation via an API  
- Peer-to-peer audio calls using WebRTC  

## 🚀 Features
- Real-time text synchronization  
- Multi-language code compilation  
- WebRTC-based voice calling  
- Simple and lightweight UI  

## 🛠️ Technologies Used
- **Frontend**: HTML, CSS, JavaScript  
- **Backend**: Node.js, Express.js, WebSockets (Socket.IO)  
- **WebRTC**: Peer-to-peer audio calling  
- **Deployment**: Ngrok for tunneling  

## 📂 Project Structure
/public
  ├── index.html       # Frontend UI
  ├── style.css        # Styling
  ├── script.js        # Main JavaScript (WebSockets + WebRTC)
  
/server
  ├── server.js        # Node.js server
README.md              # Project documentation
package.json           # Dependencies


### 1 download xip file and extract

### 2️ Install dependencies (for backend)
```sh
npm i socket.io express helmet http axios cors
```
### 2️ Install dependencies (for backend)
```sh
npm i socket.io express helmet http axios cors
```

### 3️ Run the server
```sh
node server.js
```

### 4 Start Ngrok (if using tunneling)
```sh
ngrok http 5000
```
- Replace the `ngrok` link in `script.js` and `server.js`with your generated link.

## License
This project is **MIT Licensed**.
