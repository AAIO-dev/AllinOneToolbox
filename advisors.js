const express = require('express');
const axios = require('axios');
const router = express.Router();

// هذه الدالة تغلف مستشاريك لتستقبل الإعدادات من السيرفر الرئيسي
module.exports = function(client, getRecentHistory, UNIFIED_PROMPT) {


// --- Gemini Advisor ---
router.post('/ask-gemini', async (req, res) => {
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
router.post('/ask-perplexity', async (req, res) => {
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
router.post('/ask-chatgpt', async (req, res) => {
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
router.post('/ask-deepseek', async (req, res) => {
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
router.post('/ask-claude', async (req, res) => {
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
router.post('/ask-llama', async (req, res) => {
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
router.post('/ask-mistral', async (req, res) => {
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
return router;
};