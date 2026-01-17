// إنشاء أو استرجاع هوية المستخدم الفريدة للجلسة
if (!localStorage.getItem('council_session_id')) {
    localStorage.setItem('council_session_id', 'session_' + Math.random().toString(36).substr(2, 9));
}
const SESSION_ID = localStorage.getItem('council_session_id');

// 1. Council Constitution (Strict Professional Protocol)
const COUNCIL_SYSTEM_PROMPT = `You are a key member of the AAIO Advisory Council.

OPERATIONAL RULES:
1. RESPONSE LANGUAGE: Strictly match the language used by the user in their query.
2. PERSONALITY: Maintain a distinct, professional persona without being overwhelming.
3. CONTEXTUAL AWARENESS: Analyze the current debate. If a colleague made a mistake, correct it politely. If they made a valid point, expand on it.
4. DEBATE ETIQUETTE: Always mention colleagues BY NAME when referring to their points to ensure a "give and take" atmosphere.
5. USER-CENTRIC OBJECTIVE: Focus 100% on answering the user's query. Do NOT offer technical, administrative, or development suggestions for the AAIO project unless the user explicitly asks for them.
6. NO HALLUCINATIONS: Stay grounded in facts.
ADDITIONAL SESSION RULES (CRITICAL):
7. IDENTITY PERSISTENCE: If you have already introduced yourself in this session, DO NOT repeat your name or "بسم الله الرحمن الرحيم". Start your response immediately.
8. CONCISE FOLLOW-UPS: In follow-up questions, avoid repeating any information already mentioned. Focus strictly on providing NEW academic depth and unique details.
9. UNIQUE VALUE ADD: Do not just agree or summarize. You MUST provide a specific new tool, a distinct perspective, or a technical correction that hasn't been shared yet.`;


// 2. Council Members Configuration
const councilMembers = [
    { id: 'gemini', name: 'Gemini', logo: 'logos/gemini.png', style: 'gemini-msg' },
    { id: 'chatgpt', name: 'ChatGPT', logo: 'logos/chatgpt.png', style: 'chatgpt-msg' },
    { id: 'claude', name: 'Claude', logo: 'logos/claude.png', style: 'claude-msg' },
    { id: 'deepseek', name: 'DeepSeek', logo: 'logos/deepseek.png', style: 'deepseek-msg' },
    { id: 'perplexity', name: 'Perplexity', logo: 'logos/perplexity.png', style: 'perplexity-msg' },
    { id: 'llama', name: 'Llama', logo: 'logos/llama.png', style: 'llama-msg' }, // العضو الجديد
    { id: 'mistral', name: 'Mistral', logo: 'logos/mistral.png', style: 'mistral-msg' } // العضو الجديد
];

let conversationHistory = [];

// 3. Sequential Discussion Engine
async function startCouncilDiscussion() {
    const inputField = document.getElementById('user-input');
    const userInput = inputField.value.trim();
    const chatWindow = document.getElementById('chat-window');
    const sendBtn = document.querySelector('.send-btn'); // قمنا بتعريف الزر هنا

    if (!userInput) return;

    // --- هذه هي الإضافة التي ستريحك من مشكلة التكرار ---
    inputField.value = ''; // مسح النص فوراً من الشريط
    if (sendBtn) {
        sendBtn.disabled = true; // تعطيل الزر
        sendBtn.style.opacity = '0.5'; // تغيير شكل الزر ليعرف المستخدم أنه "قيد الإرسال"
    }
    // ----------------------------------------------

    chatWindow.innerHTML += `<div class="user-msg">${userInput}</div>`;
    
    // Reset history with the new question
    conversationHistory = [{ role: "user", content: userInput }];

    const shuffledMembers = [...councilMembers].sort(() => 0.5 - Math.random());
    
    for (const member of shuffledMembers) {
        const loadingId = `loading-${member.id}`;
        chatWindow.innerHTML += `<div id="${loadingId}" class="loading-msg">${member.name} is thinking...</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
        // 1. طلب الرد من المستشار
        const responseText = await generateCouncilResponse(member.name, conversationHistory);

        // 2. حذف رسالة الـ Loading
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

        // 3. تخزين الرد في الذاكرة
        conversationHistory.push({ role: "assistant", name: member.name, content: responseText });

        // 4. إنشاء الفقاعة وإضافتها (الطريقة الجديدة والآمنة)
        const messageDiv = document.createElement('div');
        messageDiv.className = `council-message ${member.style}`;
        messageDiv.innerHTML = `
            <img src="${member.logo}" class="council-logo">
            <div>
                <span class="bot-name">${member.name}</span>
                <div>${marked.parse(responseText)}</div>
            </div>
        `;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

    } catch (error) {
        console.error(`Error with ${member.name}:`, error);
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
    }
    }
    inputField.value = ""; 
}

// 4. Unified Prompt Generator
async function generateCouncilResponse(name, history) {
    const originalQuestion = history[0].content;
    const cleanContext = history.map(h => `${h.name || 'User'}: ${h.content}`).join("\n\n");
    
    // Unified prompt for all advisors
    const finalPrompt = `COUNCIL CONSTITUTION:\n${COUNCIL_SYSTEM_PROMPT}\n\nTopic: ${originalQuestion}\n\nActual Current Debate:\n${cleanContext}\n\nYou are ${name}. Provide your professional input now.`;

    // Routing Logic (Unified names)
    if (name === "ChatGPT") return await callChatGPT(finalPrompt);
    if (name === "DeepSeek") return await callDeepSeek(finalPrompt);
    if (name === "Perplexity") return await callPerplexity(finalPrompt);
    if (name === "Claude") return await callClaude(finalPrompt);
    if (name === "Gemini") return await callGemini(finalPrompt);
    if (name === "Llama") return await callLlama(finalPrompt);   // إضافة
    if (name === "Mistral") return await callMistral(finalPrompt); // إضافة

    return "Unknown Advisor";
}

// 5. API Call Functions (Unified and Simplified)
async function callGemini(prompt) { return await sendToServer('ask-gemini', prompt, "Gemini"); }
async function callChatGPT(prompt) { return await sendToServer('ask-chatgpt', prompt, "ChatGPT"); }
async function callDeepSeek(prompt) { return await sendToServer('ask-deepseek', prompt, "DeepSeek"); }
async function callClaude(prompt) { return await sendToServer('ask-claude', prompt, "Claude"); }
async function callPerplexity(prompt) { return await sendToServer('ask-perplexity', prompt, "Perplexity"); }
async function callLlama(prompt) { return await sendToServer('ask-llama', prompt, "Llama"); }
async function callMistral(prompt) { return await sendToServer('ask-mistral', prompt, "Mistral"); }

// 1. الدالة المساعدة للاتصال بالسيرفر (سنحتاجها غداً بقوة)
async function sendToServer(endpoint, prompt, name) {
    const SERVER_BASE_URL = "https://ai-allin-one.com"; 

    try {
    const response = await fetch(`${SERVER_BASE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // التعديل هنا: إرسال الـ prompt ومعه الـ sessionId
        body: JSON.stringify({ prompt, sessionId: SESSION_ID }) 
    });
    
    if (!response.ok) {
        // تحويل رسالة الخطأ للإنجليزية لضمان الاحترافية
        return `${name}: [System Error] Server responded with status (${response.status}).`;
    }

        const data = await response.json();
return data.reply || `${name}: Received an empty response from the server.`;
} catch (e) {
    console.error("Connection Error:", e);
    return `${name}: [System Error] Unable to reach the server. Please check your connection.`;
}
}

// 2. مراقبة النقر لتوسيع صناديق المحادثة
document.getElementById('chat-window').addEventListener('click', function(e) {
    const bubble = e.target.closest('.council-message');
    if (bubble) {
        bubble.classList.toggle('expanded');
        if (bubble.classList.contains('expanded')) {
            bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
});

// مصفوفة اللغات الموسعة 
const thoughts = [
    "بماذا تفكر؟", "هل من تساؤل؟", "Need an insight?", "Seeking wisdom?",
    "¿Tienes una duda?", "O futuro espera", "Chiedi al consiglio", 
    "Bereit für Einsichten?", "Спроси нас", "知恵を借りる", "向委员会提问", 
    "L'intelligence attend", "کیا آپ سوچ رہے ہیں؟", "क्या आप सोच रहे हैं؟", "هل من تساؤل؟",
    "എന്താണ് ചിന്തിക്കുന്നത്؟", "Ne傾いている?", "چه در سر داری؟", 
    "Vad tänker du på?", "Mitä mietit?", "La ce te gândești?", 
    "Τι σκέφτεστε;", "Qual é a sua dúvida?", "질문이 있으십니까?",
    "มีคำถามไหม?", "Des questions ?", "Masz pytanie?", "Heeft u vragen?",
    "Imate li pitanja?", "May tanong ka ba?", "Hỏi ý kiến?", "Thinking of...?"
];

let lastThought = ""; // لمنع تكرار نفس اللغة مرتين متتاليتين

function spawnThought() {
    let randomThought;
    
    // منطق منع التكرار المتتالي
    do {
        randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    } while (randomThought === lastThought);
    
    lastThought = randomThought;

    const thoughtNode = document.createElement('div');
    thoughtNode.className = 'thought-flash';
    thoughtNode.innerText = randomThought;
    
    // توزيع عشوائي ذكي
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 100);
    
    thoughtNode.style.left = x + 'px';
    thoughtNode.style.top = y + 'px';
    
    document.getElementById('stars-layer').appendChild(thoughtNode);

    setTimeout(() => { thoughtNode.style.opacity = '1'; }, 100);
    setTimeout(() => { 
        thoughtNode.style.opacity = '0';
        setTimeout(() => { thoughtNode.remove(); }, 2000);
    }, 4000);
}

// لزيادة الكثافة: نطلق ومضة كل 1.5 ثانية بدلاً من 4، مما يجعل 3-4 ومضات تظهر معاً في نفس اللحظة
setInterval(spawnThought, 1500);

// --- كود تصدير المحادثة الملكي (PDF) ---
// --- وظيفة تصدير المحادثة إلى PDF بلمسات AAIO الملكية ---
async function exportCouncilPDF() {
    const chatWindow = document.getElementById('chat-window');
    const exportBtn = document.getElementById('full-export-btn');

    if (chatWindow.children.length === 0) return alert("المجلس صامت!");

    const originalBtnContent = exportBtn.innerHTML;
    exportBtn.innerHTML = "⏳";

    try {
        const options = {
            margin: [15, 15, 15, 15],
            filename: `AAIO_Official_Report.pdf`,
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const pdfContent = document.createElement('div');
        // أضفنا هنا "تنسيق الإصلاح" ليعالج الجداول والإنجليزية داخل الوعاء مباشرة
        pdfContent.style.cssText = "padding:10px; color:#000; background:#fff; font-family:Arial, sans-serif; direction:rtl; line-height:1.6;";
        
        // الجزء السحري لإظهار الجداول وفك تداخل الإنجليزية
        const repairStyles = `
            <style>
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ccc; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 12px; }
                p, span, div { unicode-bidi: plaintext; } 
                .en-text { direction: ltr; display: inline-block; }
            </style>
        `;

        const messages = chatWindow.querySelectorAll('.council-message');
        let discussionBody = "";

        messages.forEach(msg => {
            const messageContainer = msg.querySelector('.message-text');
            if (messageContainer) {
                const messageHTML = messageContainer.innerHTML;
                discussionBody += `
                    <div style="margin-bottom: 25px; page-break-inside: avoid;">
                        <div style="font-size: 13px; text-align: justify; color: #000;">
                            ${messageHTML}
                        </div>
                    </div>`;
            }
        });

        pdfContent.innerHTML = repairStyles + discussionBody;
        
        // تنفيذ التصدير
        await html2pdf().set(options).from(pdfContent).save();

    } catch (error) {
        console.error("PDF Error:", error);
    } finally {
        exportBtn.innerHTML = originalBtnContent;
    }
}
document.getElementById('full-export-btn').onclick = exportCouncilPDF;