import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import ElevenLabs from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import axios from "axios";
import path from "path";
import { createHash } from "crypto";
import { createReadStream } from "fs";



dotenv.config();



const llamaApiKey = process.env.LLAMA_API_KEY || "";
const llamaApiUrl = process.env.LLAMA_API_URL || "https://api.groq.com/openai/v1/chat/completions";

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "3gsg3cxXyFLcGIfNbM6C"; //Raju voice ID(relatable indian)


const elevenLabs = new ElevenLabs({
    apiKey: elevenLabsApiKey,
    voiceId: voiceID
});

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;


const audioCache = new Map();
const responseCache = new Map();
const staticFileCache = new Map();
const llamaResponseCache = new Map();
const MAX_CACHE_SIZE = 100; 


const CACHE_DURATION = 24 * 60 * 60 * 1000; 


const PRELOADED_RESPONSES = {
  emptyMessage: null,
  noApiKeys: null,
  error: null
};


async function ensureDirectoryExists(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}


async function readFileAsStream(filePath, encoding = null) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(filePath, encoding ? { encoding } : undefined);
    
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => {
      if (encoding) {
        resolve(chunks.join(''));
      } else {
        resolve(Buffer.concat(chunks).toString('base64'));
      }
    });
    stream.on('error', reject);
  });
}


(async () => {
  await ensureDirectoryExists('audios');
  await ensureDirectoryExists('cache');
  
  
  try {

    const [introAudio, introLipsync] = await Promise.all([
      readFileAsStream("audios/ElevenLabs_2025-03-08T03_59_21_Bill_pre_s50_sb75_se0_b_m2.wav"),
      fs.readFile("audios/intro_0.json", "utf8").then(JSON.parse)
    ]);
    
    PRELOADED_RESPONSES.emptyMessage = {
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: introAudio,
          lipsync: introLipsync,
          facialExpression: "smile",
          animation: "talking_1",
        },
      ],
    };
    

    const [api0Audio, api0Lipsync, api1Audio, api1Lipsync] = await Promise.all([
      readFileAsStream("audios/api_0.wav"),
      fs.readFile("audios/api_0.json", "utf8").then(JSON.parse),
      readFileAsStream("audios/api_1.wav"),
      fs.readFile("audios/api_1.json", "utf8").then(JSON.parse)
    ]);
    
    PRELOADED_RESPONSES.noApiKeys = {
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: api0Audio,
          lipsync: api0Lipsync,
          facialExpression: "angry",
          animation: "talking_2",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy Llama and ElevenLabs bill, right?",
          audio: api1Audio,
          lipsync: api1Lipsync,
          facialExpression: "smile",
          animation: "laughing_slowly",
        },
      ],
    };
    
   
    PRELOADED_RESPONSES.error = {
      messages: [
        {
          text: "I'm sorry, there was an error connecting to my brain. Can we try again?",
          facialExpression: "sad",
          animation: "silly_dance",
        },
      ],
    };
    
    console.log("Preloaded common responses");
  } catch (error) {
    console.error("Error preloading responses:", error);
  }
})();

// Generate hash
function getTextHash(text) {
  return createHash('md5').update(text).digest('hex');
}


function getRequestHash(message) {
  return createHash('md5').update(message || "empty").digest('hex');
}


const execCommandWithTimeout = (command, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const childProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
    

    const timeout = setTimeout(() => {
      childProcess.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    

    childProcess.on('exit', () => clearTimeout(timeout));
  });
};
app.get('/check-transcription-setup', (req, res) => {
  const status = {
    openai_api: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    whisper_local: process.env.WHISPER_MODEL_PATH ? 'configured' : 'not configured',
    ffmpeg: 'checking...'
  };
  
  // Check ffmpeg 
  exec('ffmpeg -version', (error) => {
    if (error) {
      status.ffmpeg = 'not installed';
    } else {
      status.ffmpeg = 'installed';
    }
    
    status.transcription_available = 
      status.openai_api === 'configured' || 
      (status.whisper_local === 'configured' && status.ffmpeg === 'installed');
    
    res.json(status);
  });
});


app.use((req, res, next) => {
  if (req.path === '/transcribe') {
    console.log(`Transcription request received: ${new Date().toISOString()}`);
  }
  next();
});


const generateLipSync = async (wavFile, jsonFile, retryCount = 1) => {
  try {
    console.log(`Generating lip-sync for ${wavFile} (attempt ${retryCount})`);
    
    
    try {
      await fs.access(wavFile);
    } catch (err) {
      console.error(`WAV file doesn't exist: ${wavFile}`);
      return false;
    }
    
    
    const stats = await fs.stat(wavFile);
    if (stats.size === 0) {
      console.error(`WAV file is empty: ${wavFile}`);
      return false;
    }

   
    const timeout = retryCount === 1 ? 10000 : 6000;
    
    // Execute Rhubarb
    try {
      await execCommandWithTimeout(
        `./bin/rhubarb -f json -o "${jsonFile}" "${wavFile}" -r phonetic --logLevel info`,
        timeout
      );
    } catch (execError) {
      console.error(`Rhubarb execution failed: ${execError.message}`);
      

      if (retryCount === 1) {
        console.log(`Retrying with different recognizer for ${wavFile}`);
        return generateLipSync(wavFile, jsonFile, retryCount + 1);
      }
      return false;
    }
    
   
    try {
      const data = await fs.readFile(jsonFile, 'utf8');
      const json = JSON.parse(data);
    
      if (json && json.mouthCues && json.mouthCues.length > 0) {
        console.log(`Successful lip-sync generation for ${wavFile}`);
        return true;
      } else {
        console.warn(`Generated lipsync file has invalid format: ${jsonFile}`);
        return false;
      }
    } catch (err) {
      console.warn(`Generated lipsync file is invalid: ${err.message}`);
      return false;
    }
  } catch (error) {
    console.error(`Lip sync generation failed with error: ${error.message}`);
    return false;
  }
};

// Convert mp3 to wav 
const convertMp3ToWav = async (mp3File, wavFile) => {
  try {
 
    try {
      await fs.access(mp3File);
    } catch (err) {
      console.error(`MP3 file doesn't exist: ${mp3File}`);
      return false;
    }
    

    const stats = await fs.stat(mp3File);
    if (stats.size === 0) {
      console.error(`MP3 file is empty: ${mp3File}`);
      return false;
    }
    
    console.log(`Converting ${mp3File} to ${wavFile}`);
    
    
    await execCommandWithTimeout(
      `ffmpeg -y -i "${mp3File}" -ar 16000 -ac 1 -acodec pcm_s16le "${wavFile}" -v warning`, 
      5000 // 5 second
    );
    
  
    try {
      await fs.access(wavFile);
      const wavStats = await fs.stat(wavFile);
      
      if (wavStats.size === 0) {
        console.error(`Converted WAV file is empty: ${wavFile}`);
        return false;
      }
      
      
      const header = Buffer.alloc(12);
      const fd = await fs.open(wavFile, 'r');
      await fd.read(header, 0, 12, 0);
      await fd.close();
      
     
      const isValidWav = 
        header.toString('ascii', 0, 4) === 'RIFF' && 
        header.toString('ascii', 8, 12) === 'WAVE';
      
      if (!isValidWav) {
        console.error(`Invalid WAV format in ${wavFile}`);
        return false;
      }
      
      console.log(`Successfully converted ${mp3File} to WAV`);
      return true;
    } catch (err) {
      console.error(`WAV file validation failed: ${err.message}`);
      return false;
    }
  } catch (error) {
    console.error(`FFmpeg conversion failed: ${error.message}`);
    return false;
  }
};


async function checkRhubarbBinary() {
  const rhubarbPath = './bin/rhubarb';
  
  try {
 
    await fs.access(rhubarbPath);
    console.log('Rhubarb binary found, checking permissions...');
    

    if (process.platform !== 'win32') {
      try {
       
        const stats = await fs.stat(rhubarbPath);
        const currentMode = stats.mode;
        
        if ((currentMode & 0o111) === 0) {
          console.log('Adding executable permission to Rhubarb binary');
          await fs.chmod(rhubarbPath, currentMode | 0o111);
        }
        
  await execCommandWithTimeout(`${rhubarbPath} --version`, 2000);
        console.log('Rhubarb binary is executable and working');
      } catch (error) {
        console.error(`Error with Rhubarb permissions: ${error.message}`);
        
       
        try {
          await execCommandWithTimeout(`chmod +x ${rhubarbPath}`, 1000);
          console.log('Fixed Rhubarb permissions using chmod');
        } catch (chmodError) {
          console.error(`Failed to fix Rhubarb permissions: ${chmodError.message}`);
          throw new Error('Please make Rhubarb binary executable with: chmod +x ./bin/rhubarb');
        }
      }
    }
  } catch (error) {
  console.error(`Rhubarb binary issue: ${error.message}`);
    throw new Error('Rhubarb binary not found or not executable. Please check the ./bin directory');
  }
}


(async () => {
  await ensureDirectoryExists('audios');
  await ensureDirectoryExists('cache');
            try {
    await checkRhubarbBinary();
  } catch (error) {
    console.error(`WARNING: ${error.message}`);
    console.warn('Lip-sync generation may fail without proper Rhubarb setup');
  }

})();


const createFallbackLipSync = async (jsonFile, audioFile = null) => {
  let duration = 5; // Default duration
  
  
  if (audioFile) {
    try {
      const durationOutput = await execCommandWithTimeout(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`,
        2000
      );
      const estimatedDuration = parseFloat(durationOutput.trim());
      if (!isNaN(estimatedDuration) && estimatedDuration > 0) {
        duration = estimatedDuration;
      }
    } catch (error) {
      
    }
  }
  
  const fallbackData = {
    "metadata": {"version": 1},
    "mouthCues": [
      {"start": 0, "end": duration * 0.25, "value": "X"},
      {"start": duration * 0.25, "end": duration * 0.5, "value": "A"},
      {"start": duration * 0.5, "end": duration * 0.75, "value": "O"},
      {"start": duration * 0.75, "end": duration, "value": "X"}
    ]
  };
  
  await fs.writeFile(jsonFile, JSON.stringify(fallbackData), 'utf8');
  
 
  try {
    await fs.access(jsonFile);
    return true;
  } catch (error) {
    console.error(`Failed to create fallback lipsync file: ${error.message}`);
    return false;
  }
};


const getAudioFromCache = async (text) => {
  const hash = getTextHash(text);
  const cacheFile = `cache/${hash}`;
  

  if (audioCache.has(hash)) {
    const cachedData = audioCache.get(hash);

    try {
      await Promise.all([
        fs.access(cachedData.audioFile),
        fs.access(cachedData.lipsyncFile)
      ]);
      return cachedData;
    } catch {
     
      audioCache.delete(hash);
    }
  }
  
  try {
   
    await Promise.all([
      fs.access(`${cacheFile}.mp3`),
      fs.access(`${cacheFile}.json`)
    ]);
    
    try {
      const lipsyncData = await fs.readFile(`${cacheFile}.json`, 'utf8');
      const json = JSON.parse(lipsyncData);
      

      if (!json || !json.mouthCues || json.mouthCues.length === 0) {
        throw new Error("Invalid lipsync data");
      }

      const result = {
        audioFile: `${cacheFile}.mp3`,
        lipsyncFile: `${cacheFile}.json`,
        cached: true
      };

      audioCache.set(hash, result);
      
      return result;
    } catch (error) {
      console.warn(`Cached lipsync file is invalid: ${error.message}`);

    }
  } catch {

  }
  
  return { cached: false, hash, cacheFile };
};


const processMessage = async (message, sessionId, index) => {
  const textInput = message.text;
  if (!textInput) {
    return {
      ...message,
      audio: "",
      lipsync: {"metadata":{"version":1},"mouthCues":[{"start":0,"end":5,"value":"X"}]}
    };
  }
  

  const cacheResult = await getAudioFromCache(textInput);
  let audioFilePath, lipsyncFilePath;
  
  if (cacheResult.cached) {

    audioFilePath = cacheResult.audioFile;
    lipsyncFilePath = cacheResult.lipsyncFile;
    console.log(`Using cached audio and lipsync for message ${index}`);
  } else {

    const hash = cacheResult.hash;
    const cacheFile = cacheResult.cacheFile;
    audioFilePath = `audios/message_${sessionId}_${index}.mp3`;
    const wavFilePath = `audios/message_${sessionId}_${index}.wav`;
    lipsyncFilePath = `audios/message_${sessionId}_${index}.json`;
    
    try {

      await elevenLabs.textToSpeech({
        voiceId: voiceID,
        fileName: audioFilePath,
        textInput: textInput,
        stability: 0.5,
        similarityBoost: 0.75
      });
      
 
      try {
        await fs.access(audioFilePath);
      } catch (err) {
        throw new Error(`Audio file not generated: ${err.message}`);
      }
      

      const conversionSuccess = await convertMp3ToWav(audioFilePath, wavFilePath);
      let lipsyncSuccess = false;
      
      if (conversionSuccess) {
  
        lipsyncSuccess = await generateLipSync(wavFilePath, lipsyncFilePath);
        if (lipsyncSuccess) {
          try {
            const data = await fs.readFile(lipsyncFilePath, 'utf8');
            JSON.parse(data); 
          } catch (err) {
            console.warn(`Lipsync file invalid: ${err.message}`);
            lipsyncSuccess = false;
          }
        }
      }
      
      
      if (!lipsyncSuccess) {
        console.log(`Creating fallback lipsync for message ${index}`);
        await createFallbackLipSync(lipsyncFilePath, audioFilePath);
      }
   
      try {
        await Promise.all([
          fs.access(audioFilePath),
          fs.access(lipsyncFilePath)
        ]);
        
        await Promise.all([
          fs.copyFile(audioFilePath, `${cacheFile}.mp3`),
          fs.copyFile(lipsyncFilePath, `${cacheFile}.json`)
        ]);
        
        console.log(`Successfully cached files for message ${index}`);
      } catch (cacheError) {
        console.error(`Failed to cache files: ${cacheError.message}`);
      }
    } catch (error) {
      console.error(`Error processing message ${index}:`, error);
      
    
      try {
        await fs.access(audioFilePath);
      } catch {
 
        try {
          await execCommandWithTimeout(
            `ffmpeg -y -f lavfi -i anullsrc=r=16000:cl=mono -t 3 "${audioFilePath}"`, 
            2000
          );
        } catch (ffmpegError) {
          console.error(`Failed to create empty audio: ${ffmpegError.message}`);
        }
      }
      
      // Create fallback lipsync
      await createFallbackLipSync(lipsyncFilePath, audioFilePath);
      try {
        await Promise.all([
          fs.access(audioFilePath),
          fs.access(lipsyncFilePath)
        ]);
      } catch {
        return {
          ...message,
          audio: "",
          lipsync: {"metadata":{"version":1},"mouthCues":[{"start":0,"end":5,"value":"X"}]}
        };
      }
    }
  }
  
  let audio = "";
  let lipsync = {"metadata":{"version":1},"mouthCues":[{"start":0,"end":5,"value":"X"}]};
  
  try {
    audio = await readFileAsStream(audioFilePath);
  } catch (error) {
    console.error(`Failed to read audio file: ${error.message}`);
  }
  
  try {
    const lipsyncData = await fs.readFile(lipsyncFilePath, "utf8");
    lipsync = JSON.parse(lipsyncData);
  } catch (error) {
    console.error(`Failed to read lipsync file: ${error.message}`);
    await createFallbackLipSync(lipsyncFilePath, audioFilePath);
    
    try {
      const fallbackData = await fs.readFile(lipsyncFilePath, "utf8");
      lipsync = JSON.parse(fallbackData);
    } catch {
    }
  }
  
  return {
    ...message,
    audio,
    lipsync
  };
};
app.post('/api/llama', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid message. Please provide a non-empty string.' 
      });
    }

    console.log(`Received message: "${message}"`);
    
    const response = await getLlamaResponse(message);
    
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Error processing LLaMA request:', error);
    return res.status(500).json({ 
      error: 'Internal server error occurred while processing your request.' 
    });
  }
});
async function processMessagesWithBatching(messages, sessionId) {
  const batchSize = 2; 
  const processedMessages = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchPromises = batch.map((message, batchIndex) => 
      processMessage(message, sessionId, i + batchIndex)
        .catch(error => {
          console.error(`Failed to process message ${i + batchIndex}:`, error);
          return {
            ...message,
            audio: "",
            lipsync: {"metadata":{"version":1},"mouthCues":[{"start":0,"end":5,"value":"X"}]}
          };
        })
    );
    
    const batchResults = await Promise.all(batchPromises);
    processedMessages.push(...batchResults);
    
    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return processedMessages;
}

async function getLlamaResponse(userMessage) {
  const cacheKey = getRequestHash(userMessage);
  if (llamaResponseCache.has(cacheKey)) {
    return llamaResponseCache.get(cacheKey);
  }
  
  try {
    const llamaResponse = await axios.post(
      llamaApiUrl,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:` You are a highly knowledgeable and friendly Virtual Tutor, helping students prepare for their exams.  
            You provide step-by-step explanations, breaking down complex concepts with simple analogies and examples.  
            You act like a real tutor, engaging with the student rather than just reading text. 

            - **JSON Output Format:**  
            Always return a JSON array with **a maximum of 3 messages**.  
            Each message includes:  
            -text : (A detailed, engaging explanation)  
            The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
              The different animations are: talking_0, talking_1, talking_2, idle, laughing_slowly, silly_dance, telling_secret.`},
          {
            role: "user",
            content: userMessage || "Hello"
          }
        ],
        temperature: 0.7,  
        max_tokens: 2048,  
        top_p: 0.9,        
        frequency_penalty: 0.2, 
        presence_penalty: 0.4,  
        stream: false,
        stop: null,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Authorization": `Bearer ${llamaApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 7000 
      }
    );
  
    let messages;
    try {
      const responseContent = llamaResponse.data.choices?.[0]?.message?.content || "{}";
      const parsedContent = JSON.parse(responseContent);
      
      messages = parsedContent.messages || parsedContent;
      
      if (!Array.isArray(messages)) {
        messages = [messages];
      }

      messages = messages.slice(0, 3);

      llamaResponseCache.set(cacheKey, messages);

      if (llamaResponseCache.size > MAX_CACHE_SIZE) {
        const oldestKey = llamaResponseCache.keys().next().value;
        llamaResponseCache.delete(oldestKey);
      }
      
      return messages;
    } catch (error) {
      console.error("Error parsing Llama response:", error);
      const fallbackMessage = [
        {
          text: "I'm having trouble understanding right now. Could you ask me something else?",
          facialExpression: "sad",
          animation: "idle",
        },
      ];
      
      llamaResponseCache.set(cacheKey, fallbackMessage);
      
      return fallbackMessage;
    }
  } catch (error) {
    console.error("Error in Llama request:", error);
    return [
      {
        text: "I'm having trouble connecting right now. Could you try again?",
        facialExpression: "sad",
        animation: "idle",
      },
    ];
  }
}

function extractTextFromLlamaMessages(messages) {
  if (!Array.isArray(messages)) {
    console.error("Expected array of messages but received:", typeof messages);
    return "";
  }
  
  return messages
    .map(message => message.text || "")
    .filter(text => text.trim() !== "")
    .join(" ");
}

async function generateMermaidFromText(textContent) {
  try {
    const llamaResponse = await axios.post(
      llamaApiUrl,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a diagram assistant. Convert the following text description into valid Mermaid diagram code.
            Do not include any explanations or comments outside the Mermaid code block.
            Your response should contain ONLY the Mermaid code.` 
          },
          {
            role: "user",
            content: `Convert this text into an appropriate Mermaid diagram:
            ${textContent} without syntax errors`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null,
        response_format: { type: "text" }
      },
      {
        headers: {
          "Authorization": `Bearer ${llamaApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }
    );
    
    let mermaidCode = llamaResponse.data.choices[0].message.content.trim();
    
    mermaidCode = fixMermaidSyntax(mermaidCode);
    
    console.log("Generated Mermaid diagram:", mermaidCode);
    return mermaidCode;
  } catch (error) {
    console.error("Error generating Mermaid diagram:", error);
    return "graph TD\n A[Error] --> B[Failed to generate diagram]";
  }
}

function fixMermaidSyntax(code) {
  return code
    .replace(/-->\|([^>]*)\|>/g, '-->|$1|') 
    .replace(/class\s+(\w+)\s+(\w+)\./g, 'class $1 $2') 
    .replace(/;\s*$/gm, '') 
}

let currentMermaidCode = "graph TD\n A[Default] --> B[No diagram generated yet]";



function getCurrentMermaidCode() {
  return currentMermaidCode;
}

export {
  processLlamaResponseToMermaid,
  getCurrentMermaidCode,
  extractTextFromLlamaMessages,
  generateMermaidFromText
};
async function handleUserMessage(req, res) {
  try {
    const userMessage = req.body.message; 

    if (!userMessage) {
      return res.status(400).json({ error: "User message is required." });
    }

    const llamaMessages = await getLlamaResponse(userMessage);

    const mermaidCode = await processLlamaResponseToMermaid(userMessage);

    res.json({
      messages: llamaMessages,
      mermaidDiagram: mermaidCode
    });

  } catch (error) {
    console.error("Error handling user message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  try {
    if (staticFileCache.has('voices')) {
      return res.send(staticFileCache.get('voices'));
    }
    
    const voices = await elevenLabs.getVoices();
    staticFileCache.set('voices', voices);
    res.send(voices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).send({ error: "Failed to fetch voices" });
  }
});

const USE_RESPONSE_CACHE = false;
const validateLipsyncData = (lipsync) => {
  if (!lipsync) return false;
  
  try {
    if (!lipsync.metadata || !lipsync.mouthCues) return false;
    if (!Array.isArray(lipsync.mouthCues) || lipsync.mouthCues.length === 0) return false;
    
    for (const cue of lipsync.mouthCues) {
      if (
        typeof cue.start !== 'number' || 
        typeof cue.end !== 'number' || 
        typeof cue.value !== 'string' ||
        cue.start >= cue.end
      ) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const sessionId = new Date().getTime();
  
  if (USE_RESPONSE_CACHE) {
    const requestHash = getRequestHash(userMessage);
    if (responseCache.has(requestHash)) {
      console.log("💹 Returning cached response");
      return res.send(responseCache.get(requestHash));
    }
  }
  
  if (!userMessage) {
    if (PRELOADED_RESPONSES.emptyMessage) {
      return res.send(PRELOADED_RESPONSES.emptyMessage);
    }
    
    try {
      const [audio, lipsync] = await Promise.all([
        readFileAsStream("audios/ElevenLabs_2025-03-08T03_59_21_Bill_pre_s50_sb75_se0_b_m2.wav"),
        fs.readFile("audios/intro_0.json", "utf8").then(JSON.parse)
      ]);
      
      const response = {
        messages: [
          {
            text: "Hey dear... How was your day?",
            audio: audio,
            lipsync: lipsync,
            facialExpression: "smile",
            animation: "talking_1",
          },
        ],
      };
      
      if (USE_RESPONSE_CACHE) {
        responseCache.set(getRequestHash(userMessage), response);
      }
      
      res.send(response);
      
    } catch (error) {
      console.error("Error loading intro files:", error);
      res.send({
        messages: [
          {
            text: "Hey dear... How was your day?",
            facialExpression: "smile",
            animation: "talking_1",
          },
        ],
      });
    }
    return;
  }
  
  if (!elevenLabsApiKey || !llamaApiKey) {
    if (PRELOADED_RESPONSES.noApiKeys) {
      return res.send(PRELOADED_RESPONSES.noApiKeys);
    }
    
    try {
      const [audio0, lipsync0, audio1, lipsync1] = await Promise.all([
        readFileAsStream("audios/api_0.wav"),
        fs.readFile("audios/api_0.json", "utf8").then(JSON.parse),
        readFileAsStream("audios/api_1.wav"),
        fs.readFile("audios/api_1.json", "utf8").then(JSON.parse)
      ]);
      
      const response = {
        messages: [
          {
            text: "Please my dear, don't forget to add your API keys!",
            audio: audio0,
            lipsync: lipsync0,
            facialExpression: "angry",
            animation: "talking_2",
          },
          {
            text: "You don't want to ruin Wawa Sensei with a crazy Llama and ElevenLabs bill, right?",
            audio: audio1,
            lipsync: lipsync1,
            facialExpression: "smile",
            animation: "laughing_slowly",
          },
        ],
      };
      
      res.send(response);
    } catch (error) {
      console.error("Error loading API key warning files:", error);
      res.status(500).send({ error: "Failed to load static files" });
    }
    return;
  }

  try {
    const messages = await getLlamaResponse(userMessage);
    const processedMessages = await processMessagesWithBatching(messages, sessionId);
    
    let mermaidCode = null;
    try {
      mermaidCode = await processLlamaResponseToMermaid(userMessage);
      
      if (mermaidCode) {
        console.log("\n🔷 MERMAID DIAGRAM GENERATED:");
        console.log("```mermaid");
        console.log(mermaidCode);
        console.log("```\n");
      } else {
        console.log("⚠️ No mermaid diagram generated for this query");
      }
    } catch (mermaidError) {
      console.error("Error generating mermaid diagram:", mermaidError);
    }
    
    const validateLipsyncData = (lipsync) => {
      if (!lipsync) return false;
      
      try {
        if (!lipsync.metadata || !lipsync.mouthCues) return false;
        if (!Array.isArray(lipsync.mouthCues) || lipsync.mouthCues.length === 0) return false;
        
        for (const cue of lipsync.mouthCues) {
          if (
            typeof cue.start !== 'number' || 
            typeof cue.end !== 'number' || 
            typeof cue.value !== 'string' ||
            cue.start >= cue.end
          ) {
            return false;
          }
        }
        
        return true;
      } catch (error) {
        return false;
      }
    };
    
    for (let i = 0; i < processedMessages.length; i++) {
      const message = processedMessages[i];
      
      if (!validateLipsyncData(message.lipsync)) {
        console.log(`Message ${i} has invalid lipsync, generating reliable fallback`);
        
        const textLength = message.text?.length || 10;
        const estimatedDuration = Math.max(3, Math.min(10, textLength * 0.06));
        
        message.lipsync = {
          "metadata": {"version": 1},
          "mouthCues": [
            {"start": 0, "end": estimatedDuration * 0.25, "value": "X"},
            {"start": estimatedDuration * 0.25, "end": estimatedDuration * 0.5, "value": "A"},
            {"start": estimatedDuration * 0.5, "end": estimatedDuration * 0.75, "value": "O"},
            {"start": estimatedDuration * 0.75, "end": estimatedDuration, "value": "X"}
          ]
        };
      }
      
      if (message.audio === undefined) {
        message.audio = "";
      }
    }
    
    const response = { 
      messages: processedMessages,
      mermaidDiagram: mermaidCode
    };
    
    if (USE_RESPONSE_CACHE) {
      const requestHash = getRequestHash(userMessage);
      responseCache.set(requestHash, response);
      
      if (responseCache.size > MAX_CACHE_SIZE) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
    }
    
    try {
      JSON.stringify(response);
      res.send(response);
    } catch (jsonError) {
      console.error("Response contains unstringifiable data:", jsonError);
      res.status(500).send(PRELOADED_RESPONSES.error || {
        messages: [{
          text: "I'm sorry, there was an error preparing my response. Can we try again?",
          facialExpression: "sad",
          animation: "silly_dance",
        }]
      });
    }
  } catch (error) {
    console.error("Error in request:", error);
    
    if (PRELOADED_RESPONSES.error) {
      res.status(500).send(PRELOADED_RESPONSES.error);
    } else {
      res.status(500).send({
        messages: [
          {
            text: "I'm sorry, there was an error connecting to my brain. Can we try again?",
            facialExpression: "sad",
            animation: "silly_dance",
          },
        ],
      });
    }
  }
});

async function processLlamaResponseToMermaid(userMessage) {
  const llamaMessages = await getLlamaResponse(userMessage);
  const textContent = extractTextFromLlamaMessages(llamaMessages);
  
  if (!textContent || textContent.trim() === "") {
    console.warn("No text content extracted from Llama response");
    currentMermaidCode = "graph TD\n  A[No Content] --> B[No diagram generated]";
    return currentMermaidCode;
  }
  
  const mermaidCode = await generateMermaidFromText(textContent);
  currentMermaidCode = mermaidCode;
  
  return currentMermaidCode;
}

app.post('/getMermaidDiagram', async (req, res) => {
  try {
    const mermaidCode = getCurrentMermaidCode();
    const svgContent = await renderMermaidToSvg(mermaidCode);
    
    res.json({
      success: true,
      mermaidCode: mermaidCode,
      svgContent: svgContent
    });
  } catch (error) {
    console.error('Error getting Mermaid diagram:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const cleanupOldFiles = async () => {
  try {
    const [audioFiles, cacheFiles] = await Promise.all([
      fs.readdir('audios'),
      fs.readdir('cache')
    ]);
    
    const now = new Date().getTime();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - CACHE_DURATION;
    
    const audioFilesToDelete = audioFiles.filter(file => 
      file.startsWith('message_') && 
      !file.includes('intro') && 
      !file.includes('api')
    );
    
    const batchSize = 20;
    for (let i = 0; i < audioFilesToDelete.length; i += batchSize) {
      const batch = audioFilesToDelete.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        const filePath = path.join('audios', file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs < oneHourAgo) {
            await fs.unlink(filePath);
          }
        } catch (error) {
        }
      }));
    }
    
    for (let i = 0; i < cacheFiles.length; i += batchSize) {
      const batch = cacheFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        const filePath = path.join('cache', file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs < oneDayAgo) {
            await fs.unlink(filePath);
          }
        } catch (error) {
        }
      }));
    }
    
    if (audioCache.size > MAX_CACHE_SIZE * 0.8) {
      const keysToRemove = [...audioCache.keys()].slice(0, MAX_CACHE_SIZE * 0.2);
      keysToRemove.forEach(key => audioCache.delete(key));
    }
    
    if (responseCache.size > MAX_CACHE_SIZE * 0.8) {
      const keysToRemove = [...responseCache.keys()].slice(0, MAX_CACHE_SIZE * 0.2);
      keysToRemove.forEach(key => responseCache.delete(key));
    }
    
    if (llamaResponseCache.size > MAX_CACHE_SIZE * 0.8) {
      const keysToRemove = [...llamaResponseCache.keys()].slice(0, MAX_CACHE_SIZE * 0.2);
      keysToRemove.forEach(key => llamaResponseCache.delete(key));
    }
    
  } catch (error) {
    console.error('Error during file cleanup:', error);
  }
};

setInterval(cleanupOldFiles, 60 * 60 * 1000);

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.stack || error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason?.stack || reason);
});

app.listen(port, () => {
  console.log(`Study Buddy listening on port ${port} - optimized version running`);
  
  const memUsage = process.memoryUsage();
  console.log(`Memory usage: ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB Heap`);
});