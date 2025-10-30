// Drag to resize sidebar
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= 300 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
});

// Open chat
function openChat(userName) {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatWindow = document.getElementById('chatWindow');
    const chatUserName = document.getElementById('chatUserName');
    
    welcomeScreen.style.display = 'none';
    chatWindow.style.display = 'flex';
    chatUserName.textContent = userName;
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.chat-item').classList.add('active');
}

// Send message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message) {
        const messagesArea = document.querySelector('.messages-area');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        input.value = '';
        
        // Send via P2P if connected
        if (connection && connection.open) {
            connection.send(message);
        }
    }
}

document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function openProfile() {
    document.getElementById('profilePanel').classList.add('active');
}

function closeProfile() {
    document.getElementById('profilePanel').classList.remove('active');
}

document.querySelector('.profile-avatar')?.addEventListener('click', openProfile);

function showStatus() {
    alert('Status feature - Coming soon!\n\nView and share status updates with your contacts.');
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// PeerJS - Room Code & Video/Audio Call System
let peer = null;
let connection = null;
let currentRoomCode = null;
let localStream = null;
let remoteStream = null;
let currentCall = null;
let remotePeerId = null;

function toggleFabMenu() {
    document.getElementById('roomModal').classList.add('active');
}

function closeRoomModal() {
    document.getElementById('roomModal').classList.remove('active');
    document.getElementById('createView').style.display = 'none';
    document.getElementById('joinView').style.display = 'none';
    document.querySelector('.modal-options').style.display = 'grid';
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createRoom() {
    currentRoomCode = generateRoomCode();
    document.querySelector('.modal-options').style.display = 'none';
    document.getElementById('createView').style.display = 'block';
    document.getElementById('roomCodeDisplay').textContent = currentRoomCode;
    
    peer = new Peer(currentRoomCode);
    
    peer.on('open', (id) => {
        console.log('Room created with ID:', id);
    });
    
    peer.on('connection', (conn) => {
        connection = conn;
        remotePeerId = conn.peer;
        document.getElementById('waitingText').textContent = 'Connected! 🎉';
        
        conn.on('data', (data) => {
            receiveMessage(data);
        });
        
        setTimeout(() => {
            closeRoomModal();
            openChat('Anonymous User');
        }, 1500);
    });
    
    // Handle incoming calls
    peer.on('call', (call) => {
        handleIncomingCall(call);
    });
}

function showJoinRoom() {
    document.querySelector('.modal-options').style.display = 'none';
    document.getElementById('joinView').style.display = 'block';
}

function joinRoom() {
    const code = document.getElementById('joinCodeInput').value.toUpperCase().trim();
    
    if (code.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }
    
    peer = new Peer();
    
    peer.on('open', () => {
        connection = peer.connect(code);
        remotePeerId = code;
        
        connection.on('open', () => {
            alert('Connected successfully! 🎉');
            closeRoomModal();
            openChat('Anonymous User');
        });
        
        connection.on('data', (data) => {
            receiveMessage(data);
        });
        
        connection.on('error', (err) => {
            alert('Failed to connect. Please check the room code.');
        });
    });
    
    // Handle incoming calls
    peer.on('call', (call) => {
        handleIncomingCall(call);
    });
}

function backToOptions() {
    document.getElementById('joinView').style.display = 'none';
    document.getElementById('createView').style.display = 'none';
    document.querySelector('.modal-options').style.display = 'grid';
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode);
    alert('Room code copied to clipboard!');
}

function shareLink() {
    const link = `${window.location.origin}?room=${currentRoomCode}`;
    navigator.clipboard.writeText(link);
    alert('Share link copied to clipboard!');
}

function receiveMessage(data) {
    const messagesArea = document.querySelector('.messages-area');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';
    
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${data}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Video Call Function
async function startVideoCall() {
    if (!peer || !remotePeerId) {
        alert('Please connect to a room first!');
        return;
    }
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        currentCall = peer.call(remotePeerId, localStream);
        
        currentCall.on('stream', (stream) => {
            remoteStream = stream;
            showVideoUI(localStream, remoteStream);
        });
        
        currentCall.on('close', () => {
            endCall();
        });
        
    } catch (err) {
        alert('Camera/microphone access denied. Please allow permissions.');
        console.error(err);
    }
}

// Audio Call Function
async function startAudioCall() {
    if (!peer || !remotePeerId) {
        alert('Please connect to a room first!');
        return;
    }
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        
        currentCall = peer.call(remotePeerId, localStream);
        
        currentCall.on('stream', (stream) => {
            remoteStream = stream;
            showAudioUI(stream);
        });
        
        currentCall.on('close', () => {
            endCall();
        });
        
    } catch (err) {
        alert('Microphone access denied. Please allow permissions.');
        console.error(err);
    }
}

// Handle Incoming Calls
async function handleIncomingCall(call) {
    const accept = confirm('Incoming call! Accept?');
    
    if (accept) {
        try {
            const hasVideo = call.metadata?.video !== false;
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: hasVideo, 
                audio: true 
            });
            
            call.answer(localStream);
            currentCall = call;
            
            call.on('stream', (stream) => {
                remoteStream = stream;
                if (hasVideo) {
                    showVideoUI(localStream, remoteStream);
                } else {
                    showAudioUI(stream);
                }
            });
            
            call.on('close', () => {
                endCall();
            });
            
        } catch (err) {
            alert('Failed to access camera/microphone');
            call.close();
        }
    } else {
        call.close();
    }
}

// Show Video UI
function showVideoUI(local, remote) {
    const messagesArea = document.querySelector('.messages-area');
    
    let videoContainer = document.getElementById('videoCallContainer');
    if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.id = 'videoCallContainer';
        videoContainer.className = 'video-call-container';
        videoContainer.innerHTML = `
            <video id="remoteVideo" autoplay playsinline></video>
            <video id="localVideo" autoplay muted playsinline></video>
            <div class="call-controls">
                <button class="call-btn end-call" onclick="endCall()">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                    </svg>
                </button>
            </div>
        `;
        messagesArea.appendChild(videoContainer);
    }
    
    document.getElementById('localVideo').srcObject = local;
    document.getElementById('remoteVideo').srcObject = remote;
}

// Show Audio UI
function showAudioUI(stream) {
    const messagesArea = document.querySelector('.messages-area');
    
    let audioContainer = document.getElementById('audioCallContainer');
    if (!audioContainer) {
        audioContainer = document.createElement('div');
        audioContainer.id = 'audioCallContainer';
        audioContainer.className = 'audio-call-container';
        audioContainer.innerHTML = `
            <div class="audio-call-info">
                <div class="audio-avatar">📞</div>
                <p>Voice Call in Progress</p>
                <button class="call-btn end-call" onclick="endCall()">End Call</button>
            </div>
            <audio id="remoteAudio" autoplay></audio>
        `;
        messagesArea.appendChild(audioContainer);
    }
    
    document.getElementById('remoteAudio').srcObject = stream;
}

// End Call
function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    
    const videoContainer = document.getElementById('videoCallContainer');
    const audioContainer = document.getElementById('audioCallContainer');
    
    if (videoContainer) videoContainer.remove();
    if (audioContainer) audioContainer.remove();
}

// Check for room code in URL
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        document.getElementById('joinCodeInput').value = roomCode;
        toggleFabMenu();
        showJoinRoom();
    }
});
