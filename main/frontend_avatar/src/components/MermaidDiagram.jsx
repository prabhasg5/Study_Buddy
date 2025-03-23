import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

const MermaidDiagram = ({ diagramCode }) => {
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const mermaidRef = useRef(null);
  const expandedMermaidRef = useRef(null);
  const uniqueId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current;

  // State for zoom functionality
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // State to track if there was an error
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!diagramCode) {
      setLoading(false);
      return;
    }

    const renderDiagram = async () => {
      try {
        setLoading(true);
        setHasError(false);

        // Clean the code - remove markdown-style triple backticks and mermaid tag if present
        let cleanCode = diagramCode;
        const mermaidRegex = /```mermaid\s+([\s\S]+?)\s+```/;
        const match = diagramCode.match(mermaidRegex);
        
        if (match && match[1]) {
          cleanCode = match[1].trim();
        }

        // Override the error rendering behavior
        const origError = window.mermaid?.errorRenderer?.defaultRenderer;
        if (window.mermaid?.errorRenderer) {
          window.mermaid.errorRenderer.defaultRenderer = (error) => {
            // Return an empty SVG instead of the error message
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
              <rect width="100%" height="100%" fill="white"/>
            </svg>`;
          };
        }

        // Initialize mermaid with default config and error handling
        mermaid.initialize({
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Roboto, sans-serif',
          logLevel: 1, // Only log errors to console
          er: {
            useMaxWidth: true
          }
        });

        // Render the diagram
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        setSvgContent(svg);
        
        // Restore original error renderer
        if (window.mermaid?.errorRenderer && origError) {
          window.mermaid.errorRenderer.defaultRenderer = origError;
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setHasError(true);
        setSvgContent(''); // Clear any partial SVG content
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [diagramCode]);

  // Toggle expanded view
  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded) {
      // Reset zoom and position when expanding
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    };

    if (expanded) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [expanded]);

  // Zoom functionality
  const handleWheel = (e) => {
    if (!expanded) return;
    
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 5); // Limit zoom between 0.5x and 5x
    
    setZoom(newZoom);
  };

  // Mouse down handler for dragging
  const handleMouseDown = (e) => {
    if (!expanded || zoom === 1) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Mouse move handler for dragging
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  // Mouse up handler to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add mouse event listeners when expanded
  useEffect(() => {
    if (expanded) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [expanded, isDragging, dragStart]);

  // Reset zoom controls
  const resetZoom = (e) => {
    e.stopPropagation();
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom in button handler
  const zoomIn = (e) => {
    e.stopPropagation();
    const newZoom = Math.min(zoom + 0.25, 5);
    setZoom(newZoom);
  };

  // Zoom out button handler
  const zoomOut = (e) => {
    e.stopPropagation();
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
  };
  const downloadSVG = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Get the actual SVG element from the DOM
    const svgElement = expanded ? 
      expandedMermaidRef.current.querySelector('svg') : 
      mermaidRef.current.querySelector('svg');
    
    if (!svgElement) {
      console.error('SVG element not found');
      return;
    }
    
    // Clone the SVG to avoid modifying the displayed one
    const clonedSvg = svgElement.cloneNode(true);
    
    // Make sure styles are included
    const svgStyles = document.createElementNS("http://www.w3.org/2000/svg", "style");
    const styleSheets = document.styleSheets;
    let stylesText = "";
    
    // Get styles that might affect the SVG
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const cssRules = styleSheets[i].cssRules;
        for (let j = 0; j < cssRules.length; j++) {
          const rule = cssRules[j];
          // Only include rules that might apply to SVG elements
          if (rule.selectorText && 
             (rule.selectorText.includes('svg') || 
              rule.selectorText.includes('path') || 
              rule.selectorText.includes('g') ||
              rule.selectorText.includes('text'))) {
            stylesText += rule.cssText;
          }
        }
      } catch (e) {
        console.warn('Cannot access styles from stylesheet', e);
      }
    }
    
    svgStyles.textContent = stylesText;
    clonedSvg.appendChild(svgStyles);
    
    // Ensure SVG has dimensions
    const svgBounds = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute("width", svgBounds.width);
    clonedSvg.setAttribute("height", svgBounds.height);
    clonedSvg.setAttribute("viewBox", `0 0 ${svgBounds.width} ${svgBounds.height}`);
    
    // Convert to data URL format with XML declaration
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([
      '<?xml version="1.0" standalone="no"?>\r\n',
      svgData
    ], { type: "image/svg+xml" });
    
    // Create download link
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mermaid-diagram.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const downloadPNG = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Get SVG element
    const svgElement = expanded ? 
      expandedMermaidRef.current.querySelector('svg') : 
      mermaidRef.current.querySelector('svg');
    
    if (!svgElement) {
      console.error('SVG element not found');
      return;
    }
    
    // Clone the SVG
    const clonedSvg = svgElement.cloneNode(true);
    
    // Get dimensions
    const svgBounds = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute("width", svgBounds.width);
    clonedSvg.setAttribute("height", svgBounds.height);
    
    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    
    // SVG to base64 - ensures image loading works properly
    const svg64 = btoa(unescape(encodeURIComponent(svgData)));
    const b64Start = 'data:image/svg+xml;base64,';
    const image64 = b64Start + svg64;
    
    // Create image
    const img = new Image();
    
    // Handle image loading and canvas drawing
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // For higher resolution
      canvas.width = svgBounds.width * scale;
      canvas.height = svgBounds.height * scale;
      
      // Get context and set white background
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image at scaled size
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      
      // Create download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mermaid-diagram.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    
    // Set error handler
    img.onerror = (e) => {
      console.error('Error loading image for PNG conversion', e);
    };
    
    // Load the image
    img.src = image64;
  };
  // Handle loading and error states
  if (loading) {
    return (
      <div className="mermaid-diagram-container bg-white p-4 rounded-lg shadow-md w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading diagram...</p>
        </div>
      </div>
    );
  }
  
  // Handle error state
  // if (hasError || !diagramCode) {
  //   return (
  //     <div className="mermaid-diagram-container bg-white p-4 rounded-lg shadow-md w-full">
  //       <div className="text-center py-6">
  //         <div className="text-gray-500 mb-2">
  //           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  //           </svg>
  //         </div>
  //         <h3 className="text-lg font-medium text-gray-700">Unable to generate diagram</h3>
  //         <p className="text-sm text-gray-500 mt-1">The diagram couldn't be rendered properly.</p>
  //       </div>
  //     </div>
  //   );
  // }
  
  // Don't render if no SVG content
  if (!svgContent) {
    return null;
  }

  // Only render if we have valid SVG content
  return (
    <>
      <div 
        className="mermaid-diagram-container bg-white p-4 rounded-lg shadow-md w-full cursor-pointer transition-all hover:shadow-lg" 
        onClick={toggleExpanded}
      >
        <div className="text-center mb-2 font-bold text-gray-700 flex justify-between items-center">
          <span>Generated Diagram</span>
          <div className="flex space-x-2"> {/* Add this wrapper div */}
    {/* Download buttons */}
    
    <button 
      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-sm"
      onClick={downloadPNG}
    >
      Download PNG
    </button>
    
  </div>
</div>

        <div>
<div className="flex items-center space-x-2">
  <span className="text-gray-600 text-sm">{Math.round(zoom * 100)}%</span>
  <button 
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm flex items-center justify-center"
    onClick={zoomOut}
    disabled={zoom <= 0.5}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  </button>
  <button 
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm"
    onClick={resetZoom}
  >
    Reset
  </button>
  <button 
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm flex items-center justify-center"
    onClick={zoomIn}
    disabled={zoom >= 5}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  </button>
  
  
  <button 
    className="text-gray-600 hover:text-gray-900" 
    onClick={toggleExpanded}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>         <button 
            className="text-pink-500 hover:text-pink-700 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
          >
            Click to {expanded ? 'Minimize' : 'Expand'}
          </button>
        </div>
        <div
          className="overflow-auto w-full"
          ref={mermaidRef}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            maxWidth: '100%',
            '& svg': {
              maxWidth: '100%',
              height: 'auto'
            }
          }}
        />
      </div>
      
      {/* Expanded view/modal with zoom controls */}
      {expanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" 
          onClick={toggleExpanded}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] w-[90vw] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Diagram View</h3>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 text-sm">{Math.round(zoom * 100)}%</span>
                <button 
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm flex items-center justify-center"
                  onClick={zoomOut}
                  disabled={zoom <= 0.5}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button 
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm"
                  onClick={resetZoom}
                >
                  Reset
                </button>
                <button 
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-sm flex items-center justify-center"
                  onClick={zoomIn}
                  disabled={zoom >= 5}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button 
                  className="text-gray-600 hover:text-gray-900" 
                  onClick={toggleExpanded}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div 
              className="overflow-hidden flex-grow relative"
              onWheel={handleWheel}
            >
              <div
                ref={expandedMermaidRef}
                className={`${isDragging ? 'cursor-grabbing' : (zoom > 1 ? 'cursor-grab' : 'cursor-default')}`}
                onMouseDown={handleMouseDown}
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{
                  transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              />
              {zoom > 1 && !isDragging && (
                <div className="absolute bottom-4 left-0 right-0 text-center text-gray-500 text-sm bg-white bg-opacity-75 py-1">
                  Drag to pan
                </div>
              )}
            </div>
            <div className="text-center mt-4">
              <button
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg"
                onClick={toggleExpanded}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MermaidDiagram;