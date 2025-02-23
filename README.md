Here's the complete `README.md` file in proper markdown format:  

```markdown
# Real-Time Collaborative Code Editor with WebRTC Calls

This project is a **real-time collaborative code editor** that supports:  
- Live code editing using WebSockets  
- Code compilation via an API  
- Peer-to-peer audio calls using WebRTC  

## 🚀 Features
✅ Real-time text synchronization  
✅ Multi-language code compilation  
✅ WebRTC-based voice calling  
✅ Simple and lightweight UI  

## 🛠️ Technologies Used
- **Frontend**: HTML, CSS, JavaScript  
- **Backend**: Node.js, Express.js, WebSockets (Socket.IO)  
- **WebRTC**: Peer-to-peer audio calling  
- **Deployment**: Ngrok for tunneling  

## 📂 Project Structure
```
/public
  ├── index.html       # Frontend UI
  ├── style.css        # Styling
  ├── script.js        # Main JavaScript (WebSockets + WebRTC)
  
/server
  ├── server.js        # Node.js server
README.md              # Project documentation
package.json           # Dependencies
```

## ⚡ Setup Instructions
### 1️ Clone the repository
```sh
git clone https://github.com/your-username/repo-name.git
cd repo-name
```

### 2️ Install dependencies (for backend)
```sh
npm install
```

### 3️ Run the server
```sh
node server.js
```

### 4 Start Ngrok (if using tunneling)
```sh
ngrok http 3000
```
- Replace the `ngrok` link in `script.js` with your generated link.

##  How It Works
###  Real-time Editing  
- Users type in the editor, and changes sync instantly across all connected users.  
- Uses **Socket.IO** for efficient real-time communication.

###  Code Compilation  
- Users can write and compile code in different programming languages.  
- Sends the code to the backend API for execution.

###  WebRTC Audio Calls  
- Users can initiate and accept peer-to-peer voice calls.  
- Uses **STUN servers** for establishing a connection.

## 🚀 Future Enhancements
-  Add video call support  
-  Enhance UI with better collaboration tools  
-  Implement authentication for user access  

## 🤝 Contributing
Contributions are welcome! Follow these steps to contribute:  
1. **Fork** the repository  
2. **Create a branch** (`feature-branch`)  
3. **Commit your changes**  
4. **Push to your branch**  
5. **Submit a Pull Request (PR)**  

## 📜 License
This project is **MIT Licensed**.
