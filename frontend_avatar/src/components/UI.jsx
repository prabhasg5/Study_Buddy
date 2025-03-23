import { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import MermaidDiagram from "./MermaidDiagram";

export const UI = ({ hidden, ...props }) => {
  const chatInput = useRef(); // For the main chat input at bottom
  const stageInput = useRef(); // For stage-specific inputs
  const chatboxRef = useRef(null);

  const {
    loading,
    cameraZoomed,
    setCameraZoomed,
    message,
    stage,
    subject,
    currentDiagram,
    uploadedFiles,
    setUploadedFiles,
    sendChatMessage,
    progressStage,
    chatMessages,
    isThinking
  } = useChat();

  // State variables
  const [dragActive, setDragActive] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false);
  const [chatboxVisible, setChatboxVisible] = useState(false);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [chatMessages, isThinking]);

  // Function for sending a regular chat message has been removed

  // Function for the learning chat
  const handleSendChatMessage = () => {
    if (!loading && chatInput.current) {
      const messageText = chatInput.current.value;
      if (messageText.trim()) {
        // Use the sendChatMessage function which now handles adding to chat history
        sendChatMessage(messageText);
        chatInput.current.value = "";
      }
    }
  };

  // Function specifically for stage inputs progression
  const handleStageSubmit = () => {
    if (!loading && stageInput.current) {
      const inputValue = stageInput.current.value;
      if (inputValue.trim()) {
        progressStage(inputValue);
        stageInput.current.value = "";
      }
    }
  };

  // Redirect to file upload
  const redirectToFileUpload = () => {
    window.open("http://localhost:8501", "_blank");
  };

  // Toggle green screen with explicit console logging
  const toggleGreenScreen = () => {
    const body = document.querySelector("body");
    const adding = !body.classList.contains("greenScreen");
    console.log(`Toggle green screen: ${adding ? "adding" : "removing"}`);
    
    if (adding) {
      body.classList.add("greenScreen");
    } else {
      body.classList.remove("greenScreen");
    }
  };

  // Update this function in your UI component
const handleButtonClick = (action, value) => {
  console.log(`Button clicked: ${action} - Setting to: ${value}`);
  
  // Then perform the actual action
  if (action === "camera") {
    setCameraZoomed(value);
  } else if (action === "audio") {
    setAudioMuted(value);
  } else if (action === "voice") {
    setVoiceChatEnabled(value);
    
    // Start or stop recording based on the voice chat state
    if (value) {
      // If turning on voice chat, don't start recording immediately
      console.log("Voice chat enabled, ready to record");
    } else {
      // If turning off voice chat, stop any ongoing recording
      if (isRecording) {
        stopRecording();
      }
    }
  }
};

  // File upload handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
    }
  };

  const renderStageContent = () => {
    // Don't render stage content when chatbox is visible
    if (chatboxVisible) return null;
    
    switch (stage) {
      case "subject":
        return (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-lg p-12 w-full max-w-2xl">
            <h2 className="text-6xl font-bold text-pink-600 mb-8">Subject</h2>
            <p className="mb-8 text-2xl">Which subject do you want to learn?</p>
            <input
              ref={stageInput}
              className="w-full p-6 border-4 border-pink-200 rounded-lg mb-8 text-2xl" 
              placeholder="Enter subject..."
            />
            <button
              onClick={handleStageSubmit}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white p-6 rounded-lg font-medium text-2xl" 
            >
              Next
            </button>
          </div>
        );
        
      case "upload":
        return (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-lg p-12 w-full max-w-2xl"> 
            <h2 className="text-6xl font-bold text-pink-600 mb-8">Course Material Upload</h2>
            <p className="mb-8 text-2xl">Upload relevant documents for {subject}</p>
  
            <div
              className={`border-4 border-dashed p-16 rounded-lg text-center mb-8 text-2xl ${dragActive ? "border-pink-500 bg-pink-100/50" : "border-gray-300"}`} 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-pink-600 hover:text-pink-700 text-2xl" 
              >
                Click to upload
              </label>
              <p className="mt-4 text-2xl">or drag and drop files here</p> 
  
              {uploadedFiles.length > 0 && (
                <div className="mt-8 text-left text-2xl"> 
                  <p className="font-medium">Uploaded files:</p>
                  <ul className="mt-4">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="text-2xl">{file.name}</li> 
                    ))}
                  </ul>
                </div>
              )}
            </div>
  
            <button
              onClick={() => progressStage("files_uploaded")}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white p-6 rounded-lg font-medium text-2xl" 
            >
              Next
            </button>
          </div>
        );
      
      case "topic":
        return (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-lg p-12 w-full max-w-2xl"> 
            <h2 className="text-6xl font-bold text-pink-600 mb-8">Topic Selection</h2> 
            <p className="mb-8 text-2xl">Which topics in {subject} do you want to learn?</p>
            <input
              ref={stageInput}
              className="w-full p-6 border-4 border-pink-200 rounded-lg mb-8 text-2xl" 
              placeholder="Enter topics..."
            />
            <button
              onClick={handleStageSubmit}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white p-6 rounded-lg font-medium text-2xl"
            >
              Next
            </button>
          </div>
        );
  
      case "completed":
        return (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-lg p-12 w-full max-w-2xl"> 
            <h2 className="text-6xl font-bold text-pink-600 mb-8">Ready to Learn!</h2> 
            
            <div className="bg-white p-6 rounded-lg mb-8 shadow-md">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Session Information</h3>
              <div className="space-y-3">
                <p className="text-gray-700"><span className="font-medium">Topic:</span> {subject || "Data Structures and Algorithms"}</p>
                <p className="text-gray-700"><span className="font-medium">Difficulty:</span> Intermediate</p>
                <p className="text-gray-700"><span className="font-medium">Estimated Time:</span> 45 minutes</p>
                <p className="text-gray-700"><span className="font-medium">Concepts Covered:</span> Arrays, Linked Lists, Recursion</p>
                <p className="text-gray-700"><span className="font-medium">Prerequisites:</span> Basic programming knowledge</p>
              </div>
            </div>
            
            <p className="text-2xl mb-8">Your learning session for {subject} is now ready.</p>
            <div className="mt-8">
              <button
                onClick={() => {
                  progressStage("start_learning");
                  setChatboxVisible(true);
                }}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white p-6 rounded-lg font-medium text-2xl transition-all duration-300 transform hover:scale-105"
              >
                Start Learning
              </button>
              <p className="mt-6 text-lg text-center text-gray-700">
                You can use the chat on the right to ask questions during your learning session.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render chatbox
  const renderChatbox = () => {
    if (!chatboxVisible) return null;
    
    return (
      <div 
        className="fixed right-0 top-0 bottom-0 w-1/2 bg-white/40 backdrop-blur-lg shadow-xl z-20 flex flex-col transition-all duration-300 ease-in-out"
        style={{
          transform: chatboxVisible ? "translateX(0)" : "translateX(100%)"
        }}
      >
        {/* Close button */}
        <button 
          onClick={() => setChatboxVisible(false)} 
          className="absolute left-0 top-12 transform -translate-x-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-l-lg shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Chatbox header */}
        <div className="bg-pink-500 text-white p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Learning Chat</h3>
          <div className="text-sm">
            {subject ? `${subject} Assistant` : "Learning Assistant"}
          </div>
        </div>
        
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4" ref={chatboxRef}>
          {chatMessages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 max-w-[80%] ${msg.sender === "user" ? "ml-auto" : "mr-auto"}`}
            >
              <div 
                className={`p-3 rounded-lg ${
                  msg.sender === "user" 
                    ? "bg-pink-100 text-black rounded-tr-none" 
                    : "bg-white/40 text-black rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-xs mt-1 ${msg.sender === "user" ? "text-right" : "text-left"} text-gray-500`}>
                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          
          {currentDiagram && (
            <div className="mb-4 w-full mr-auto">
              <div className="p-3 rounded-lg bg-white/80 text-black rounded-tl-none">
                <MermaidDiagram diagramCode={currentDiagram} />
              </div>
              <div className="text-xs mt-1 text-left text-gray-500">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* Show thinking indicator */}
          {isThinking && (
            <div className="mb-4 max-w-[80%] mr-auto">
              <div className="p-3 rounded-lg bg-gray-200 text-black rounded-tl-none flex items-center">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Chat input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <input
              ref={chatInput}
              className="flex-1 border border-gray-300 rounded-l-lg p-3 focus:outline-none focus:border-pink-500"
              placeholder="Ask me anything..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendChatMessage();
                }
              }}
              disabled={loading || isThinking}
            />
            <button
              onClick={handleSendChatMessage}
              className={`bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-r-lg ${
                (loading || isThinking) ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading || isThinking}
            >
              {isThinking ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Add styles for typing indicator */}
      <style jsx="true">{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: #9ca3af;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1.0);
          }
        }
      `}</style>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl">Study Buddy</h1>
          <p>Your learning partner</p>
        </div>

        {/* Stage content */}
        <div className="absolute top-1/4 w-full pointer-events-auto">
          {renderStageContent()}
        </div>
        
        {/* Removed any middle page mermaid diagram display - diagrams now only appear in chat */}

        {/* Controls with explicit z-index to ensure they're clickable */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-50">
          <button
            onClick={() => handleButtonClick("camera", !cameraZoomed)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md cursor-pointer"
            title="Zoom"
            type="button"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={toggleGreenScreen}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md cursor-pointer"
            title="Toggle Green Screen"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
          <button
            onClick={() => handleButtonClick("audio", !audioMuted)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md cursor-pointer"
            title="Mute Audio"
            type="button"
          >
            {audioMuted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
            )}
          </button>
          <button
  onClick={() => handleButtonClick("voice", !voiceChatEnabled)}
  className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md cursor-pointer"
  title="Voice Chat"
  type="button"
>
            {voiceChatEnabled ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
          {/* Chat toggle button - only show when chatbox is hidden */}
          {!chatboxVisible && (
            <button
              onClick={() => setChatboxVisible(true)}
              className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md cursor-pointer"
              title="Open Chat"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom chat input has been removed */}

      {/* Render the chatbox */}
      {renderChatbox()}
    </>
  );
};