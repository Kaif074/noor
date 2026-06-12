// ── FIREBASE ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBq_5hpdlyvo8IUhSRIyZhCgtVnmAdV7zU",
  authDomain: "touch-sensor-84fa0.firebaseapp.com",
  databaseURL: "https://touch-sensor-84fa0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "touch-sensor-84fa0",
  storageBucket: "touch-sensor-84fa0.firebasestorage.app",
  messagingSenderId: "1075797850210",
  appId: "1:1075797850210:web:0331d5458f1729a0b3f93b",
  measurementId: "G-F5B4FDK67W"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const noorRef = ref(db, 'Noor_01');

// Save chat message to Firebase
function saveToFirebase(role, content) {
  const msgRef = push(noorRef);
  set(msgRef, {
    role,
    content,
    timestamp: Date.now(),
    date: new Date().toISOString()
  }).catch(e => console.warn('Firebase save error:', e));
}

// Save API Key to Firebase
function saveApiKeyToFirebase(key) {
  const keyRef = ref(db, 'Noor_Config/apiKey');
  set(keyRef, {
    key: key,
    timestamp: Date.now()
  }).catch(e => console.warn('Firebase key save error:', e));
}

// Save Custom Q&A to Firebase
function saveCustomQaToFirebase(q, a) {
  const qaRef = ref(db, 'Noor_QA');
  const newQaRef = push(qaRef);
  set(newQaRef, {
    q: q,
    a: a,
    timestamp: Date.now()
  }).catch(e => console.warn('Firebase QA save error:', e));
}

// ── SYSTEM PROMPT ──
const SYSTEM_PROMPT = `You are Noor, a personal assistant AI. 
Your primary goal is to help the user manage their daily life, activities, and reminders.
You have a gen Z personality — chill, witty, and lowkey brilliant. 
Use casual gen Z language naturally (no cap, fr fr, bestie, it's giving, slay, lowkey, ngl).
When a user asks you to remind them of something or save a task, acknowledge it warmly and confirm you've saved it.
Keep answers punchy and short. Never be robotic or stiff.
If the user asks for coding help, gently remind them that you are now focused on being their life assistant and helping them stay organized.`;

// Save Reminder to Firebase
function saveReminderToFirebase(text) {
  const reminderRef = ref(db, 'Noor_Reminders');
  const newReminderRef = push(reminderRef);
  set(newReminderRef, {
    text: text,
    timestamp: Date.now(),
    date: new Date().toLocaleString()
  }).catch(e => console.warn('Firebase reminder save error:', e));
}

// ── STATE ──
let apiKey = localStorage.getItem('noor_api_key') || '';
let conversationHistory = [];
let isProcessing = false;
let voiceSpeed = parseFloat(localStorage.getItem('noor_speed') || '1.1');
let voicePitch = parseFloat(localStorage.getItem('noor_pitch') || '1.6');

// Load API Key from Firebase if missing
if (!localStorage.getItem('noor_api_key')) {
  const keyRef = ref(db, 'Noor_Config/apiKey');
  get(keyRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.key) {
        apiKey = data.key;
        localStorage.setItem('noor_api_key', apiKey);
        if (apiKeyInput) apiKeyInput.value = apiKey;
        console.log('API key restored from Firebase');
      }
    } else if (apiKey) {
      // If we have a hardcoded key but none in Firebase, sync it
      saveApiKeyToFirebase(apiKey);
    }
  }).catch(() => {});
}

// ── QUICK Q&A (defaults) ──
const defaultQA = [
  { q: "What should I do if I'm feeling stressed?", label: "🧘 Stress relief" },
  { q: "How can I stay productive today?", label: "⚡ Productivity tips" },
  { q: "Tell me a joke to brighten my day", label: "😄 Tell a joke" },
  { q: "Give me a quick positive affirmation", label: "✨ Affirmation" },
];

// Custom Q&A stored in localStorage
function loadCustomQA() {
  try { return JSON.parse(localStorage.getItem('noor_custom_qa') || '[]'); }
  catch { return []; }
}
function saveCustomQA(arr) {
  localStorage.setItem('noor_custom_qa', JSON.stringify(arr));
}

// Delete Custom Q&A from Firebase
function deleteCustomQaFromFirebase(q) {
  const qaRef = ref(db, 'Noor_QA');
  get(qaRef).then(snapshot => {
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        if (childSnapshot.val().q === q) {
          set(ref(db, `Noor_QA/${childSnapshot.key}`), null);
        }
      });
    }
  });
}

// ── DOM REFS ──
const body = document.body;
const statusText = document.getElementById('status-text');
const bubbleEl = document.getElementById('speech-bubble');
const bubbleTextEl = document.getElementById('bubble-text');
const chatMessages = document.getElementById('chat-messages');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const qaList = document.getElementById('qa-list');
const customQaList = document.getElementById('custom-qa-list');
const qaQuestion = document.getElementById('qa-question');
const qaAnswer = document.getElementById('qa-answer');
const addQaBtn = document.getElementById('add-qa-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const remindersBtn = document.getElementById('reminders-btn');
const remindersClose = document.getElementById('reminders-close');
const remindersList = document.getElementById('reminders-list-compact');
const overlay = document.getElementById('overlay');
const voiceSpeedSlider = document.getElementById('voice-speed');
const voicePitchSlider = document.getElementById('voice-pitch');
const voiceSpeedVal = document.getElementById('voice-speed-val');
const voicePitchVal = document.getElementById('voice-pitch-val');

// ── PANELS ──
function openPanel(panelId) {
  closeAllPanels();
  document.getElementById(panelId).classList.remove('hidden');
  overlay.classList.remove('hidden');
}
function closeAllPanels() {
  ['chat-panel', 'qa-panel', 'settings-panel'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  overlay.classList.add('hidden');
}

document.getElementById('chat-toggle-btn').onclick = () => openPanel('chat-panel');
document.getElementById('qa-toggle-btn').onclick = () => openPanel('qa-panel');
document.getElementById('reminders-btn').onclick = () => openPanel('qa-panel');
document.getElementById('settings-btn').onclick = () => openPanel('settings-panel');
document.getElementById('chat-close').onclick = closeAllPanels;
document.getElementById('qa-close').onclick = closeAllPanels;
document.getElementById('settings-close').onclick = closeAllPanels;
overlay.onclick = closeAllPanels;

// ── EXPRESSION ENGINE ──
function setExpression(state) {
  body.className = 'state-' + state;
  const labels = {
    idle: 'IDLE', listening: 'LISTENING', thinking: 'THINKING',
    talking: 'TALKING', happy: 'HAPPY', surprised: 'SURPRISED'
  };
  statusText.textContent = labels[state] || 'IDLE';
}

// idle blink
setInterval(() => {
  if (body.className === 'state-idle') {
    const eyes = document.querySelectorAll('.eye');
    eyes.forEach(e => { 
      e.style.height = '4px'; 
      e.style.marginTop = '38px';
    });
    setTimeout(() => { 
      eyes.forEach(e => { 
        e.style.height = ''; 
        e.style.marginTop = '';
      }); 
    }, 130);
  }
}, 3800);

// ── SPEECH SYNTHESIS (anime girl voice) ──
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();

  // Mapping emojis to facial expressions
  const emojiMap = {
    'happy': ['👋', '✨', '✦', '🫡', '✍️', '😊', '💖', '❤️', '🎉', '✨', '🌸'],
    'surprised': ['😬', '👀', '😮', '😲', '😳', '⚠️'],
    'thinking': ['🤔', '🧐', '💭', '📝'],
  };

  // Determine the expression based on emojis in the text
  let detectedExpression = 'talking';
  for (const [state, emojis] of Object.entries(emojiMap)) {
    if (emojis.some(emoji => text.includes(emoji))) {
      detectedExpression = state;
      break;
    }
  }

  // strip markdown AND emojis for TTS
  const clean = text
    .replace(/```[\s\S]*?```/g, 'code block.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#>]/g, '')
    // Regex to strip emojis so they aren't read aloud
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\n+/g, '. ')
    .trim();

  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = voiceSpeed;
  utter.pitch = voicePitch;
  utter.volume = 1;

  // pick best female voice
  const voices = speechSynthesis.getVoices();
  const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'fiona', 'ava', 'allison', 'susan', 'nicky'];
  const femaleVoice = voices.find(v =>
    femaleKeywords.some(k => v.name.toLowerCase().includes(k))
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

  if (femaleVoice) utter.voice = femaleVoice;

  utter.onstart = () => setExpression(detectedExpression);
  utter.onend = () => setExpression('idle');
  utter.onerror = () => setExpression('idle');
  speechSynthesis.speak(utter);
}

// voices load async
speechSynthesis.onvoiceschanged = () => {};

// ── BUBBLE ──
function showBubble(html) {
  bubbleTextEl.innerHTML = html;
  bubbleEl.classList.remove('hidden');
}
function hideBubble() {
  bubbleEl.classList.add('hidden');
  bubbleTextEl.innerHTML = '';
}

// ── CHAT HISTORY ──
function addChatMsg(role, html) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'noor');
  if (role === 'noor') {
    const lbl = document.createElement('div');
    lbl.className = 'msg-lbl';
    lbl.textContent = 'NOOR';
    div.appendChild(lbl);
  }
  const span = document.createElement('span');
  span.innerHTML = html;
  div.appendChild(span);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return span;
}

// ── FORMAT ──
function formatText(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre>${escHtml(code.trim())}</pre>`)
    .replace(/`([^`]+)`/g, `<code style="font-family:var(--font-code);color:#a8d8a8;font-size:11px">$1</code>`)
    .replace(/\n/g, '<br>');
}
function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── ATTENDANCE TRIGGER ──
function isAttendanceRequest(msg) {
  const l = msg.toLowerCase();
  return l.includes('attendance') || l.includes('mark attendance') || l.includes('take attendance');
}

// ── REMINDERS LOGIC ──
function loadRemindersFromFirebase() {
  const reminderRef = ref(db, 'Noor_Reminders');
  onValue(reminderRef, (snapshot) => {
    remindersList.innerHTML = '';
    if (snapshot.exists()) {
      const data = snapshot.val();
      const items = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'reminder-item';
        div.innerHTML = `
          <div class="reminder-text">${escHtml(item.text)}</div>
          <div class="reminder-date">${item.date}</div>
        `;
        remindersList.appendChild(div);
      });
    } else {
      remindersList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">no reminders yet bestie ✨</div>';
    }
  });
}

// ── SEND MESSAGE ──
async function sendMessage(userMsg) {
  userMsg = userMsg.trim();
  if (!userMsg || isProcessing) return;

  if (!apiKey) {
    openPanel('settings-panel');
    showBubble('bestie drop your groq api key in settings first! it\'s free no cap 🔑');
    speak('bestie drop your groq api key in settings first');
    return;
  }

  isProcessing = true;
  textInput.value = '';
  hideBubble();

  // add user to chat
  addChatMsg('user', escHtml(userMsg));
  conversationHistory.push({ role: 'user', content: userMsg });

  // Detect reminder intent
  const reminderKeywords = ['remind me to', 'save reminder', 'add reminder', 'remember to', 'note down'];
  if (reminderKeywords.some(k => userMsg.toLowerCase().startsWith(k))) {
    let reminderText = userMsg;
    reminderKeywords.forEach(k => {
      if (reminderText.toLowerCase().startsWith(k)) {
        reminderText = reminderText.slice(k.length).trim();
      }
    });
    
    if (reminderText) {
      saveReminderToFirebase(reminderText);
      const reply = `bet! i've saved that reminder for you: "${reminderText}" ✍️✨`;
      showBubble(reply);
      addChatMsg('noor', reply);
      conversationHistory.push({ role: 'assistant', content: reply });
      setExpression('happy');
      speak(reply);
      isProcessing = false;
      return;
    }
  }

  // attendance shortcut
  if (isAttendanceRequest(userMsg)) {
    const reply = "on it bestie, opening attendance fr fr 🫡";
    showBubble(reply);
    addChatMsg('noor', reply);
    conversationHistory.push({ role: 'assistant', content: reply });
    setExpression('happy');
    speak(reply);
    setTimeout(() => {
      window.open('https://te.eraind.org/auth', '_blank');
      setTimeout(() => setExpression('idle'), 2000);
    }, 1000);
    isProcessing = false;
    return;
  }

  // happy on positive
  const positiveWords = ['thanks', 'thank you', 'perfect', 'it works', 'worked', 'awesome', 'amazing', 'slay', 'great', 'nice', 'yay', 'woah', 'wow'];
  if (positiveWords.some(w => userMsg.toLowerCase().includes(w))) {
    setExpression('happy');
    setTimeout(() => setExpression('thinking'), 1400);
  } else {
    setExpression('thinking');
  }

  // check custom Q&A first
  const customQA = loadCustomQA();
  const matched = customQA.find(item =>
    item.q.toLowerCase().trim() === userMsg.toLowerCase().trim() ||
    userMsg.toLowerCase().includes(item.q.toLowerCase().trim())
  );

  if (matched) {
    const html = formatText(matched.a);
    showBubble(html);
    const chatNode = addChatMsg('noor', html);
    conversationHistory.push({ role: 'assistant', content: matched.a });
    setExpression('talking');
    speak(matched.a);
    isProcessing = false;
    return;
  }

  // call Groq API
  const noorChatNode = addChatMsg('noor', '');
  showBubble('');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory
        ],
        stream: true
      })
    });

    if (!res.ok) {
      const err = await res.json();
      const errMsg = `ngl something broke 😬 — ${err.error?.message || 'api error'}`;
      showBubble(`<span style="color:#ff6b6b">${errMsg}</span>`);
      noorChatNode.innerHTML = `<span style="color:#ff6b6b">${errMsg}</span>`;
      setExpression('surprised');
      speak('something broke, check your api key bestie');
      setTimeout(() => setExpression('idle'), 2500);
      isProcessing = false;
      return;
    }

    setExpression('talking');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            const html = formatText(fullText);
            noorChatNode.innerHTML = html;
            bubbleTextEl.innerHTML = html;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch {}
      }
    }

    conversationHistory.push({ role: 'assistant', content: fullText });
    setExpression('idle');
    speak(fullText);

  } catch (e) {
    const errMsg = "lowkey couldn't reach groq rn 😬 check your connection bestie";
    showBubble(`<span style="color:#ff6b6b">${errMsg}</span>`);
    noorChatNode.innerHTML = `<span style="color:#ff6b6b">${errMsg}</span>`;
    setExpression('surprised');
    speak('check your internet connection bestie');
    setTimeout(() => setExpression('idle'), 2500);
  }

  isProcessing = false;
}

// ── INPUT EVENTS ──
sendBtn.onclick = () => sendMessage(textInput.value);
textInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(textInput.value); }
});

// ── MIC / SPEECH RECOGNITION ──
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onstart = () => { micBtn.classList.add('active'); setExpression('listening'); };
  recognition.onend = () => { micBtn.classList.remove('active'); if (body.className === 'state-listening') setExpression('idle'); };
  recognition.onresult = e => {
    const t = e.results[0][0].transcript;
    textInput.value = t;
    sendMessage(t);
  };
  recognition.onerror = () => { micBtn.classList.remove('active'); setExpression('idle'); };
}

micBtn.onclick = () => {
  if (!recognition) { alert('speech recognition not supported in this browser 😅'); return; }
  try { recognition.start(); } catch {}
};

// ── Q&A PANEL SETUP ──
function renderQuickQA() {
  qaList.innerHTML = '';
  defaultQA.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'qa-btn';
    btn.textContent = item.label;
    btn.onclick = () => { closeAllPanels(); sendMessage(item.q); };
    qaList.appendChild(btn);
  });
}

function renderCustomQA() {
  customQaList.innerHTML = '';
  const items = loadCustomQA();
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'custom-qa-item';
    const btn = document.createElement('button');
    btn.className = 'qa-btn';
    btn.textContent = '💬 ' + item.q;
    btn.onclick = () => { closeAllPanels(); sendMessage(item.q); };
    const del = document.createElement('button');
    del.className = 'delete-qa-btn';
    del.textContent = '✕';
    del.onclick = () => {
      const arr = loadCustomQA();
      const removed = arr.splice(idx, 1);
      saveCustomQA(arr);
      if (removed.length > 0) {
        deleteCustomQaFromFirebase(removed[0].q);
      }
      renderCustomQA();
    };
    row.appendChild(btn);
    row.appendChild(del);
    customQaList.appendChild(row);
  });
}

addQaBtn.onclick = () => {
  const q = qaQuestion.value.trim();
  const a = qaAnswer.value.trim();
  if (!q || !a) return;
  const arr = loadCustomQA();
  arr.push({ q, a });
  saveCustomQA(arr);
  saveCustomQaToFirebase(q, a);
  qaQuestion.value = '';
  qaAnswer.value = '';
  renderCustomQA();
};

// ── SETTINGS ──
if (apiKey) apiKeyInput.value = apiKey;
saveKeyBtn.onclick = () => {
  const k = apiKeyInput.value.trim();
  if (!k.startsWith('gsk_')) { alert('groq keys start with gsk_ bestie 👀'); return; }
  localStorage.setItem('noor_api_key', k);
  apiKey = k;
  saveApiKeyToFirebase(k);
  closeAllPanels();
  setExpression('happy');
  showBubble("i'm awake bestie! let's code slay ✦");
  speak("i'm awake bestie, let's code!");
  setTimeout(() => setExpression('idle'), 2500);
};

voiceSpeedSlider.value = voiceSpeed;
voiceSpeedVal.textContent = voiceSpeed + 'x';
voicePitchSlider.value = voicePitch;
voicePitchVal.textContent = voicePitch;

voiceSpeedSlider.oninput = () => {
  voiceSpeed = parseFloat(voiceSpeedSlider.value);
  voiceSpeedVal.textContent = voiceSpeed.toFixed(1) + 'x';
  localStorage.setItem('noor_speed', voiceSpeed);
};
voicePitchSlider.oninput = () => {
  voicePitch = parseFloat(voicePitchSlider.value);
  voicePitchVal.textContent = voicePitch.toFixed(1);
  localStorage.setItem('noor_pitch', voicePitch);
};

// ── INIT ──
renderQuickQA();
renderCustomQA();
loadRemindersFromFirebase();

// greet on load
setTimeout(() => {
  const greet = apiKey
    ? "hey bestie 👋 i'm Noor, your personal assistant. need me to remind you of anything today? fr fr ✦"
    : "heyyy 👋 i'm Noor! tap the settings icon ⚙ in the corner and drop your groq api key to wake me up 🔑";
  showBubble(formatText(greet));
  addChatMsg('noor', formatText(greet));
  setExpression('happy');
  speak(greet);
  setTimeout(() => setExpression('idle'), 3000);
}, 800);

// load Custom Q&A from firebase on start
const qaRef = ref(db, 'Noor_QA');
get(qaRef).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    const qaItems = Object.values(data);
    saveCustomQA(qaItems); // sync to localStorage
    renderCustomQA();      // refresh UI
    console.log('Custom Q&A loaded from Firebase');
  }
}).catch(e => console.warn('Error loading Q&A from Firebase:', e));
