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
        // 4. إنشاء الفقاعة وإضافتها (الطريقة الجديدة والآمنة)
        const messageDiv = document.createElement('div');
        messageDiv.className = `council-message ${member.style}`;
        messageDiv.innerHTML = `
            <img src="${member.logo}" class="council-logo">
            <div>
                <span class="bot-name">${member.name}</span>
                <div class="message-text">${marked.parse(responseText)}</div>
            </div>
        `;
        chatWindow.appendChild(messageDiv);

        // ============================================================
        // ➕ حقنة الرياضيات المطورة (KaTeX) ➕
        // ============================================================
        if (window.renderMathInElement) {
            renderMathInElement(messageDiv, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true}, // نمط اللاتكس القياسي
                    {left: '\\(', right: '\\)', display: false},
                    // إضافة لدعم النمط الذي أرسلته أنت في النص:
                    {left: '[ ', right: ' ]', display: true}, 
                    {left: '(', right: ')', display: false} 
                ],
                throwOnError: false
            });
        }
        // ============================================================

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
// --- وظيفة تصدير المحادثة إلى PDF (نظام الفصل بين الجبهات) ---
async function exportCouncilPDF() {
    const chatWindow = document.getElementById('chat-window');
    const exportBtn = document.getElementById('full-export-btn');

    if (!chatWindow || chatWindow.children.length === 0) return alert("The Council is silent!");

    // حفظ نص الزر الأصلي وإظهار مؤشر الانتظار
    const originalBtnContent = exportBtn.innerHTML;
    exportBtn.innerHTML = "⏳ Processing...";

    try {
        // 1. إعدادات مكتبة التصدير
        const options = {
            margin: [15, 15, 15, 15], // هوامش الصفحة (ملم)
            filename: `AAIO_Council_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, // دقة عالية
                useCORS: true, 
                backgroundColor: "#ffffff",
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // 2. دالة الفحص: هل النص يحتوي على عربي؟
        // إذا وجدنا حرفاً عربياً واحداً، نعتبر الرسالة "جبهة يمين"
        const isArabicText = (text) => /[\u0600-\u06FF]/.test(text);

        // 3. بناء محتوى الـ PDF (وعاء جديد نظيف)
        let pdfContentHTML = `
            <style>
                /* تنسيقات عامة للصفحة */
                body { font-family: sans-serif; background: #fff; color: #000; }
                
                /* --- جبهة اليمين (للمحتوى العربي والمختلط) --- */
                .rtl-message {
                    font-family: 'Arial', sans-serif; /* Arial هو الملك للعربي */
                    direction: rtl;
                    text-align: right;
                    margin-bottom: 25px;
                    border-right: 4px solid #6f42c1; /* زخرفة بسيطة لليمين */
                    padding-right: 10px;
                }

                /* --- جبهة اليسار (للمحتوى الإنجليزي الصرف) --- */
                .ltr-message {
                    font-family: 'Segoe UI', 'Helvetica', 'Arial', sans-serif; /* خطوط ممتازة للرياضيات */
                    direction: ltr;
                    text-align: left;
                    margin-bottom: 25px;
                    border-left: 4px solid #28a745; /* زخرفة بسيطة لليسار */
                    padding-left: 10px;
                }

                /* --- إصلاح مشكلة التصاق المائل (Italic Fix) --- */
                /* يطبق فقط داخل الرسائل الإنجليزية */
                .ltr-message em, .ltr-message i, .ltr-message .katex {
                    font-style: normal !important; /* نلغي الميلان في الطباعة لتجنب الالتصاق */
                    font-weight: 500; /* نميزه بوزن أثقل قليلاً */
                    letter-spacing: 0.3px; /* تنفس بسيط للحروف */
                    background-color: transparent !important;
                }

                /* تنسيق اسم المستشار */
                .advisor-name {
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 5px;
                    color: #555;
                    text-transform: uppercase;
                }

                /* تنسيق نص الرسالة */
                .message-body {
                    font-size: 13px;
                    line-height: 1.6;
                }

                /* تحسين الجداول داخل الـ PDF */
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ccc; padding: 6px; }
            </style>
            
            <h1 style="text-align:center; color:#333; font-family:'Arial'; margin-bottom:40px;">AAIO Council Report</h1>
        `;

        // 4. الدوران على الرسائل وفرزها
        const messages = chatWindow.querySelectorAll('.council-message');

        messages.forEach(msg => {
            // استخراج اسم المستشار
            const nameEl = msg.querySelector('.bot-name');
            const name = nameEl ? nameEl.innerText.trim() : 'Advisor';
            
            // استخراج نص الرسالة (HTML)
            const contentEl = msg.querySelector('.message-text') || msg.querySelector('div:last-child');
            if (!contentEl) return;
            
            // فحص اللغة بناءً على النص الخام
            const rawText = contentEl.innerText || "";
            const isRightFront = isArabicText(rawText);

            // تحديد الكلاس المناسب بناءً على الجبهة
            const containerClass = isRightFront ? 'rtl-message' : 'ltr-message';
            
            // إضافة الكتلة إلى المحتوى النهائي
            pdfContentHTML += `
                <div class="${containerClass}" style="page-break-inside: avoid;">
                    <div class="advisor-name">${name}</div>
                    <div class="message-body">
                        ${contentEl.innerHTML}
                    </div>
                </div>
            `;
        });

        // 5. إنشاء عنصر مؤقت وتوليد الملف
        const elementToPrint = document.createElement('div');
        elementToPrint.innerHTML = pdfContentHTML;
        
        // إضافة العنصر للصفحة (مخفي) ليتمكن html2pdf من رؤيته
        elementToPrint.style.position = 'fixed';
        elementToPrint.style.left = '-9999px';
        document.body.appendChild(elementToPrint);

        await html2pdf().set(options).from(elementToPrint).save();

        // تنظيف
        document.body.removeChild(elementToPrint);

    } catch (error) {
        console.error("PDF Export Error:", error);
        alert("Export failed due to a technical error.");
    } finally {
        exportBtn.innerHTML = originalBtnContent;
    }
}

// ربط الزر (تأكد أن الـ ID صحيح في ملف HTML لديك)
document.getElementById('full-export-btn').onclick = exportCouncilPDF;

// --- منطق تبديل اللغة والاتجاه ---
const langBtn = document.getElementById('lang-toggle');
const body = document.body;

// التحقق من الوضع المحفوظ سابقاً
if (localStorage.getItem('council_dir') === 'rtl') {
    enableRTL();
}

langBtn.addEventListener('click', () => {
    if (body.classList.contains('rtl-mode')) {
        disableRTL();
    } else {
        enableRTL();
    }
});

function enableRTL() {
    body.classList.add('rtl-mode');
    langBtn.querySelector('span').innerText = "ع/En"; // تبديل النص
    localStorage.setItem('council_dir', 'rtl'); // حفظ التفضيل
}

function disableRTL() {
    body.classList.remove('rtl-mode');
    langBtn.querySelector('span').innerText = "En/ع";
    localStorage.setItem('council_dir', 'ltr');
}