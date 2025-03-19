document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.getElementById('create-button');
    const codeDisplay = document.getElementById('code-display');
    const codeValue = document.getElementById('code-value');
    const shareLink = document.getElementById('share-link');
    const enterEditor = document.getElementById('enter-editor');
    const joinCode = document.getElementById('join-code');
    const joinButton = document.getElementById('join-button');
    const errorMessage = document.getElementById('error-message');
    const username = document.getElementById('username');
    var DP = document.getElementById('displayPicture');

    // boys = ['/dp/boy1.jpg', '/dp/boy2.jpg'];
    // girls = ['/dp/girl1.jpg', '/dp/girl2.jpg', '/dp/girl3.jpg'];
    const languages = ['/dp/1.png', '/dp/2.png', '/dp/3.png', '/dp/4.png', '/dp/6.png', '/dp/7.png',
        '/dp/8.png', '/dp/9.png', '/dp/11.png', '/dp/12.jpg', '/dp/13.png', '/dp/21.png',
        '/dp/15.png', '/dp/16.png', '/dp/17.png', '/dp/18.png', '/dp/19.png', '/dp/20.png'];
    
    function updateDP(){
        localStorage.setItem('mydp',DP.src)
    }
    document.getElementById('male').addEventListener('click', () => {
        var number = Math.floor(Math.random() * languages.length);
        DP.src = languages[number];
        updateDP();
    });
    
    document.getElementById('female').addEventListener('click', () => {
        var number = Math.floor(Math.random() * languages.length);
        DP.src = languages[number];
        updateDP();
    });

    
                          
    // caputing the input and setting it in localstorage as 'myName'
    username.addEventListener('input', () => {
        localStorage.setItem('myName', username.value);
    });
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'invalid') {
      errorMessage.style.display = 'block';
    }
    
    // new session
    createButton.addEventListener('click', async () => {
      try {
        createButton.disabled = true;
        createButton.textContent = 'Generating...';
        if(username.value === '') {
          alert('Please enter a Username');
          return;
        }
        const response = await fetch('/generate-session');
        const data = await response.json();
        
        if (data.sessionCode) {
          codeValue.textContent = data.sessionCode;
          const editorUrl = `${window.location.origin}/editor/${data.sessionCode}`;
          shareLink.textContent = editorUrl;
          codeDisplay.style.display = 'block';
          
          enterEditor.addEventListener('click', () => {
            window.location.href = editorUrl;
          });
        }
      } catch (error) {
        console.error('Error generating session:', error);
        alert('Failed to generate session. Please try again.');
      } finally {
        createButton.disabled = false;
        createButton.textContent = 'Generate New Session';
      }
    });
    
    joinButton.addEventListener('click', () => {
      const code = joinCode.value.trim();
      if (code && code.length === 2 && !isNaN(code)) {
        window.location.href = `/editor/${code}`;
      } else {
        alert('Please enter a valid username and 2-digit code');
      }
    });
    
    joinCode.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinButton.click();
      }
    });
  });
