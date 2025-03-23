import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ChatContext = createContext();

// Keywords that should trigger a diagram
const DIAGRAM_TRIGGER_KEYWORDS = [
  'show me', 'analyze', 'analyse', 'diagram', 'flow chart', 'flowchart', 
  'gantt chart', 'class diagram', 'sequence diagram', 'er diagram', 
  'entity relationship', 'state diagram', 'visualize', 'visualization', 
  'graph', 'draw', 'illustrate', 'mindmap', 'pie chart'
];

// Helper function to check if a message contains any trigger keywords
const containsDiagramTrigger = (message) => {
  if (!message) return false;
  const lowerCaseMessage = message.toLowerCase();
  return DIAGRAM_TRIGGER_KEYWORDS.some(keyword => 
    lowerCaseMessage.includes(keyword.toLowerCase())
  );
};

export const ChatProvider = ({ children }) => {
  // State variables
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [stage, setStage] = useState("subject");
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { sender: "system", text: "Welcome to your learning session! How can I assist you?" }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  // Update message based on current stage
  useEffect(() => {
    let newMessage = "";
    if (stage === "subject") {
      newMessage = "Which subject do you want to learn?";
    } else if (stage === "upload") {
      newMessage = `Please upload your course materials for ${subject}.`;
    } else if (stage === "topic") {
      newMessage = `Which topics in ${subject} do you want to focus on?`;
    } else if (stage === "completed") {
      newMessage = `Great! We're ready to start learning ${subject}.`;
    }
    setMessage(newMessage);
  }, [stage, subject]);

  // Update current message from message queue
  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  // Dedicated function to send chat messages without affecting stage progression
  const sendChatMessage = async (userMessage) => {
    try {
      setLoading(true);
      
      // Add user message to chat history immediately for better UX
      setChatMessages(prev => [
        ...prev, 
        { sender: "user", text: userMessage, timestamp: new Date().toISOString() }
      ]);
      
      // Show thinking indicator
      setIsThinking(true);
      
      // Check if message contains diagram trigger keywords
      const shouldRequestDiagram = containsDiagramTrigger(userMessage);
      
      // Call backend API
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: userMessage,
          subject: subject,
          topics: topics,
          requestDiagram: shouldRequestDiagram // Send flag to backend
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle LLama response messages - Remove thinking indicator
      setIsThinking(false);
      
      if (data.messages && Array.isArray(data.messages)) {
        // Add to message queue for speech/animation
        setMessages(prevMessages => [...prevMessages, ...data.messages]);
        
        // Also add to chat message history
        const systemMessages = data.messages.map(msg => ({
          sender: "system",
          text: msg.text || "",
          timestamp: new Date().toISOString()
        }));
        
        setChatMessages(prev => [...prev, ...systemMessages]);
      }
      
      // Handle Mermaid diagram if present AND if trigger was detected
      if (shouldRequestDiagram && data.mermaidDiagram) {
        setCurrentDiagram(data.mermaidDiagram);
      }
    } catch (error) {
      console.error("Error in sendChatMessage:", error);
      // Remove thinking indicator
      setIsThinking(false);
      
      // Add error message to chat history
      setChatMessages(prev => [
        ...prev,
        { 
          sender: "system", 
          text: "Sorry, there was an error processing your request. Please try again.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  // Function to explicitly progress through stages
  const progressStage = (input) => {
    switch(stage) {
      case "subject":
        setSubject(input);
        setStage("upload");
        break;
      case "upload":
        // After file upload
        setStage("topic");
        break;
      case "topic":
        // After topic selection
        setTopics(input);
        setStage("completed");
        break;
      case "completed":
        // Start learning
        break;
      default:
        break;
    }
  };

  // Function to handle when messages are played/consumed
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  // Clear the current diagram
  const clearDiagram = () => {
    setCurrentDiagram(null);
  };

  // Fetch Mermaid diagram explicitly
  const fetchMermaidDiagram = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/getMermaidDiagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: subject,
          topics: topics
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setCurrentDiagram(data.svgContent || data.mermaidCode);
      } else {
        console.error('Error fetching diagram:', data.error);
      }
    } catch (error) {
      console.error('Error fetching Mermaid diagram:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for uploading files to backend
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setLoading(true);
      
      // Create FormData for multipart upload
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // Add context metadata
      formData.append('subject', subject);
      
      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`File upload failed with status ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        // State
        messages,
        setMessages,
        message,
        setMessage,
        loading,
        setLoading,
        cameraZoomed,
        setCameraZoomed,
        currentDiagram,
        stage,
        setStage,
        subject,
        setSubject,
        topics,
        setTopics,
        uploadedFiles,
        setUploadedFiles,
        chatMessages,
        setChatMessages,
        isThinking,
        
        // Functions
        onMessagePlayed,
        clearDiagram,
        fetchMermaidDiagram,
        sendChatMessage,
        progressStage,
        uploadFiles
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  
  return context;
};