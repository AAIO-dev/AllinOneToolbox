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
const UNIFIED_PROMPT = "Provide your best response to the user's query. You are participating in a multi-AI knowledge exchange and discussion. If other models' responses are provided, feel free to evaluate them: support, oppose, correct, supplement their views, or add further insights based on your own knowledge, core training, and data.";

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

// دالة لجلب آخر 5 محادثات من قاعدة البيانات بالبحرين
async function getRecentHistory() {
    try {
        const database = client.db("AAIO-Memory");
        const historyCollection = database.collection("chat_history");
        
        // جلب آخر 5 سجلات مرتبة من الأحدث للأقدم
        const recentLogs = await historyCollection
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        // تنسيق السجلات كنص ليفهمه المستشارون
        return recentLogs.map(log => 
            `المستشار ${log.advisor} قال: ${log.botReply}`
        ).join("\n---\n");
    } catch (error) {
        console.error("❌ فشل في جلب التاريخ:", error);
        return "لا يوجد تاريخ متاح حالياً.";
    }
}

// --- 1. GEMINI (النسخة المحدثة مع الذاكرة السحابية) ---
// --- Gemini Advisor ---
app.post('/api/ask-gemini', async (req, res) => {
    const { prompt } = req.body;
    console.log("🚀 Gemini processing request...");

    try {
        const historyText = await getRecentHistory();
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

        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "Gemini",
            userName: "Abdulrahman (Abu Fallah)", // تم تحويل الاسم للإنجليزية لعدم التأثير على اللغة
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

        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "Perplexity",
            userName: "Abdulrahman (Abu Fallah)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Perplexity Error:", error.message);
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