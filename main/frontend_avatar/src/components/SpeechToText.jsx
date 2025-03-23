import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '../hooks/useChat'; // Update this path to match your actual file structure

const SpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState(null);
  
  // Use the chat context
  const { sendChatMessage, chatMessages, isThinking, loading } = useChat();

  // Initialize speech recognition
  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
    }
  }, [isListening, recognition]);

  const handleReset = () => {
    setTranscript('');
    setError('');
  };

  const handleSendMessage = async () => {
    if (!transcript.trim()) {
      setError('Please say something first!');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      
      // Use the sendChatMessage function from context
      await sendChatMessage(transcript);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter to get only the most recent system messages (responses)
  const recentResponses = chatMessages
    .filter(msg => msg.sender === 'system')
    .slice(-3); // Show only the 3 most recent responses

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Voice Assistant</h2>
      
      <div className="flex justify-center mb-6 gap-4">
        <button
          onClick={toggleListening}
          className={`px-6 py-3 rounded-full font-medium ${
            isListening 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-200 rounded-full font-medium hover:bg-gray-300"
        >
          Reset
        </button>
        
        <button
          onClick={handleSendMessage}
          disabled={!transcript.trim() || isProcessing || isThinking || loading}
          className={`px-6 py-3 rounded-full font-medium ${
            !transcript.trim() || isProcessing || isThinking || loading
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isProcessing || isThinking ? 'Processing...' : 'Send Message'}
        </button>
      </div>
      
      {isListening && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <p className="text-gray-500">Listening...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Transcript:</h3>
        <div className="p-4 bg-gray-100 rounded-lg min-h-16 whitespace-pre-wrap">
          {transcript || 'Say something...'}
        </div>
      </div>
      
      {recentResponses.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Recent Responses:</h3>
          <div className="space-y-4">
            {recentResponses.map((msg, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg">
                <p>{msg.text}</p>
                {msg.timestamp && (
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isThinking && (
        <div className="p-4 mt-4 bg-yellow-50 rounded-lg flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
          <p>Thinking...</p>
        </div>
      )}
    </div>
  );
};

export default SpeechRecognition;