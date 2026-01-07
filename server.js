const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { MongoClient } = require('mongodb');

dotenv.config();

const app = express();

// 1. إعداد الـ CORS بشكل صحيح وشامل (يجب أن يكون أول شيء)
const corsOptions = {
    origin: ['https://ai-allin-one.com', 'https://allinonetoolbox.onrender.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));


// 2. إعداد استقبال البيانات JSON
app.use(express.json());

// 3. الملفات الثابتة
app.use(express.static(__dirname));

// --- إعدادات قاعدة البيانات ---
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const UNIFIED_PROMPT = `You are a PERMANENT AND KEY MEMBER of the AAIO Advisory Council. 
This is a high-level technical council; roleplay is not an option—this is your identity.

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
Council History:
${historyText}
---
User Query: ${prompt}
Note: Respond in the same language as the User Query.
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory(); 
        const finalPrompt = `
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above.
`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;

        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            advisor: "ChatGPT",
            userName: "Abdulrahman (Abu Fallah)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "ChatGPT Service Unavailable" });
    }
});

// --- DeepSeek Advisor ---
app.post('/api/ask-deepseek', async (req, res) => {
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory();
        const finalPrompt = `
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above.
`;

        const response = await axios.post('https://api.deepseek.com/chat/completions', {
            model: "deepseek-reasoner",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
        });

        const reply = response.data.choices[0].message.content;

        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            advisor: "DeepSeek",
            userName: "Abdulrahman (Abu Fallah)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "DeepSeek Service Unavailable" });
    }
});

// --- Claude Advisor ---
app.post('/api/ask-claude', async (req, res) => {
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory();
        const finalPrompt = `
Council History:
${historyText}
---
User Query: ${prompt}
Note: You MUST respond in the exact same language used in the User Query above.
`;

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: UNIFIED_PROMPT,
            messages: [{ role: "user", content: finalPrompt }]
        }, {
            headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        const reply = response.data.content[0].text;

        await client.db("AAIO-Memory").collection("chat_history").insertOne({
            advisor: "Claude",
            userName: "Abdulrahman (Abu Fallah)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "Claude Service Unavailable" });
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