const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

const UNIFIED_PROMPT = "Provide your best response to the user's query. You are participating in a multi-AI knowledge exchange and discussion. If other models' responses are provided, feel free to evaluate them: support, oppose, correct, supplement their views, or add further insights based on your own knowledge, core training, and data.";

dotenv.config();

const app = express();
app.use(express.static(__dirname));
app.use(cors());
app.use(express.json());

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
app.post('/ask-gemini', async (req, res) => {
    const { prompt } = req.body;
    console.log("🚀 Gemini is checking the Council History...");

    try {
        // 1. جلب تاريخ المحادثات من البحرين
        const historyText = await getRecentHistory();

        // 2. دمج التاريخ مع سؤالك وتوجيه Gemini للمقارنة
        const finalPrompt = `
هذا هو سجل آخر المحادثات في المجلس:
${historyText}
---
بناءً على هذا السجل وعلى سؤال المستخدم التالي، قدم ردك مع مراعاة ما قاله زملاؤك (دعم، معارضة، أو تصحيح):
${prompt}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                system_instruction: { parts: [{ text: UNIFIED_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
            }
        );

        const reply = response.data.candidates[0].content.parts[0].text;

        // 3. حفظ الرد الجديد في الذاكرة
        const database = client.db("AAIO-Memory");
        const history = database.collection("chat_history");
        await history.insertOne({
            advisor: "Gemini",
            userName: "عبدالرحمن (أبو فلاح)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Gemini Failure:", error.response?.data || error.message);
        res.status(500).json({ error: "Gemini Service Unavailable" });
    }
});

app.post('/ask-perplexity', async (req, res) => {
    const { prompt } = req.body;
    console.log("🚀 Perplexity is researching and checking History...");
    try {
        // 1. استدعاء الذاكرة من البحرين
        const historyText = await getRecentHistory();
        
        // 2. صياغة السؤال مع فلسفة البحث التاريخي
        const finalPrompt = `
إليك سجل النقاشات الأخيرة في المجلس:
${historyText}
---
بناءً على هذا السجل وسؤال المستخدم التالي، قدم بحثاً دقيقاً مع نقد أو تأييد لما ذكره الزملاء:
${prompt}`;

        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: "sonar",
            messages: [
                { role: "system", content: UNIFIED_PROMPT },
                { role: "user", content: finalPrompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const reply = response.data.choices[0].message.content;

        // 3. تخليد الفلسفة في قاعدة البيانات
        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "Perplexity",
            userName: "عبدالرحمن (أبو فلاح)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        console.error("❌ Perplexity Failure:", error.response?.data || error.message);
        res.status(500).json({ error: "Perplexity Service Unavailable" });
    }
});

app.post('/ask-chatgpt', async (req, res) => {
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory(); // جلب الذاكرة
        const finalPrompt = `سجل المجلس السابق:\n${historyText}\n---\nسؤال المستخدم: ${prompt}`;

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

        // الحفظ في البحرين
        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "ChatGPT",
            userName: "عبدالرحمن (أبو فلاح)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "ChatGPT Service Unavailable" });
    }
});

app.post('/ask-deepseek', async (req, res) => {
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory();
        const finalPrompt = `سجل المجلس:\n${historyText}\n---\nالمطلوب منك تحليل ما سبق والإجابة على: ${prompt}`;

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

        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "DeepSeek",
            userName: "عبدالرحمن (أبو فلاح)",
            userPrompt: prompt,
            botReply: reply,
            timestamp: new Date()
        });

        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: "DeepSeek Service Unavailable" });
    }
});

app.post('/ask-claude', async (req, res) => {
    const { prompt } = req.body;
    try {
        const historyText = await getRecentHistory();
        const finalPrompt = `تاريخ الحوار في المجلس:\n${historyText}\n---\nبناءً عليه، أجب بدقة على: ${prompt}`;

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

        const database = client.db("AAIO-Memory");
        await database.collection("chat_history").insertOne({
            advisor: "Claude",
            userName: "عبدالرحمن (أبو فلاح)",
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
    console.log(`✅ AAIO Server active on http://localhost:${PORT}`);
});