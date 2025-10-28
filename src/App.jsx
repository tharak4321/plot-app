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
    addStaircase: true,
    staircaseWidth: 10,
    staircaseLength: 6,
    addLift: true,
    liftWidth: 6,
    liftLength: 6,
    addParking: true,
    parkingWidth: 29,
    parkingLength: 18,
  });

  const [surroundings, setSurroundings] = useState({
    north: "Neighbor's Property",
    south: "30ft Main Road",
    east: "Vacant Plot",
    west: "Park",
  });
  
  const [identificationText, setIdentificationText] = useState("Identified through EC Bill & Customer");

  const [floors, setFloors] = useState([
    { id: 1, name: 'Ground Floor', grossArea: 1200 },
    { id: 2, name: 'FF to 3F', grossArea: 1200 },
  ]);

  const [positions, setPositions] = useState({
    staircase: { x: 10, y: 10 },
    lift: { x: 25, y: 10 },
    parking: { x: 10, y: 20 },
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

  const handleFloorChange = (id, field, value) => {
    setFloors(floors.map(f => f.id === id ? { ...f, [field]: value } : f));
  };
  
  const addFloor = () => {
    const newId = floors.length > 0 ? Math.max(...floors.map(f => f.id)) + 1 : 1;
    setFloors([...floors, { id: newId, name: `Floor ${newId}`, grossArea: 1200 }]);
  };

  const removeFloor = (id) => setFloors(floors.filter(f => f.id !== id));
  
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

    const plotArea = pW * pL;
    const buildableWidth = pW - sL - sR;
    const buildableLength = pL - sF - sB;
    const buildableArea = buildableWidth * buildableLength;
    const setbackArea = plotArea - buildableArea;

    const parkingArea = inputs.addParking ? (parseFloat(inputs.parkingWidth) * parseFloat(inputs.parkingLength)) : 0;
    const staircaseArea = inputs.addStaircase ? (parseFloat(inputs.staircaseWidth) * parseFloat(inputs.staircaseLength)) : 0;
    const liftArea = inputs.addLift ? (parseFloat(inputs.liftWidth) * parseFloat(inputs.liftLength)) : 0;

    const floorCalculations = floors.map((floor, index) => {
        const gross = parseFloat(floor.grossArea) || 0;
        const isGroundFloor = index === 0;
        const parkingDeduction = isGroundFloor ? parkingArea : 0;
        const netBua = gross - parkingDeduction - staircaseArea - liftArea - setbackArea;
        return { ...floor, netBua: Math.max(0, netBua), parkingDeduction, staircaseArea, liftArea, setbackArea };
    });
    
    const totalNetBUA = floorCalculations.reduce((sum, f) => sum + f.netBua, 0);
    const far = plotArea > 0 ? totalNetBUA / plotArea : 0;
    
    return { plotArea, buildableArea, setbackArea, parkingArea, staircaseArea, liftArea, floorCalculations, totalNetBUA, far };
  }, [inputs, floors]);

  const handleExport = async () => {
    if (!diagramRef.current) return;
    const canvas = await html2canvas(diagramRef.current, { backgroundColor: '#ffffff', scale: 3 });
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
          
          <h3 className="text-lg font-semibold my-4">Setbacks</h3>
          <Input label="Front Setback (ft)" name="setbackFront" value={inputs.setbackFront} onChange={handleInputChange} />
          <Input label="Back Setback (ft)" name="setbackBack" value={inputs.setbackBack} onChange={handleInputChange} />
          <Input label="Left Setback (ft)" name="setbackLeft" value={inputs.setbackLeft} onChange={handleInputChange} />
          <Input label="Right Setback (ft)" name="setbackRight" value={inputs.setbackRight} onChange={handleInputChange} />

          <h3 className="text-lg font-semibold my-4">Internal Features</h3>
          <Checkbox label="Add Staircase" name="addStaircase" checked={inputs.addStaircase} onChange={handleInputChange} />
          {inputs.addStaircase && <><Input label="Stair W" name="staircaseWidth" value={inputs.staircaseWidth} onChange={handleInputChange} /><Input label="Stair L" name="staircaseLength" value={inputs.staircaseLength} onChange={handleInputChange} /></>}
          <Checkbox label="Add Lift" name="addLift" checked={inputs.addLift} onChange={handleInputChange} />
          {inputs.addLift && <><Input label="Lift W" name="liftWidth" value={inputs.liftWidth} onChange={handleInputChange} /><Input label="Lift L" name="liftLength" value={inputs.liftLength} onChange={handleInputChange} /></>}
          <Checkbox label="Add Parking" name="addParking" checked={inputs.addParking} onChange={handleInputChange} />
          {inputs.addParking && <><Input label="Parking W" name="parkingWidth" value={inputs.parkingWidth} onChange={handleInputChange} /><Input label="Parking L" name="parkingLength" value={inputs.parkingLength} onChange={handleInputChange} /></>}

          <h3 className="text-lg font-semibold my-4">Surroundings</h3>
          <label className="block text-sm font-medium">North Direction</label>
          <select name="northDirection" value={inputs.northDirection} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md"><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select>
          <Input label="North Side" name="north" value={surroundings.north} onChange={handleSurroundingsChange} type="text" />
          <Input label="South Side" name="south" value={surroundings.south} onChange={handleSurroundingsChange} type="text" />
          <Input label="East Side" name="east" value={surroundings.east} onChange={handleSurroundingsChange} type="text" />
          <Input label="West Side" name="west" value={surroundings.west} onChange={handleSurroundingsChange} type="text" />

          <h3 className="text-lg font-semibold my-4">Identification</h3>
          <Input label="Identified By" name="identification" value={identificationText} onChange={(e) => setIdentificationText(e.target.value)} type="text" />
        </div>
        
        {/* --- Right Panel --- */}
        <div className="w-full xl:w-2/3 flex flex-col gap-6">
          <div className="flex-1 flex justify-center items-center p-4 border rounded-md shadow-sm bg-white min-w-0">
            <div className="p-4 bg-white text-center">
              <h2 className="text-xl font-semibold mb-2">Live Diagram Preview</h2>
              <PlotDiagramSVG inputs={inputs} surroundings={surroundings} positions={positions} onPositionChange={handlePositionChange} calculations={calculations} isExport={false} />
            </div>
          </div>

          <div className="w-full border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[40vh]">
            <h2 className="text-xl font-semibold mb-4">Floor-wise Gross Area</h2>
            {floors.map((floor) => (
              <div key={floor.id} className="grid grid-cols-3 gap-2 items-center mb-2">
                <input type="text" value={floor.name} onChange={(e) => handleFloorChange(floor.id, 'name', e.target.value)} className="col-span-1 p-1.5 border rounded-md" />
                <input type="number" value={floor.grossArea} onChange={(e) => handleFloorChange(floor.id, 'grossArea', e.target.value)} className="col-span-1 p-1.5 border rounded-md text-right" />
                <button onClick={() => removeFloor(floor.id)} className="col-span-1 bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600">Remove</button>
              </div>
            ))}
            <button onClick={addFloor} className="w-full mt-2 bg-green-600 text-white py-2 rounded">Add Floor</button>
            <button onClick={handleExport} className="w-full mt-4 bg-blue-600 text-white py-2 rounded">Export as PNG</button>
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
        <div ref={ref} className="p-8 bg-white border-2 border-black" style={{ width: '1600px', fontFamily: 'monospace' }}>
            <h1 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Plot Area Calculation</h1>
            <div className="flex gap-8">
                <div className="w-2/3">
                    <PlotDiagramSVG inputs={inputs} surroundings={surroundings} positions={positions} calculations={calculations} isExport={true} />
                </div>
                <div className="w-1/3 text-lg" style={{ paddingTop: '40px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px' }}>Calculation Details</h2>
                    {calculations.floorCalculations.map((floor, index) => (
                        <div key={floor.id} className="mb-6">
                            <p style={{ fontWeight: 'bold', fontSize: '20px' }}>{floor.name}:</p>
                            <p className="pl-4">{floor.grossArea} sqft (Gross)</p>
                            {index === 0 && <p className="pl-4">- {calculations.parkingArea.toFixed(0)} sqft (Parking)</p>}
                            <p className="pl-4">- {calculations.staircaseArea.toFixed(0)} sqft (Staircase)</p>
                            <p className="pl-4">- {calculations.liftArea.toFixed(0)} sqft (Lift)</p>
                            <p className="pl-4">- {calculations.setbackArea.toFixed(0)} sqft (Setbacks)</p>
                            <p className="pl-4" style={{ borderTop: '1px solid #888', paddingTop: '4px', marginTop: '4px' }}>= <span style={{ fontWeight: 'bold' }}>{floor.netBua.toFixed(0)} sqft (Net BUA)</span></p>
                        </div>
                    ))}
                    <div style={{ marginTop: '24px', borderTop: '2px solid black', paddingTop: '16px' }}>
                        <p><strong>Total Plot Area:</strong> {calculations.plotArea.toFixed(0)} sqft</p>
                        <p><strong>Total Net BUA:</strong> {calculations.totalNetBUA.toFixed(0)} sqft</p>
                        <p><strong>FAR Achieved:</strong> {calculations.far.toFixed(2)}</p>
                    </div>
                </div>
            </div>
            <p style={{ marginTop: '32px', fontSize: '18px' }}><strong>* {identificationText}</strong></p>
        </div>
    );
});


// --- SVG Diagram Component ---
const PlotDiagramSVG = ({ inputs, surroundings, positions, onPositionChange, calculations, isExport }) => {
  const { plotWidth, plotLength, roadWidth, roadType, setbackFront, setbackBack, setbackLeft, setbackRight, northDirection, addStaircase, staircaseWidth, staircaseLength, addLift, liftWidth, liftLength, addParking, parkingWidth, parkingLength } = inputs;
  
  const MAX_SVG_DIM = isExport ? 900 : 500;
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
    staircase: { w: parseFloat(staircaseWidth) * scale, l: parseFloat(staircaseLength) * scale, show: addStaircase, fill: '#fecaca', stroke: '#b91c1c' },
    lift: { w: parseFloat(liftWidth) * scale, l: parseFloat(liftLength) * scale, show: addLift, fill: '#d1d5db', stroke: '#4b5563' },
    parking: { w: parseFloat(parkingWidth) * scale, l: parseFloat(parkingLength) * scale, show: addParking, fill: '#fef9c3', stroke: '#ca8a04' }
  };
  
  const buildableConstraints = { x: sL * scale, y: sF * scale, bW, bL };

  const directions = { top: {N:'N',S:'S',E:'E',W:'W'}, bottom: {N:'S',S:'N',E:'W',W:'E'}, left: {N:'W',S:'E',E:'N',W:'S'}, right: {N:'E',S:'W',E:'S',W:'N'} }[northDirection];
  
  const Text = ({ children, ...props }) => <text style={{ fontSize: isExport ? '20px' : '10px' }} {...props}>{children}</text>;
  const BoldText = ({ children, ...props }) => <text style={{ fontSize: isExport ? '24px' : '12px', fontWeight: 'bold' }} {...props}>{children}</text>;
  
  return (
    <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        {/* Surroundings & Directions */}
        <BoldText x={pW*scale/2} y={-35} textAnchor="middle">{directions.N}</BoldText>
        <Text x={pW*scale/2} y={-15} textAnchor="middle">({surroundings.north})</Text>
        <BoldText x={pW*scale/2} y={pL*scale+45} textAnchor="middle">{directions.S}</BoldText>
        <Text x={pW*scale/2} y={pL*scale+65} textAnchor="middle">({surroundings.south})</Text>
        <BoldText x={-35} y={pL*scale/2} textAnchor="middle">{directions.W}</BoldText>
        <Text x={-35} y={pL*scale/2+20} textAnchor="middle">({surroundings.west})</Text>
        <BoldText x={pW*scale+35} y={pL*scale/2} textAnchor="middle">{directions.E}</BoldText>
        <Text x={pW*scale+35} y={pL*scale/2+20} textAnchor="middle">({surroundings.east})</Text>

        {/* Road and Plot */}
        <rect x="0" y={pL*scale} width={pW*scale} height={rW*scale} fill="#e5e7eb" stroke="black" />
        <BoldText x={pW*scale/2} y={pL*scale+rW*scale/2} textAnchor="middle" fill="#374151">{roadType}</BoldText>
        <rect x="0" y="0" width={pW*scale} height={pL*scale} fill="#dcfce7" stroke="black" />

        {/* Setback Area and Labels */}
        <path d={`M0,0 H${pW*scale} V${pL*scale} H0 Z M${sL*scale},${sF*scale} V${(pL-sB)*scale} H${(pW-sR)*scale} V${sF*scale} Z`} fillRule="evenodd" fill="#fef9c3" opacity="0.6" />
        <Text x={pW*scale/2} y={sF*scale/2} textAnchor="middle" alignmentBaseline="middle">{sF} ft</Text>
        <Text x={pW*scale/2} y={pL*scale - sB*scale/2} textAnchor="middle" alignmentBaseline="middle">{sB} ft</Text>
        <Text x={sL*scale/2} y={pL*scale/2} textAnchor="middle" transform={`rotate(-90 ${sL*scale/2} ${pL*scale/2})`}>{sL} ft</Text>
        <Text x={pW*scale - sR*scale/2} y={pL*scale/2} textAnchor="middle" transform={`rotate(90 ${pW*scale - sR*scale/2} ${pL*scale/2})`}>{sR} ft</Text>

        {/* Buildable Area */}
        <rect x={sL*scale} y={sF*scale} width={bW} height={bL} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
        <foreignObject x={sL*scale} y={sF*scale} width={bW} height={bL}><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',color:'#1e3a8a',fontWeight:'bold',fontSize: isExport ? '24px' : '12px'}}>Buildable Area</div></foreignObject>

        {/* Draggable Items */}
        {Object.entries(features).map(([key, f]) => f.show && (
          <DraggableSVGItem key={key} x={positions[key].x * scale} y={positions[key].y * scale} onPositionChange={isExport ? ()=>{} : (pos) => onPositionChange(key, { x: pos.x / scale, y: pos.y / scale })} constraints={{...buildableConstraints, maxX: buildableConstraints.x + bW - f.w, maxY: buildableConstraints.y + bL - f.l}}>
            <rect width={f.w} height={f.l} fill={f.fill} stroke={f.stroke} strokeWidth="1.5" />
            <foreignObject width={f.w} height={f.l}><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',textTransform:'capitalize',fontSize:isExport ? '16px' : '10px'}}>{key}</div></foreignObject>
          </DraggableSVGItem>
        ))}

        {/* Dimension Lines */}
        <Text x={pW*scale/2} y={pL*scale+rW*scale+25} textAnchor="middle">{pW} ft</Text>
        <Text x={pW*scale+25} y={pL*scale/2} textAnchor="middle" transform={`rotate(-90 ${pW*scale+25} ${pL*scale/2})`}>{pL} ft</Text>
      </g>
    </svg>
  );
};
