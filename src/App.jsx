import React, { useState, useRef, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';

// --- Helper Components ---

// DraggableSVGItem: A component that makes its children draggable within the SVG canvas.
const DraggableSVGItem = ({ x, y, onPositionChange, constraints, scale, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const CTM = itemRef.current.getScreenCTM();
    offset.current = {
      x: (e.clientX - CTM.e) / CTM.a - x,
      y: (e.clientY - CTM.f) / CTM.d - y,
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault();
      const CTM = itemRef.current.getScreenCTM();
      let newX = (e.clientX - CTM.e) / CTM.a - offset.current.x;
      let newY = (e.clientY - CTM.f) / CTM.d - offset.current.y;
      
      // Apply constraints to keep item within the buildable area
      if (constraints) {
        newX = Math.max(constraints.x, Math.min(newX, constraints.maxX));
        newY = Math.max(constraints.y, Math.min(newY, constraints.maxY));
      }
      
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, onPositionChange, constraints]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove global event listeners
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <g
      ref={itemRef}
      transform={`translate(${x}, ${y})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {children}
    </g>
  );
};


// Main App Component
export default function App() {
  const [inputs, setInputs] = useState({
    plotWidth: 60,
    plotLength: 40,
    roadWidth: 30,
    roadType: 'Main Road',
    northDirection: 'top',
    setbackFront: 5,
    setbackBack: 5,
    setbackLeft: 5,
    setbackRight: 5,
    addStaircase: true,
    staircaseWidth: 8,
    staircaseLength: 12,
    addLift: true,
    liftWidth: 6,
    liftLength: 6,
  });

  const [floors, setFloors] = useState([
    { id: 1, name: 'Ground Floor', bua: 538 },
    { id: 2, name: 'First Floor', bua: 1060 },
    { id: 3, name: 'Second Floor', bua: 1060 },
    { id: 4, name: 'Third Floor', bua: 1060 },
  ]);

  const [staircasePosition, setStaircasePosition] = useState({ x: 10, y: 10 });
  const [liftPosition, setLiftPosition] = useState({ x: 30, y: 10 });
  
  const diagramRef = useRef(null);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setInputs({
      ...inputs,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFloorChange = (id, field, value) => {
    setFloors(floors.map(floor =>
      floor.id === id ? { ...floor, [field]: value } : floor
    ));
  };
  
  const addFloor = () => {
    const newId = floors.length > 0 ? Math.max(...floors.map(f => f.id)) + 1 : 1;
    setFloors([...floors, { id: newId, name: `Floor ${newId}`, bua: 1000 }]);
  };

  const removeFloor = (id) => {
    setFloors(floors.filter(floor => floor.id !== id));
  };

  const calculations = useMemo(() => {
    const { plotWidth, plotLength } = inputs;
    const plotArea = parseFloat(plotWidth) * parseFloat(plotLength);
    const totalBUA = floors.reduce((sum, floor) => sum + parseFloat(floor.bua || 0), 0);
    const groundFloorBUA = parseFloat(floors[0]?.bua || 0);
    const groundCoverage = plotArea > 0 ? (groundFloorBUA / plotArea) * 100 : 0;
    const far = plotArea > 0 ? totalBUA / plotArea : 0;
    
    return { plotArea, totalBUA, groundCoverage, far };
  }, [inputs.plotWidth, inputs.plotLength, floors]);

  const handleExport = async () => {
    if (!diagramRef.current) return;
    const canvas = await html2canvas(diagramRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = 'plot-diagram-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Memoize buildable dimensions to pass to draggable items
  const buildableDimensions = useMemo(() => {
      const { plotWidth, plotLength, setbackLeft, setbackRight, setbackFront, setbackBack } = inputs;
      const buildableWidth = Math.max(0, plotWidth - setbackLeft - setbackRight);
      const buildableLength = Math.max(0, plotLength - setbackFront - setbackBack);
      return { buildableWidth, buildableLength };
  }, [inputs]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col xl:flex-row gap-6 font-sans">
      
      {/* --- Left Panel --- */}
      <div className="w-full xl:w-1/4 border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Plot Details</h2>
        
        {/* Plot and Road Inputs */}
        <Input label="Plot Width (ft)" name="plotWidth" value={inputs.plotWidth} onChange={handleChange} />
        <Input label="Plot Length (ft)" name="plotLength" value={inputs.plotLength} onChange={handleChange} />
        <Input label="Road Width (ft)" name="roadWidth" value={inputs.roadWidth} onChange={handleChange} />
        <Input label="Road Type" name="roadType" value={inputs.roadType} onChange={handleChange} type="text" />
        
        <label className="block text-sm font-medium text-gray-700 mt-2">North Direction</label>
        <select name="northDirection" value={inputs.northDirection} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
        </select>
        
        <h3 className="text-lg font-semibold my-4 text-gray-700">Setbacks</h3>
        <Input label="Front Setback (ft)" name="setbackFront" value={inputs.setbackFront} onChange={handleChange} />
        <Input label="Back Setback (ft)" name="setbackBack" value={inputs.setbackBack} onChange={handleChange} />
        <Input label="Left Setback (ft)" name="setbackLeft" value={inputs.setbackLeft} onChange={handleChange} />
        <Input label="Right Setback (ft)" name="setbackRight" value={inputs.setbackRight} onChange={handleChange} />
        
        <h3 className="text-lg font-semibold my-4 text-gray-700">Internal Features</h3>
        <Checkbox label="Add Staircase" name="addStaircase" checked={inputs.addStaircase} onChange={handleChange} />
        {inputs.addStaircase && <>
            <Input label="Staircase Width (ft)" name="staircaseWidth" value={inputs.staircaseWidth} onChange={handleChange} />
            <Input label="Staircase Length (ft)" name="staircaseLength" value={inputs.staircaseLength} onChange={handleChange} />
        </>}
        <Checkbox label="Add Lift" name="addLift" checked={inputs.addLift} onChange={handleChange} />
        {inputs.addLift && <>
            <Input label="Lift Width (ft)" name="liftWidth" value={inputs.liftWidth} onChange={handleChange} />
            <Input label="Lift Length (ft)" name="liftLength" value={inputs.liftLength} onChange={handleChange} />
        </>}
      </div>
      
      {/* --- Middle Panel (Diagram) --- */}
      <div className="flex-1 flex justify-center items-center p-4 border rounded-md shadow-sm bg-white min-w-0">
          <div ref={diagramRef} className="p-4 bg-white">
              <PlotDiagramSVG 
                inputs={inputs} 
                buildable={buildableDimensions}
                staircasePosition={staircasePosition}
                liftPosition={liftPosition}
                onStaircaseMove={setStaircasePosition}
                onLiftMove={setLiftPosition}
              />
          </div>
      </div>
      
      {/* --- Right Panel --- */}
      <div className="w-full xl:w-1/4 border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Floor-wise BUA</h2>
          {floors.map((floor, index) => (
              <div key={floor.id} className="grid grid-cols-3 gap-2 items-center mb-2">
                  <input type="text" value={floor.name} onChange={(e) => handleFloorChange(floor.id, 'name', e.target.value)} className="col-span-1 p-1.5 border rounded-md shadow-sm"/>
                  <input type="number" value={floor.bua} onChange={(e) => handleFloorChange(floor.id, 'bua', e.target.value)} className="col-span-1 p-1.5 border rounded-md shadow-sm text-right"/>
                  <button onClick={() => removeFloor(floor.id)} className="col-span-1 bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 text-sm">Remove</button>
              </div>
          ))}
          <button onClick={addFloor} className="w-full mt-2 bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Add Floor</button>
          
          <div className="border-t pt-4 mt-4 space-y-2">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Calculations</h3>
              <div className="flex justify-between text-sm"><span>Plot Area:</span> <strong>{calculations.plotArea.toFixed(2)} sq.ft</strong></div>
              <div className="flex justify-between text-sm"><span>Total BUA:</span> <strong>{calculations.totalBUA.toFixed(2)} sq.ft</strong></div>
              <div className="flex justify-between text-sm"><span>Ground Coverage:</span> <strong>{calculations.groundCoverage.toFixed(2)} %</strong></div>
              <div className="flex justify-between text-sm"><span>Floor Area Ratio (FAR):</span> <strong>{calculations.far.toFixed(2)}</strong></div>
          </div>
          <button onClick={handleExport} className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Export as PNG</button>
      </div>
    </div>
  );
}

// --- Reusable Form Field Components ---
const Input = ({ label, name, ...props }) => (
    <div className="mb-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input id={name} name={name} type="number" className="mt-1 p-1.5 w-full text-right border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" {...props} />
    </div>
);

const Checkbox = ({ label, name, ...props }) => (
    <div className="flex items-center my-2">
        <input id={name} name={name} type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" {...props} />
        <label htmlFor={name} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);


// --- SVG Diagram Component ---
const PlotDiagramSVG = ({ inputs, buildable, staircasePosition, liftPosition, onStaircaseMove, onLiftMove }) => {
  const { plotWidth, plotLength, roadWidth, roadType, setbackFront, setbackBack, setbackLeft, setbackRight, northDirection, addStaircase, staircaseWidth, staircaseLength, addLift, liftWidth, liftLength } = inputs;
  
  const PADDING = 40;
  const MAX_SVG_DIM = 500;

  const totalWidthFt = parseFloat(plotWidth);
  const totalHeightFt = parseFloat(plotLength) + parseFloat(roadWidth);

  if (totalWidthFt <= 0 || totalHeightFt <= 0) {
    return <div className="w-full h-full flex items-center justify-center bg-gray-100">Enter valid dimensions</div>;
  }

  const scale = Math.min(MAX_SVG_DIM / totalWidthFt, MAX_SVG_DIM / totalHeightFt);
  const svgWidth = totalWidthFt * scale + PADDING * 2;
  const svgHeight = totalHeightFt * scale + PADDING * 2;

  // Scaled dimensions
  const pW = totalWidthFt * scale;
  const pL = parseFloat(plotLength) * scale;
  const rW = parseFloat(roadWidth) * scale;
  const sF = parseFloat(setbackFront) * scale;
  const sB = parseFloat(setbackBack) * scale;
  const sL = parseFloat(setbackLeft) * scale;
  const sR = parseFloat(setbackRight) * scale;

  const bW = buildable.buildableWidth * scale;
  const bL = buildable.buildableLength * scale;
  
  const stairW = parseFloat(staircaseWidth) * scale;
  const stairL = parseFloat(staircaseLength) * scale;
  const liftW = parseFloat(liftWidth) * scale;
  const liftL = parseFloat(liftLength) * scale;
  
  // Constraints for dragging
  const stairConstraints = { x: sL, y: sF, maxX: sL + bW - stairW, maxY: sF + bL - stairL };
  const liftConstraints = { x: sL, y: sF, maxX: sL + bW - liftW, maxY: sF + bL - liftL };

  // Directions Logic
  const directions = {
      top: { N: 'N', S: 'S', E: 'E', W: 'W' },
      bottom: { N: 'S', S: 'N', E: 'W', W: 'E' },
      left: { N: 'W', S: 'E', E: 'N', W: 'S' },
      right: { N: 'E', S: 'W', E: 'S', W: 'N' }
  }[northDirection];
  
  return (
    <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>{`.dim-text { font-size: 10px; fill: #333; } .label-text { font-size: 12px; font-weight: bold; }`}</style>
      </defs>
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        
        {/* Direction Labels */}
        <text x={pW / 2} y={-15} textAnchor="middle" className="label-text">{directions.N}</text>
        <text x={pW / 2} y={pL + 15} textAnchor="middle" className="label-text">{directions.S}</text>
        <text x={-15} y={pL / 2} textAnchor="middle" alignmentBaseline="middle">{directions.W}</text>
        <text x={pW + 15} y={pL / 2} textAnchor="middle" alignmentBaseline="middle">{directions.E}</text>
        
        {/* Road and Plot */}
        <rect x="0" y={pL} width={pW} height={rW} fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
        <text x={pW / 2} y={pL + rW / 2} textAnchor="middle" alignmentBaseline="middle" className="label-text" fill="#374151">{roadType} ({inputs.roadWidth} ft)</text>

        <rect x="0" y="0" width={pW} height={pL} fill="#dcfce7" stroke="#15803d" strokeWidth="1" />

        {/* Buildable Area */}
        <rect x={sL} y={sF} width={bW} height={bL} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
        <foreignObject x={sL} y={sF} width={bW} height={bL}>
            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#1e3a8a', fontWeight: 'bold', fontSize: '12px'}}>
                Buildable Area
            </div>
        </foreignObject>

        {/* Draggable Staircase */}
        {addStaircase && (
          <DraggableSVGItem x={staircasePosition.x * scale} y={staircasePosition.y * scale} onPositionChange={(pos) => onStaircaseMove({ x: pos.x / scale, y: pos.y / scale })} constraints={stairConstraints} scale={scale}>
            <rect width={stairW} height={stairL} fill="#fecaca" stroke="#b91c1c" strokeWidth="1.5" />
            <foreignObject width={stairW} height={stairL} requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility">
                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#7f1d1d', fontSize: '10px', padding: '2px', boxSizing: 'border-box'}}>Staircase</div>
            </foreignObject>
          </DraggableSVGItem>
        )}
        
        {/* Draggable Lift */}
        {addLift && (
            <DraggableSVGItem x={liftPosition.x * scale} y={liftPosition.y * scale} onPositionChange={(pos) => onLiftMove({ x: pos.x / scale, y: pos.y / scale })} constraints={liftConstraints} scale={scale}>
                <rect width={liftW} height={liftL} fill="#d1d5db" stroke="#4b5563" strokeWidth="1.5" />
                <foreignObject width={liftW} height={liftL}>
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f2937', fontSize: '10px'}}>Lift</div>
                </foreignObject>
            </DraggableSVGItem>
        )}

        {/* Dimension Lines */}
        <text x={pW / 2} y={pL + rW + 25} textAnchor="middle" className="dim-text">{plotWidth} ft</text>
        <text x={pW + 25} y={pL / 2} textAnchor="middle" className="dim-text" transform={`rotate(-90, ${pW + 25}, ${pL/2})`}>{plotLength} ft</text>
      </g>
    </svg>
  );
};
