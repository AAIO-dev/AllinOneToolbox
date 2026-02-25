// إنشاء أو استرجاع هوية المستخدم الفريدة للجلسة
if (!localStorage.getItem('council_session_id')) {
    localStorage.setItem('council_session_id', 'session_' + Math.random().toString(36).substr(2, 9));
}
const SESSION_ID = localStorage.getItem('council_session_id');

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

    chatWindow.innerHTML += `
    <div class="council-message" style="background: hsla(210, 100%, 60%, 0.1) !important; border-color: hsla(210, 100%, 60%, 0.2) !important; margin-left: auto !important; margin-right: 0 !important; border-radius: 1rem 1rem 0 1rem !important;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: hsla(210, 100%, 60%, 0.2); display: flex; align-items: center; justify-content: center; margin-top: 4px;">
            <i class="fas fa-user" style="color: #60a5fa; font-size: 14px;"></i>
        </div>
        <div class="council-message-content" style="min-width: 0; overflow: hidden;">
            <span class="bot-name" style="color: #60a5fa;">أنت (You)</span>
            <div class="message-text">${userInput}</div>
        </div>
    </div>
`;
    
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
    <div style="padding-top: 4px;">
        <img src="${member.logo}" class="council-logo" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid hsla(0, 0%, 100%, 0.2);">
    </div>
    <div class="council-message-content" style="min-width: 0; overflow: hidden;">
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
    
    // نرسل السؤال فقط ونحدد هوية المستشار ليتحدث بشخصيته
    // السيرفر سيتكفل بالباقي (الدستور + التاريخ)
    const finalPrompt = `Topic: ${originalQuestion}\n\nYou are ${name}. Provide your professional input now.`;

    // Routing Logic (Unified names)
    if (name === "ChatGPT") return await callChatGPT(finalPrompt);
    if (name === "DeepSeek") return await callDeepSeek(finalPrompt);
    if (name === "Perplexity") return await callPerplexity(finalPrompt);
    if (name === "Claude") return await callClaude(finalPrompt);
    if (name === "Gemini") return await callGemini(finalPrompt);
    if (name === "Llama") return await callLlama(finalPrompt);
    if (name === "Mistral") return await callMistral(finalPrompt);

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
    const SERVER_BASE_URL = "https://aiallinone.ai"; 

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

// ==========================================
// 1. المايسترو: الوظيفة الرئيسية (نسخة "المحتوى الخام" + إصلاح التكرار)
// ==========================================
async function exportCouncilPDF() {
    const chatWindow = document.getElementById('chat-window');
    const exportBtn = document.getElementById('full-export-btn');

    if (!chatWindow || chatWindow.children.length === 0) return alert("The Council is silent!");

    const originalBtnContent = exportBtn.innerHTML;
    exportBtn.innerHTML = "⏳ Processing...";

    try {
        const options = {
            margin: [15, 15, 15, 15],
            filename: `AAIO_Official_Report.pdf`,
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: "#ffffff",
                letterRendering: true 
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const pdfContainer = document.createElement('div');
        // إعدادات الحاوية العامة
        pdfContainer.style.cssText = "padding: 20px; background: #fff; width: 210mm; box-sizing: border-box;";
        
        // --- (الحل الجذري) ---
        // نضيف ستايل خاص لإخفاء النسخة المخفية من المعادلات
        pdfContainer.innerHTML = `
            <style>
                .katex-mathml { display: none !important; } /* هذا السطر يقتل الأشباح */
                .katex-html { display: inline-block !important; } /* وهذا يظهر المعادلة الأصلية */
            </style>
        `;

        // حذفنا العنوان (الترويسة) بناءً على طلبك

        const messages = chatWindow.querySelectorAll('.council-message');
        
        messages.forEach(msg => {
            const nameEl = msg.querySelector('.bot-name');
            const name = nameEl ? nameEl.innerText.trim() : 'Advisor';
            
            const contentEl = msg.querySelector('.message-text') || msg.querySelector('div:last-child');
            if (!contentEl) return;
            
            const rawText = contentEl.innerText || "";
            const htmlContent = contentEl.innerHTML;

            const isArabic = /[\u0600-\u06FF]/.test(rawText);

            if (isArabic) {
                pdfContainer.innerHTML += getArabicTemplate(name, htmlContent);
            } else {
                pdfContainer.innerHTML += getEnglishTemplate(name, htmlContent);
            }
        });

        document.body.appendChild(pdfContainer);
        await html2pdf().set(options).from(pdfContainer).save();
        document.body.removeChild(pdfContainer);

    } catch (error) {
        console.error("PDF Error:", error);
        alert("Export failed.");
    } finally {
        exportBtn.innerHTML = originalBtnContent;
    }
}

// ==========================================
// 2. القالب العربي (خام - بدون حدود)
// ==========================================
function getArabicTemplate(name, content) {
    return `
        <div style="
            direction: rtl; 
            text-align: right; 
            font-family: 'Times New Roman', serif; 
            font-size: 14px; 
            line-height: 1.6;
            margin-bottom: 25px;
            /* تم حذف الحدود والزينة */
            page-break-inside: avoid;
        ">
            <div style="font-weight:bold; color:#000; margin-bottom:5px;">${name}</div>
            <div style="color:#000;">
                ${content}
            </div>
        </div>
    `;
}

// ==========================================
// 3. المتخصص الإنجليزي (جبهة اليسار - نسخة فك الالتصاق الإجباري)
// ==========================================
function getEnglishTemplate(name, content) {
    // تنظيف بسيط
    let safeContent = content.replace(/<(em|i)>/g, '<span style="font-style: normal; font-weight: 500;">');
    safeContent = safeContent.replace(/<\/(em|i)>/g, '</span>');

    return `
        <div style="
            direction: ltr; 
            text-align: left; 
            font-family: Arial, sans-serif; 
            font-size: 13px; 
            line-height: 1.6;
            margin-bottom: 25px;
            color: #000;
            
            /* الحل الجذري: إجبار المتصفح على وضع مسافة 3 بكسل بين الكلمات */
            word-spacing: 3px; 
            
            /* تحسينات إضافية */
            letter-spacing: 0.2px;
            overflow-wrap: break-word;
            
            page-break-inside: avoid;
        ">
            <div style="font-weight:bold; margin-bottom:5px; text-transform: uppercase;">${name}</div>
            <div>
                ${safeContent}
            </div>
        </div>
    `;
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