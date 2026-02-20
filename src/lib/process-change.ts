import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function analyzeEmailIntent(subject: string, text: string) {
    console.log('\n--- [GEMINI] Starting Intent Analysis ---');
    console.log('Loading current JSON state from disk...');

    try {
        const rootDir = path.join(process.cwd(), 'content');
        const menuStr = fs.readFileSync(path.join(rootDir, 'menu.json'), 'utf-8');
        const hoursStr = fs.readFileSync(path.join(rootDir, 'hours.json'), 'utf-8');
        const aboutStr = fs.readFileSync(path.join(rootDir, 'about.json'), 'utf-8');

        console.log('✅ Current state loaded successfully.');
        
        const systemPrompt = `
You are an AI assistant managing a pizzeria website. The owner sent an email to update content.
Determine which file they want to change (menu.json, hours.json, or about.json).
Return ONLY a valid JSON object representing the proposal for the changed file exactly as it should be written to disk.
If multiple files need changing, return the most prominent one. Do not include markdown formatting like \`\`\`json. 

CURRENT STATE:
-- menu.json --
${menuStr}

-- hours.json --
${hoursStr}

-- about.json --
${aboutStr}

EMAIL SUBJECT: ${subject}
EMAIL BODY: ${text}
`;

        console.log('🧠 Sending prompt to Gemini-1.5-Flash...');
        // console.log('Prompt snapshot:', systemPrompt.substring(0, 300) + '... (truncated)');

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text().trim();
        
        console.log('✨ Received response from Gemini!');
        console.log('Response Snippet:\n', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));

        // Strip potential markdown ticks if model ignored instruction
        let cleanedJson = responseText;
        if (cleanedJson.startsWith('\`\`\`json')) {
            cleanedJson = cleanedJson.replace(/^\`\`\`json/g, '').replace(/\`\`\`$/g, '').trim();
        }

        const parsedResult = JSON.parse(cleanedJson);
        console.log('✅ Successfully parsed Gemini response into JSON object.');
        
        return parsedResult;

    } catch (e) {
        console.error('❌ Error in Gemini Analyzer:', e);
        return null;
    }
}
