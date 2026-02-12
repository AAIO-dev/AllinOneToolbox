const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const path = require('path');

dotenv.config();

const app = express();

// 1. إعداد الـ CORS بشكل صحيح وشامل (يجب أن يكون أول شيء)
const corsOptions = {
    origin: ['https://ai-allin-one.com', 'https://allinonetoolbox.onrender.com', 'http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));


// 2. إعداد استقبال البيانات JSON
app.use(express.json());

// 3. الملفات الثابتة
app.use(express.static(__dirname));

// أ) ربط ملفات التصميم
app.use('/council', express.static(path.join(__dirname, 'dist')));

// ب) توجيه صفحة المجلس (استخدام Regex بدل النجمة لتفادي المشاكل)
app.get(/\/council\/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/council', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ج) توجيه باقي الموقع (للأدوات القديمة)
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/council')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- إعدادات قاعدة البيانات ---


// ... (تكملة باقي الدوال والـ Routes كما هي لديك)
// --- وظيفة جلب الـ 286 أداة من قاعدة البيانات الجديدة ---
app.get('/api/tools', async (req, res) => {
    try {
        const database = client.db("AAIO-Data");
        const toolsCollection = database.collection("tools");
        const tools = await toolsCollection.find({}).toArray();
        res.json(tools);
    } catch (error) {
        console.error("❌ فشل في جلب الأدوات:", error);
        res.status(500).json({ error: "فشل في تحميل الأدوات" });
    }
});

// مسار خاص لاستيراد الأدوات دفعة واحدة وتخزينها في MongoDB
app.post('/api/tools/import', async (req, res) => {
    try {
        const toolsData = req.body; // البيانات التي سنرسلها من المتصفح
        const database = client.db("AAIO-Data");
        const toolsCollection = database.collection("tools");

        // مسح البيانات القديمة لضمان عدم التكرار (اختياري حسب رغبتك)
        await toolsCollection.deleteMany({}); 
        
        const result = await toolsCollection.insertMany(toolsData);
        console.log(`Done! ${result.insertedCount} tools saved.`);
        res.json({ success: true, count: result.insertedCount });
    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ error: "Failed to save tools" });
    }
});

// دالة لجلب المحادثات من قاعدة البيانات بالبحرين
async function getRecentHistory(sessionId) {
    try {
        const database = client.db("AAIO-Memory");
        const historyCollection = database.collection("chat_history");
        
        // التعديل الجوهري: البحث فقط عن السجلات التي تخص هذا المستخدم (sessionId)
        const recentLogs = await historyCollection
            .find({ sessionId: sessionId }) // فلترة ذكية
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        if (recentLogs.length === 0) return "No previous context for this session.";

        // تنسيق السجلات بلغة احترافية ليفهمها المستشارون
        return recentLogs.reverse().map(log => 
            `${log.advisor}: ${log.botReply}`
        ).join("\n---\n");
    } catch (error) {
        console.error("❌ History Retrieval Error:", error);
        return "No history available.";
    }
}

// --- 1. GEMINI (النسخة المحدثة مع الذاكرة السحابية) ---
// --- Gemini Advisor ---
app.post('/api/ask-gemini', async (req, res) => {
    // 1. استخراج الـ sessionId والـ prompt من الطلب القادم
    const { prompt, sessionId } = req.body; 
    console.log(`🚀 Gemini processing request for session: ${sessionId}`);

    try {
        // 2. تمرير الـ sessionId للدالة لجلب التاريخ الخاص بهذا المستخدم فقط
        const historyText = await getRecentHistory(sessionId);
        
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: Respond in the same language as the User Query.
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                system_instruction: { parts: [{ text: UNIFIED_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
            }
        );

        const reply = response.data.candidates[0].content.parts[0].text;

        // 3. حفظ الـ sessionId في قاعدة البيانات لضمان استمرارية الذاكرة
        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            sessionId: sessionId, // تخزين الهوية
            advisor: "Gemini",
            userName: "User", 
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Gemini Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Gemini Service Unavailable" });
    }
});

// --- Perplexity Advisor ---
app.post('/api/ask-perplexity', async (req, res) => {
    // 1. استلام الهوية والسؤال
    const { prompt, sessionId } = req.body; 
    console.log(`🚀 Perplexity processing for session: ${sessionId}`);

    try {
        // 2. جلب تاريخ هذه الجلسة فقط
        const historyText = await getRecentHistory(sessionId);
        
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above. Ignore the language of the History if it differs.
`;

        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: "sonar",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;

        // 3. تخزين الرد مع ربطه بالـ sessionId
        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            sessionId: sessionId, 
            advisor: "Perplexity",
            userName: "User", // حافظنا على الخصوصية هنا
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Perplexity Error:", error.message);
        // رسالة الخطأ بالإنجليزية كما اتفقنا
        res.status(500).json({ error: "Perplexity Service Unavailable" });
    }
});

// --- ChatGPT Advisor ---
app.post('/api/ask-chatgpt', async (req, res) => {
    // 1. استلام الهوية (sessionId) والسؤال من الطلب
    const { prompt, sessionId } = req.body;
    try {
        // 2. جلب تاريخ الجلسة الخاص بهذا المستخدم فقط
        const historyText = await getRecentHistory(sessionId); 
        
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above.
`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o", // تم الإبقاء على الموديل الأقوى كما هو في كودك
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;

        // 3. تخزين الرد في MongoDB مع ربطه بالـ sessionId
        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            sessionId: sessionId, // إضافة حقل الهوية لضمان عدم تداخل الذاكرة
            advisor: "ChatGPT",
            userName: "User", 
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ ChatGPT Error:", error.message);
        res.status(500).json({ error: "ChatGPT Service Unavailable" });
    }
});

// --- DeepSeek Advisor ---
app.post('/api/ask-deepseek', async (req, res) => {
    // 1. استلام الهوية والسؤال
    const { prompt, sessionId } = req.body;
    try {
        // 2. جلب التاريخ المفلتر للجلسة
        const historyText = await getRecentHistory(sessionId);
        
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above.
`;

        const response = await axios.post('https://api.deepseek.com/chat/completions', {
            model: "deepseek-reasoner", // الموديل الذي يتميز بالتفكير العميق
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;

        // 3. تخزين الرد مع ربطه بالهوية
        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            sessionId: sessionId,
            advisor: "DeepSeek",
            userName: "User",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ DeepSeek Error:", error.message);
        res.status(500).json({ error: "DeepSeek Service Unavailable" });
    }
});

// --- Claude Advisor ---
app.post('/api/ask-claude', async (req, res) => {
    // 1. استلام الهوية والسؤال من المتصفح
    const { prompt, sessionId } = req.body;
    try {
        // 2. جلب تاريخ الجلسة المفلتر
        const historyText = await getRecentHistory(sessionId);
        
        // أضفنا تنبيهاً صارماً هنا لأن كلاود يميل أحياناً للغة العربية بناءً على تدريبه السابق
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above. This is a technical requirement for the AAIO project.
`;

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: UNIFIED_PROMPT, // الدستور الموحد يرسل هنا كمؤشر نظام
            messages: [{ role: "user", content: finalPrompt }]
        }, {
            headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        const reply = response.data.content[0].text;

        // 3. تخزين الرد مع الهوية لضمان عدم تداخل الذاكرة
        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            sessionId: sessionId,
            advisor: "Claude",
            userName: "User",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Claude Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Claude Service Unavailable" });
    }
});

// --- Llama 3.1 Advisor (via Groq) ---
app.post('/api/ask-llama', async (req, res) => {
    const { prompt, sessionId } = req.body;
    try {
        const historyText = await getRecentHistory(sessionId);
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: Respond in the same language as the User Query.
`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;
        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            sessionId, advisor: "Llama", userPrompt: prompt, botReply: reply, timestamp: new Date()
        });
        res.json({ reply });
    } catch (error) {
        console.error("❌ Llama Error:", error.message);
        res.status(500).json({ error: "Llama Service Unavailable" });
    }
});

// --- Mistral Large Advisor ---
app.post('/api/ask-mistral', async (req, res) => {
    const { prompt, sessionId } = req.body;
    try {
        const historyText = await getRecentHistory(sessionId);
        const finalPrompt = `
${UNIFIED_PROMPT}
---
Council History:
${historyText}
---
User Query: ${prompt}
Note: Respond in the same language as the User Query.
`;

        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: "mistral-large-latest",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;
        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            sessionId, advisor: "Mistral", userPrompt: prompt, botReply: reply, timestamp: new Date()
        });
        res.json({ reply });
    } catch (error) {
        console.error("❌ Mistral Error:", error.message);
        res.status(500).json({ error: "Mistral Service Unavailable" });
    }
});

const PORT = process.env.PORT || 3000;

async function connectDB() {
    try {
        await client.connect();
        console.log("✅ تم الاتصال بنجاح بذاكرة AAIO السحابية في البحرين!");
    } catch (e) {
        console.error("❌ فشل الاتصال بالقاعدة:", e);
    }
}
connectDB();

app.listen(PORT, () => {
    console.log(`✅ AAIO Server is live and running on port ${PORT}`);
});