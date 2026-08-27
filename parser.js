const fs = require('fs');
const axios = require('axios');

// 🔴 APNI GEMINI API KEY YAHAN DAALO
const GEMINI_API_KEY = "AIzaSyB9bWGdJQYZ960T3fyWle8HGvcSGywamYg"; 

async function parseScriptWithAI() {
  console.log("🚀 AI Parser Started...");
  
  // 1. Raw script read karo
  const rawScript = fs.readFileSync('script.txt', 'utf-8');
  
  // 2. Script ko chunks me todo (Har baar ~15,000 characters bhejenge taaki AI thake nahi)
  const chunkSize = 15000;
  let chunks = [];
  for (let i = 0; i < rawScript.length; i += chunkSize) {
    chunks.push(rawScript.substring(i, i + chunkSize));
  }

  console.log(`📁 Total parts to process: ${chunks.length}`);
  let finalScriptData = [];

  // 3. Ek-ek karke AI ko bhejenge
  for (let i = 0; i < chunks.length; i++) {
    console.log(`⏳ Processing Part ${i + 1} of ${chunks.length}...`);
    
    const promptText = `
    You are an expert Hollywood script parser. I am giving you a chunk of raw text extracted from a PDF. It is messy, and words/sentences might be squashed together.
    
    Task: Fix the text and extract it into a structured JSON array.
    Rules:
    1. Identify Scene Headings (e.g. EXT. PARK - DAY) -> {"type": "sceneHeading", "text": "..."}
    2. Identify Action Lines -> {"type": "action", "text": "..."}
    3. Identify Characters and their Dialogues -> {"type": "dialogue", "character": "...", "text": "..."}
    4. Fix formatting errors and spacing. Do not cut off sentences.
    5. RETURN ONLY VALID JSON. No markdown, no \`\`\`json wrappers.

    Here is the messy script text:
    ${chunks[i]}
    `;

    const jsonSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          character: { type: "string" },
          text: { type: "string" }
        },
        required: ["type", "text"]
      }
    };

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { 
          responseMimeType: "application/json", 
          responseSchema: jsonSchema 
        },
      };

      const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
      
      if (response.data && response.data.candidates) {
        const rawJson = response.data.candidates[0].content.parts[0].text;
        const parsedChunk = JSON.parse(rawJson);
        
        finalScriptData = finalScriptData.concat(parsedChunk);
        console.log(`✅ Part ${i + 1} Done!`);
      }

      // API rate limit se bachne ke liye 2 second ka gap
      await new Promise(resolve => setTimeout(resolve, 2000)); 

    } catch (error) {
      console.error(`❌ Error in Part ${i + 1}:`, error.message);
    }
  }

  // 4. Sab kuch jodne ke baad ek clean JSON file save karo
  fs.writeFileSync('full_script.json', JSON.stringify(finalScriptData, null, 2));
  console.log("🎉 SUCCESS! Poori script 'full_script.json' me save ho gayi hai. Total items:", finalScriptData.length);
}

parseScriptWithAI();