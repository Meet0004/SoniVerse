const ngrokLink = 'https://2aa0-160-22-87-2.ngrok-free.app';
const socket = io(`${ngrokLink}/`);
const editor = document.getElementById("editor");
const output = document.getElementById("output");
const language = document.getElementById("language");

socket.on("load_text", (data) => {  //load initial text
    editor.value = data;
});

socket.on("text_change", (data) => {    //listening real-time text changes
    editor.value = data;
});

editor.addEventListener("input", () => {  //text update to server
    socket.emit("text_change", editor.value);
});

function compileCode() {
    fetch(`${ngrokLink}/compile`, {
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
