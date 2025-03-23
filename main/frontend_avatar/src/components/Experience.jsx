import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();
  // Define avatar position with desired offset
  const avatarPosition = [-0.7, 0, 0];
  
  useEffect(() => {
    // Adjust camera to focus on the avatar's new position
    cameraControls.current.setLookAt(
      avatarPosition[0], 2, 5, 
      avatarPosition[0], 1.5, 0
    );
  }, []);
  
  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(
        avatarPosition[0], 1.5, 1.5, 
        avatarPosition[0], 1.5, 0, 
        true
      );
    } else {
      cameraControls.current.setLookAt(
        avatarPosition[0], 2.2, 5, 
        avatarPosition[0], 1.0, 0, 
        true
      );
    }
  }, [cameraZoomed]);
  
  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      {/* Adjust dots position to follow avatar */}
      <Suspense>
        <Dots position-y={1.75} position-x={avatarPosition[0] - 0.02} />
      </Suspense>
      <group position={[-1.02, 0.3, 0.04]}>
  <Avatar scale={0.8} rotation={[0, Math.PI/9, 0]} />
</group>
      <ContactShadows opacity={0.7} />
    </>
  );
};