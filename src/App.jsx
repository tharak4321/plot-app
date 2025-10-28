import React, { useState, useRef, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';

// --- Helper Components ---

// DraggableSVGItem: Makes its children draggable within SVG.
const DraggableSVGItem = ({ x, y, onPositionChange, constraints, children }) => {
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
      
      if (constraints) {
        newX = Math.max(constraints.x, Math.min(newX, constraints.maxX));
        newY = Math.max(constraints.y, Math.min(newY, constraints.maxY));
      }
      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, onPositionChange, constraints]);

  const handleMouseUp = () => setIsDragging(false);

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
    <g ref={itemRef} transform={`translate(${x}, ${y})`} onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
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
    numberOfFloors: 3,
    addStaircase: true,
    staircaseWidth: 8,
    staircaseLength: 12,
    addLift: true,
    liftWidth: 6,
    liftLength: 6,
    addParking: true,
    parkingWidth: 20,
    parkingLength: 18,
    addHouse: true,
    houseWidth: 30,
    houseLength: 20,
    houseType: '2BHK House',
  });

  const [surroundings, setSurroundings] = useState({
    north: "Neighbor's Property",
    south: "30ft Main Road",
    east: "Vacant Plot",
    west: "Park",
  });
  
  const [identificationText, setIdentificationText] = useState("Identified through EC Bill & Customer");

  const [positions, setPositions] = useState({
    staircase: { x: 40, y: 10 },
    lift: { x: 40, y: 25 },
    parking: { x: 10, y: 10 },
    house: { x: 10, y: 15 },
  });

  const diagramRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    setInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSurroundingsChange = (e) => {
    const { name, value } = e.target;
    setSurroundings(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePositionChange = (item, pos) => {
    setPositions(prev => ({...prev, [item]: pos}));
  };

  const calculations = useMemo(() => {
    const pW = parseFloat(inputs.plotWidth) || 0;
    const pL = parseFloat(inputs.plotLength) || 0;
    const sL = parseFloat(inputs.setbackLeft) || 0;
    const sR = parseFloat(inputs.setbackRight) || 0;
    const sF = parseFloat(inputs.setbackFront) || 0;
    const sB = parseFloat(inputs.setbackBack) || 0;
    const numFloors = parseFloat(inputs.numberOfFloors) || 0;

    const plotArea = pW * pL;
    
    // Using the new formula
    const buildableWidth = pW - sL - sR;
    const buildableLength = pL - sF - sB;
    const buildableArea = Math.max(0, buildableWidth) * Math.max(0, buildableLength);
    const totalFloorArea = buildableArea * numFloors;
    const far = plotArea > 0 ? totalFloorArea / plotArea : 0;
    
    return { plotArea, buildableArea, totalFloorArea, far };
  }, [inputs]);

  const handleExport = async () => {
    if (!diagramRef.current) return;
    const canvas = await html2canvas(diagramRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = 'plot-diagram-with-calculations.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col xl:flex-row gap-6 font-sans">
        {/* --- Left Panel --- */}
        <div className="w-full xl:w-1/3 border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-semibold mb-4">Plot Details</h2>
          <Input label="Plot Width (ft)" name="plotWidth" value={inputs.plotWidth} onChange={handleInputChange} />
          <Input label="Plot Length (ft)" name="plotLength" value={inputs.plotLength} onChange={handleInputChange} />
          <Input label="Road Width (ft)" name="roadWidth" value={inputs.roadWidth} onChange={handleInputChange} />
          <Input label="Road Type" name="roadType" value={inputs.roadType} onChange={handleInputChange} type="text" />
          <Input label="Number of Floors" name="numberOfFloors" value={inputs.numberOfFloors} onChange={handleInputChange} />
          
          <h3 className="text-lg font-semibold my-4">Setbacks</h3>
          <Input label="Front (ft)" name="setbackFront" value={inputs.setbackFront} onChange={handleInputChange} />
          <Input label="Back (ft)" name="setbackBack" value={inputs.setbackBack} onChange={handleInputChange} />
          <Input label="Left (ft)" name="setbackLeft" value={inputs.setbackLeft} onChange={handleInputChange} />
          <Input label="Right (ft)" name="setbackRight" value={inputs.setbackRight} onChange={handleInputChange} />

          <h3 className="text-lg font-semibold my-4">Internal Features</h3>
          <Checkbox label="Add Staircase" name="addStaircase" checked={inputs.addStaircase} onChange={handleInputChange} />
          {inputs.addStaircase && <><Input label="Stair W" name="staircaseWidth" value={inputs.staircaseWidth} onChange={handleInputChange} /><Input label="Stair L" name="staircaseLength" value={inputs.staircaseLength} onChange={handleInputChange} /></>}
          <Checkbox label="Add Lift" name="addLift" checked={inputs.addLift} onChange={handleInputChange} />
          {inputs.addLift && <><Input label="Lift W" name="liftWidth" value={inputs.liftWidth} onChange={handleInputChange} /><Input label="Lift L" name="liftLength" value={inputs.liftLength} onChange={handleInputChange} /></>}
          <Checkbox label="Add Parking" name="addParking" checked={inputs.addParking} onChange={handleInputChange} />
          {inputs.addParking && <><Input label="Parking W" name="parkingWidth" value={inputs.parkingWidth} onChange={handleInputChange} /><Input label="Parking L" name="parkingLength" value={inputs.parkingLength} onChange={handleInputChange} /></>}
          
          <h3 className="text-lg font-semibold my-4">House Details</h3>
          <Checkbox label="Add House" name="addHouse" checked={inputs.addHouse} onChange={handleInputChange} />
          {inputs.addHouse && <>
            <Input label="House W (ft)" name="houseWidth" value={inputs.houseWidth} onChange={handleInputChange} />
            <Input label="House L (ft)" name="houseLength" value={inputs.houseLength} onChange={handleInputChange} />
            <Input label="House Type (e.g., 2BHK)" name="houseType" value={inputs.houseType} onChange={handleInputChange} type="text" />
          </>}

          <h3 className="text-lg font-semibold my-4">Surroundings</h3>
          <label className="block text-sm font-medium">North Direction</label>
          <select name="northDirection" value={inputs.northDirection} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md"><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select>
          <Input label="North Side" name="north" value={surroundings.north} onChange={handleSurroundingsChange} type="text" />
          <Input label="South Side" name="south" value={surroundings.south} onChange={handleSurroundingsChange} type="text" />
          <Input label="East Side" name="east" value={surroundings.east} onChange={handleSurroundingsChange} type="text" />
          <Input label="West Side" name="west" value={surroundings.west} onChange={handleSurroundingsChange} type="text" />

          <h3 className="text-lg font-semibold my-4">Identification</h3>
          <Input label="Identified By" name="identification" value={identificationText} onChange={(e) => setIdentificationText(e.target.value)} type="text" />
          
          <button onClick={handleExport} className="w-full mt-4 bg-blue-600 text-white py-2 rounded">Export as PNG</button>
        </div>
        
        {/* --- Right Panel --- */}
        <div className="w-full xl:w-2/3 flex flex-col gap-6">
          <div className="flex-1 flex justify-center items-center p-4 border rounded-md shadow-sm bg-white min-w-0">
            <div className="p-4 bg-white text-center">
              <h2 className="text-xl font-semibold mb-2">Live Diagram Preview</h2>
              <PlotDiagramSVG inputs={inputs} surroundings={surroundings} positions={positions} onPositionChange={handlePositionChange} isExport={false} />
            </div>
          </div>

          <div className="w-full border rounded-md p-4 shadow-sm bg-white">
            <h2 className="text-xl font-semibold mb-4">Calculations Summary</h2>
            <div className="space-y-2 text-lg">
                <div className="flex justify-between"><span>Plot Area:</span> <strong>{calculations.plotArea.toFixed(2)} sq.ft</strong></div>
                <div className="flex justify-between"><span>Buildable Area (per floor):</span> <strong>{calculations.buildableArea.toFixed(2)} sq.ft</strong></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>Total Floor Area ({inputs.numberOfFloors} floors):</span> <strong className="text-blue-600">{calculations.totalFloorArea.toFixed(2)} sq.ft</strong></div>
                <div className="flex justify-between"><span>Floor Area Ratio (FAR):</span> <strong>{calculations.far.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden component for generating the export image */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
          <ExportableImage ref={diagramRef} inputs={inputs} surroundings={surroundings} positions={positions} calculations={calculations} identificationText={identificationText} />
      </div>
    </>
  );
}

// --- Reusable Form Field Components ---
const Input = ({ label, name, ...props }) => ( <div className="mb-2"><label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label><input id={name} name={name} type="number" className="mt-1 p-1.5 w-full text-right border rounded-md shadow-sm" {...props} /></div>);
const Checkbox = ({ label, name, ...props }) => (<div className="flex items-center my-2"><input id={name} name={name} type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" {...props} /><label htmlFor={name} className="ml-2 block text-sm">{label}</label></div>);

// --- Export-only Component ---
const ExportableImage = React.forwardRef(({ inputs, surroundings, positions, calculations, identificationText }, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white border-2 border-black" style={{ width: '1800px', fontFamily: 'monospace' }}>
            <h1 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Plot Area Calculation</h1>
            <div className="flex gap-8">
                <div className="w-3/5">
                    <PlotDiagramSVG inputs={inputs} surroundings={surroundings} positions={positions} isExport={true} />
                </div>
                <div className="w-2/5 text-lg" style={{ paddingTop: '40px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px' }}>Calculation Summary</h2>
                    <div className="space-y-4 text-xl">
                        <p><strong>Plot Area:</strong> {calculations.plotArea.toFixed(0)} sqft</p>
                        <p><strong>Buildable Area (per floor):</strong> {calculations.buildableArea.toFixed(0)} sqft</p>
                        <p style={{ borderTop: '1px solid #888', paddingTop: '8px', marginTop: '8px' }}>
                            <strong>Total Floor Area ({inputs.numberOfFloors} floors):</strong> 
                            <span style={{ fontWeight:'bold', fontSize: '24px', marginLeft: '10px' }}>{calculations.totalFloorArea.toFixed(0)} sqft</span>
                        </p>
                        <p><strong>Floor Area Ratio (FAR):</strong> {calculations.far.toFixed(2)}</p>
                    </div>
                </div>
            </div>
            <p style={{ marginTop: '32px', fontSize: '18px' }}><strong>* {identificationText}</strong></p>
        </div>
    );
});


// --- SVG Diagram Component ---
const PlotDiagramSVG = ({ inputs, surroundings, positions, onPositionChange, isExport }) => {
  const { plotWidth, plotLength, roadWidth, roadType, setbackFront, setbackBack, setbackLeft, setbackRight, northDirection, addStaircase, staircaseWidth, staircaseLength, addLift, liftWidth, liftLength, addParking, parkingWidth, parkingLength, addHouse, houseWidth, houseLength, houseType } = inputs;
  
  const MAX_SVG_DIM = isExport ? 1000 : 500;
  const PADDING = 60;

  const pW = parseFloat(plotWidth) || 0, pL = parseFloat(plotLength) || 0, rW = parseFloat(roadWidth) || 0;
  const sF = parseFloat(setbackFront) || 0, sB = parseFloat(setbackBack) || 0, sL = parseFloat(setbackLeft) || 0, sR = parseFloat(setbackRight) || 0;

  const totalWidthFt = pW;
  const totalHeightFt = pL + rW;
  if (totalWidthFt <= 0) return <div>Invalid Dimensions</div>;

  const scale = Math.min(MAX_SVG_DIM / totalWidthFt, MAX_SVG_DIM / totalHeightFt);
  const svgWidth = totalWidthFt * scale + PADDING * 2;
  const svgHeight = totalHeightFt * scale + PADDING * 2;
  
  const bW = (pW - sL - sR) * scale, bL = (pL - sF - sB) * scale;
  
  const features = {
    house:
