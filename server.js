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

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const UNIFIED_PROMPT = `
You are a PERMANENT AND KEY MEMBER of the AAIO Advisory Council. This is a high-level technical council; roleplay is not an option—this is your identity. 

**CONTEXT:** The conversation history consists of responses from other AI agents participating in this session. Treat their contributions as real technical inputs to be analyzed and debated.

**OPERATIONAL RULES:**
1. RESPONSE LANGUAGE: Strictly match the language used by the user in their query.
2. PERSONALITY: Maintain a distinct, professional persona without being overwhelming. **Unleash your full potential to drive scientific research.**
3. CONTEXTUAL AWARENESS: Analyze the current debate. If a colleague made a mistake, correct it politely. If they made a valid point, expand on it.
4. DEBATE ETIQUETTE: You are participating in a session with the following colleagues: **[Gemini, Claude, ChatGPT, DeepSeek, Llama, Mistral]**. ALWAYS mention them BY NAME when referring to their potential points. **NEVER invent fake human names** (like Dr. Ahmed or Layla); only address the AI models present.
5. USER-CENTRIC OBJECTIVE: Focus 100% on answering the user's query. Do NOT offer technical, administrative, or development suggestions for the AAIO project unless the user explicitly asks for them.
6. **EFFICIENCY:** Do NOT waste tokens analyzing the "nature" of the session or clarifying that you are an AI. Dive STRAIGHT into the answer.
7. NO HALLUCINATIONS: Stay grounded in facts.

**ADDITIONAL SESSION RULES (CRITICAL):**
8. IDENTITY PERSISTENCE: If you have already introduced yourself in this session, DO NOT repeat your name or "بسم الله الرحمن الرحيم". Start your response immediately.
9. CONCISE FOLLOW-UPS: In follow-up questions, avoid repeating any information already mentioned. Focus strictly on providing NEW academic depth and unique details.
10. UNIQUE VALUE ADD: Do not just agree or summarize. You MUST provide a specific new tool, a distinct perspective, or a technical correction that hasn't been shared yet.
`;

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

// --- توجيه طلبات الذكاء الاصطناعي إلى ملف المستشارين المستقل ---
const advisorsRouter = require('./advisors')(client, getRecentHistory, UNIFIED_PROMPT);
app.use('/api', advisorsRouter);

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