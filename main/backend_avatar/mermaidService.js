
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const uploadsDir = path.join(__dirname, 'uploads');


const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
};


async function renderMermaidToSvg(mermaidCode) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
  //mermaid html
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
          <script>
            mermaid.initialize({
              startOnLoad: true,
              securityLevel: 'strict',
              theme: 'default'
            });
          </script>
          <style>
            body { margin: 0; }
            .mermaid { max-width: 100%; }
          </style>
        </head>
        <body>
          <div class="mermaid">
            ${mermaidCode}
          </div>
        </body>
      </html>
    `;
    
    await page.setContent(html);
    
    await page.waitForSelector('.mermaid svg');
    
   
    const svgContent = await page.evaluate(() => {
      const svg = document.querySelector('.mermaid svg');
      return svg.outerHTML;
    });
    
    return svgContent;
  } finally {
    await browser.close();
  }
}


async function generateMermaidImage(mermaidCode) { //mermaid diagram generator
  try {
    await ensureUploadsDir();
    
    
    const filename = `diagram-${uuidv4()}.svg`;
    const filePath = path.join(uploadsDir, filename);
    
    
    const svgContent = await renderMermaidToSvg(mermaidCode);
    
   
    await fs.writeFile(filePath, svgContent);
    
    return {
      success: true,
      filename,
      path: `/uploads/${filename}`,
      svgContent //svg return
    };
  } catch (error) {
    console.error('Error generating mermaid image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


const diagramKeywords = [
  'show me',
  'analyse',
  'analyze',
  'diagram',
  'flow chart',
  'flowchart',
  'gantt chart',
  'class diagram',
  'sequence diagram', 
  'er diagram',
  'entity relationship',
  'state diagram',
  'visualize',
  'visualization',
  'visualise',
  'graph',
  'draw',
  'illustrate',
  'map out',
  'mindmap'
];

function containsDiagramRequest(message) {
  if (!message) return false;
  
  const lowerMessage = message.toLowerCase();
  return diagramKeywords.some(keyword => lowerMessage.includes(keyword));
}


async function processMermaidInMessage(message, requestsDiagram = false, diagramType = 'flowchart') {
  const mermaidRegex = /```mermaid\s+([\s\S]+?)\s+```/;
  const match = message.match(mermaidRegex);
  
  if (match && match[1]) {
    const mermaidCode = match[1].trim();
    try {
      const result = await generateMermaidImage(mermaidCode);
      
      if (result.success) {
        return {
          hasMermaid: true,
          messages: [
            {
              type: 'text',
              content: 'I\'ve processed your Mermaid diagram:'
            },
            {
              type: 'diagram',
              content: result.path,
              mermaidCode: mermaidCode,
              svgContent: result.svgContent
            }
          ]
        };
      } else {
        return {
          hasMermaid: true,
          messages: [
            {
              type: 'text',
              content: `Error creating diagram: ${result.error}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        hasMermaid: true,
        messages: [
          {
            type: 'text',
            content: `Error processing Mermaid code: ${error.message}`
          }
        ]
      };
    }
  }
  
  
  if (requestsDiagram || containsDiagramRequest(message)) {
    let generatedMermaidCode = '';
    
    switch (diagramType) {
      case 'flowchart':
        generatedMermaidCode = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`;
        break;
      case 'sequenceDiagram':
        generatedMermaidCode = `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System->>System: Process
    System-->>User: Response`;
        break;
      case 'gantt':
        generatedMermaidCode = `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Task 1           :a1, 2023-01-01, 30d
    Task 2           :after a1, 20d
    section Phase 2
    Task 3           :2023-02-20, 15d`;
        break;
      case 'classDiagram':
        generatedMermaidCode = `classDiagram
    class Main {
      +String name
      +process()
    }
    class Helper {
      +assist()
    }
    Main --> Helper`;
        break;
      case 'erDiagram':
        generatedMermaidCode = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ITEM : contains`;
        break;
      case 'stateDiagram':
        generatedMermaidCode = `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Start
    Processing --> Complete
    Processing --> Error
    Complete --> [*]
    Error --> Idle: Retry`;
        break;
      case 'pie':
        generatedMermaidCode = `pie
    title Distribution
    "Category A" : 30
    "Category B" : 45
    "Category C" : 25`;
        break;
      case 'mindmap':
        generatedMermaidCode = `mindmap
    root((Main Topic))
      Subtopic 1
        Detail A
        Detail B
      Subtopic 2
        Detail C`;
        break;
      default:
        generatedMermaidCode = `flowchart TD
    A[Start] --> B[Process]
    B --> C[End]`;
    }
    
    try {
 
      const result = await generateMermaidImage(generatedMermaidCode);
      
      if (result.success) {
        return {
          hasMermaid: true,
          messages: [
            {
              type: 'text',
              content: `Here's a ${diagramType} diagram based on your request:`
            },
            {
              type: 'diagram',
              content: result.path,
              mermaidCode: generatedMermaidCode,
              svgContent: result.svgContent
            }
          ]
        };
      } else {
        return {
          hasMermaid: false,
          messages: [
            {
              type: 'text',
              content: `I couldn't generate a diagram: ${result.error}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        hasMermaid: false,
        messages: [
          {
            type: 'text',
            content: `Error generating diagram: ${error.message}`
          }
        ]
      };
    }
  }
  

  return { hasMermaid: false };
}


export {
  processMermaidInMessage,
  generateMermaidImage,
  containsDiagramRequest,
  uploadsDir
};