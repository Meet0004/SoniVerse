Here's the complete `README.md` file in proper markdown format:  

# Collaborative Code Editor

This project is a **real-time collaborative code editor** that supports:
- Collaborative - Real-time code synchronization
- Mutli-user rooms - with roomID
- Compilaton - Multi-language code compilation (Java and Python)
- Voice chat - WebRTC-based voice calling  
- text chat - Chat box between
- Save code - File management (local)
as of 03-03-2025

## Project Structure
```
/node_modules
/public
  ├── css
  │   ├── editor.css  
  │   ├── home.css  
  ├── js       
  │   ├── editor.js
  │   ├── home.js  
  ├── editor.html
  ├── home.html
/session               # Added session folder for managing user sessions
/server.js            # Node.js server
README.md             # Project documentation
package.json          # Dependencies
package-lock.json
```

### 1 download xip file and extract

### 2️ Install dependencies (for backend)
```sh
npm install
```
### 2️ Install dependencies (for backend)
```sh
npm i express http socket.io cors axios helmet ngrok fs path nodemon
```

### 3️ Run the server
```sh
node server.js
```
### 4 collabration link will be in console

## License
This project is **MIT Licensed**.
