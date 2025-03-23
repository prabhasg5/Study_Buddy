import React from 'react';


const StageContent = ({ 
  stage, 
  chatboxVisible, 
  subject, 
  stageInput, 
  handleStageSubmit, 
  dragActive, 
  handleDrag, 
  handleDrop, 
  handleFileChange, 
  uploadedFiles, 
  progressStage, 
  setChatboxVisible 
}) => {
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
              <p className="text-gray-700"><span className="font-medium">Topic:</span> Data Structures and Algorithms</p>
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

export default StageContent;