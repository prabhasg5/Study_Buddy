import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { useChat } from "./hooks/useChat"; // Import useChat hook
import SpeechRecognition from "react-speech-recognition";
import { useState } from "react";
import VLabsButton from "./components/VLabsButton";
import SpeechToText from "./components/SpeechToText";

function App() {
  const { currentDiagram } = useChat(); // Get the current diagram from context
  const [showLegacyInput, setShowLegacyInput] = useState(false); // Controls visibility of the legacy input
  
  return (
    <>
      <Loader />
      
      <Leva hidden/>
    
      <UI  />
      <SpeechToText />
      <VLabsButton />
      
      

      
      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
        <Experience />
        
      </Canvas>
      
    </>
  );
}

export default App;