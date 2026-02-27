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

// ==========================================
// 2.5 نظام تعدد اللغات (القاموس الداخلي) لصفحة المجلس
// ==========================================
const councilTranslations = {
    en: { title: "AI Advisory Council", tagline: "Ask your question and watch the council share insights and collaborate.", placeholder: "Type your question or idea for discussion...", copyBtn: "Copy Chat", pdfBtn: "Keep Every Detail", you: "You" },
    ar: { title: "مجلس مستشاري الذكاء الاصطناعي", tagline: "اطرح سؤالك وشاهد المجلس يشاركك الرؤى ويتعاون.", placeholder: "اكتب سؤالك أو فكرتك للنقاش...", copyBtn: "نسخ المحادثة", pdfBtn: "حفظ كملف PDF", you: "أنت" },
    es: { title: "Consejo Asesor de IA", tagline: "Haga su pregunta y vea al consejo compartir ideas y colaborar.", placeholder: "Escriba su pregunta o idea para discutir...", copyBtn: "Copiar Chat", pdfBtn: "Guardar PDF", you: "Tú" },
    pt: { title: "Conselho Consultivo de IA", tagline: "Faça sua pergunta e veja o conselho compartilhar ideias e colaborar.", placeholder: "Digite sua pergunta ou ideia para discussão...", copyBtn: "Copiar Chat", pdfBtn: "Salvar PDF", you: "Você" },
    fr: { title: "Conseil Consultatif de l'IA", tagline: "Posez votre question et regardez le conseil partager des idées et collaborer.", placeholder: "Tapez votre question ou idée pour en discuter...", copyBtn: "Copier le Chat", pdfBtn: "Sauvegarder PDF", you: "Vous" },
    de: { title: "KI-Beirat", tagline: "Stellen Sie Ihre Frage und sehen Sie zu, wie der Beirat Erkenntnisse austauscht und zusammenarbeitet.", placeholder: "Geben Sie Ihre Frage oder Idee zur Diskussion ein...", copyBtn: "Chat Kopieren", pdfBtn: "PDF Speichern", you: "Du" },
    it: { title: "Consiglio Consultivo sull'IA", tagline: "Fai la tua domanda e guarda il consiglio condividere idee e collaborare.", placeholder: "Digita la tua domanda o idea per la discussione...", copyBtn: "Copia Chat", pdfBtn: "Salva PDF", you: "Tu" },
    ru: { title: "Консультативный Совет по ИИ", tagline: "Задайте свой вопрос и наблюдайте, как совет делится идеями и сотрудничает.", placeholder: "Введите свой вопрос или идею для обсуждения...", copyBtn: "Копировать Чат", pdfBtn: "Сохранить PDF", you: "Вы" },
    el: { title: "Συμβουλευτικό Συμβούλιο AI", tagline: "Κάντε την ερώτησή σας και δείτε το συμβούλιο να μοιράζεται ιδέες.", placeholder: "Πληκτρολογήστε την ερώτηση ή την ιδέα σας...", copyBtn: "Αντιγραφή Chat", pdfBtn: "Αποθήκευση PDF", you: "Εσείς" },
    nl: { title: "AI Adviesraad", tagline: "Stel uw vraag en zie hoe de raad inzichten deelt en samenwerkt.", placeholder: "Typ uw vraag of idee voor discussie...", copyBtn: "Chat Kopiëren", pdfBtn: "PDF Opslaan", you: "Jij" },
    pl: { title: "Rada Doradcza ds. AI", tagline: "Zadaj pytanie i obserwuj, jak rada dzieli się spostrzeżeniami.", placeholder: "Wpisz swoje pytanie lub pomysł do dyskusji...", copyBtn: "Kopiuj Czat", pdfBtn: "Zapisz PDF", you: "Ty" },
    sv: { title: "AI-rådgivande rådet", tagline: "Ställ din fråga och se rådet dela insikter och samarbeta.", placeholder: "Skriv din fråga eller idé för diskussion...", copyBtn: "Kopiera Chatt", pdfBtn: "Spara PDF", you: "Du" },
    zh: { title: "AI 顾问委员会", tagline: "提出您的问题，观看委员会分享见解并进行合作。", placeholder: "输入您的问题或想法进行讨论...", copyBtn: "复制聊天", pdfBtn: "保存 PDF", you: "您" },
    ja: { title: "AI 諮問委員会", tagline: "質問をして、委員会が洞察を共有し協力するのを見てください。", placeholder: "議論のための質問やアイデアを入力してください...", copyBtn: "チャットをコピー", pdfBtn: "PDFを保存", you: "あなた" },
    ko: { title: "AI 자문 위원회", tagline: "질문을 하고 위원회가 통찰력을 공유하고 협력하는 것을 지켜보십시오.", placeholder: "토론할 질문이나 아이디어를 입력하세요...", copyBtn: "채팅 복사", pdfBtn: "PDF 저장", you: "당신" },
    hi: { title: "एआई सलाहकार परिषद", tagline: "अपना प्रश्न पूछें और परिषद को अंतर्दृष्टि साझा करते हुए देखें।", placeholder: "चर्चा के लिए अपना प्रश्न या विचार टाइप करें...", copyBtn: "चैट कॉपी करें", pdfBtn: "पीडीएफ सहेजें", you: "आप" },
    tr: { title: "Yapay Zeka Danışma Konseyi", tagline: "Sorunuzu sorun ve konseyin içgörüleri paylaşmasını izleyin.", placeholder: "Tartışma için sorunuzu veya fikrinizi yazın...", copyBtn: "Sohbeti Kopyala", pdfBtn: "PDF Kaydet", you: "Sen" },
    fa: { title: "شورای مشورتی هوش مصنوعی", tagline: "سوال خود را بپرسید و تماشا کنید که شورا بینش ها را به اشتراک می گذارد.", placeholder: "سوال یا ایده خود را برای بحث تایپ کنید...", copyBtn: "کپی چت", pdfBtn: "ذخیره PDF", you: "شما" },
    id: { title: "Dewan Penasihat AI", tagline: "Ajukan pertanyaan Anda dan saksikan dewan berbagi wawasan.", placeholder: "Ketik pertanyaan atau ide Anda untuk diskusi...", copyBtn: "Salin Obrolan", pdfBtn: "Simpan PDF", you: "Anda" },
    vi: { title: "Hội đồng Cố vấn AI", tagline: "Đặt câu hỏi của bạn và xem hội đồng chia sẻ thông tin chi tiết.", placeholder: "Nhập câu hỏi hoặc ý tưởng của bạn để thảo luận...", copyBtn: "Sao chép Chat", pdfBtn: "Lưu PDF", you: "Bạn" },
    sw: { title: "Baraza la Ushauri la AI", tagline: "Uliza swali lako na utazame baraza likishiriki ufahamu.", placeholder: "Chapa swali au wazo lako kwa majadiliano...", copyBtn: "Nakili Gumzo", pdfBtn: "Hifadhi PDF", you: "Wewe" },
    am: { title: "የ AI አማካሪ ምክር ቤት", tagline: "ጥያቄዎን ይጠይቁ እና ምክር ቤቱ ግንዛቤዎችን ሲያካፍል ይመልከቱ።", placeholder: "ለ ውይይት ጥያቄዎን ወይም ሃሳብዎን ይተይቡ...", copyBtn: "ውይይት ቅዳ", pdfBtn: "PDF አስቀምጥ", you: "አንተ" },
    zu: { title: "Umkhandlu Wokweluleka we-AI", tagline: "Buza umbuzo wakho futhi ubuke umkhandlu wabelana ngemininingwane.", placeholder: "Thayipha umbuzo noma umbono wakho wengxoxo...", copyBtn: "Kopisha Ingxoxo", pdfBtn: "Londoloza i-PDF", you: "Wena" },
    ha: { title: "Kwamitin Ba da Shawara na AI", tagline: "Yi tambayarka kuma kalli kwamitin yana raba ra'ayoyi.", placeholder: "Rubuta tambayarka ko ra'ayinka don tattaunawa...", copyBtn: "Kwafi Tattaunawa", pdfBtn: "Ajiye PDF", you: "Kai" }
};

function applyCouncilLanguage(lang) {
    // 1. تحديد اتجاه الصفحة (للعربية والفارسية)
    const rtlLanguages = ['ar', 'fa']; 
    const isRtl = rtlLanguages.includes(lang);
    
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // --- السر هنا: إضافة أو إزالة كلاس الاتجاه للنصوص ---
    if (isRtl) {
        document.body.classList.add('rtl-mode');
    } else {
        document.body.classList.remove('rtl-mode');
    }

    // 2. سحب الترجمة من القاموس (إذا لم تكن موجودة، نستخدم الإنجليزية كافتراضي)
    const texts = councilTranslations[lang] || councilTranslations['en'];
    
    // 3. تطبيق الترجمة على العناصر الخمسة
    const titleEl = document.querySelector('.council-title');
    const taglineEl = document.querySelector('.council-tagline');
    const inputEl = document.getElementById('user-input');
    const copyBtn = document.getElementById('copy-chat-btn');
    const pdfBtn = document.getElementById('full-export-btn');

    if (titleEl) titleEl.innerText = texts.title;
    if (taglineEl) taglineEl.innerText = texts.tagline;
    if (inputEl) inputEl.placeholder = texts.placeholder;
    if (copyBtn) copyBtn.title = texts.copyBtn;
    if (pdfBtn) pdfBtn.title = texts.pdfBtn;
}

// 4. مراقبة القائمة المنسدلة وتطبيق اللغة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    const langPicker = document.getElementById('language-picker');
    const savedLang = localStorage.getItem('selectedLanguage') || 'en';
    
    if (langPicker) {
        langPicker.value = savedLang;
        langPicker.addEventListener('change', function() {
            localStorage.setItem('selectedLanguage', this.value);
            applyCouncilLanguage(this.value);
        });
    }
    // تطبيق اللغة المحفوظة فوراً عند فتح الصفحة
    applyCouncilLanguage(savedLang);
});

// 3. Sequential Discussion Engine
async function startCouncilDiscussion() {
    const inputField = document.getElementById('user-input');
    const userInput = inputField.value.trim();
    const chatWindow = document.getElementById('chat-window');
    const sendBtn = document.querySelector('.send-btn'); // قمنا بتعريف الزر هنا

    if (!userInput) return;

    // --- تعطيل الأزرار لمنع التكرار ---
    inputField.value = ''; 
    const copyBtn = document.getElementById('copy-chat-btn');
    if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
    if (copyBtn) { copyBtn.disabled = false; copyBtn.style.opacity = '1'; }

    // جلب كلمة "أنت" باللغة الحالية
    const currentLang = document.documentElement.lang || 'en';
    const translatedYou = councilTranslations[currentLang] ? councilTranslations[currentLang].you : "You";

    // 1. تحديد اتجاه صندوق المستخدم بناءً على اللغة
    const isRtl = ['ar', 'fa'].includes(currentLang);
    const alignStyle = isRtl 
        ? 'margin-right: auto !important; margin-left: 0 !important;' // للغات من اليمين لليسار: الصندوق يتجه لليسار
        : 'margin-left: auto !important; margin-right: 0 !important;'; // للغات من اليسار لليمين: الصندوق يتجه لليمين

    // 2. إنشاء صندوق المستخدم مع المحافظة على شكل الذيل
    chatWindow.innerHTML += `
    <div class="council-message" style="background: hsla(210, 100%, 60%, 0.1) !important; border-color: hsla(210, 100%, 60%, 0.2) !important; ${alignStyle} border-radius: 1rem 1rem 0 1rem !important;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: hsla(210, 100%, 60%, 0.2); display: flex; align-items: center; justify-content: center; margin-top: 4px;">
            <i class="fas fa-user" style="color: #60a5fa; font-size: 14px;"></i>
        </div>
        <div class="council-message-content" style="min-width: 0; overflow: hidden;">
            <span class="bot-name" style="color: #60a5fa;">${translatedYou}</span>
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

// ==========================================
// وظيفة نسخ المحادثة بالكامل
// ==========================================
async function copyCouncilChat() {
    const chatWindow = document.getElementById('chat-window');
    const messages = chatWindow.querySelectorAll('.council-message');
    
    if (!messages || messages.length === 0) {
        alert("لا توجد محادثة لنسخها! / No chat to copy!");
        return;
    }

    let chatText = "";
    
    // تجميع النصوص مع الأسماء
    messages.forEach(msg => {
        const nameEl = msg.querySelector('.bot-name');
        const contentEl = msg.querySelector('.message-text') || msg.querySelector('div:last-child');

        if (nameEl && contentEl) {
            chatText += `${nameEl.innerText.trim()}:\n${contentEl.innerText.trim()}\n\n`;
        }
    });

    try {
        // نسخ النص للحافظة
        await navigator.clipboard.writeText(chatText);
        
        // تأثير بصري للنجاح (تغيير الأيقونة لعلامة صح)
        const copyBtn = document.getElementById('copy-chat-btn');
        const originalHTML = copyBtn.innerHTML;
        const originalTitle = copyBtn.title;

        copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        copyBtn.title = "Copied!";

        // العودة للشكل الطبيعي بعد ثانيتين
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.title = originalTitle;
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

// ربط الزر بالدالة
document.getElementById('copy-chat-btn').addEventListener('click', copyCouncilChat);

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

