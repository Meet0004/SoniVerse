document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.getElementById('create-button');
    const codeDisplay = document.getElementById('code-display');
    const codeValue = document.getElementById('code-value');
    const shareLink = document.getElementById('share-link');
    const enterEditor = document.getElementById('enter-editor');
    const joinCode = document.getElementById('join-code');
    const joinButton = document.getElementById('join-button');
    const errorMessage = document.getElementById('error-message');
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'invalid') {
      errorMessage.style.display = 'block';
    }
    
    // new session
    createButton.addEventListener('click', async () => {
      try {
        createButton.disabled = true;
        createButton.textContent = 'Generating...';
        
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
        alert('Please enter a valid 2-digit code');
      }
    });
    
    joinCode.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinButton.click();
      }
    });
  });
