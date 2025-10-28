import React, { useState, useRef, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';

// --- Helper Functions & Components ---

// Collision Detection Helper
const checkCollision = (item1, item2) => {
  const rect1 = { x: item1.position.x, y: item1.position.y, width: parseFloat(item1.width) || 0, height: parseFloat(item1.length) || 0 };
  const rect2 = { x: item2.position.x, y: item2.position.y, width: parseFloat(item2.width) || 0, height: parseFloat(item2.length) || 0 };
  return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
};

// DraggableSVGItem: Makes its children draggable within SVG.
const DraggableSVGItem = ({ x, y, onPositionChange, constraints, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const CTM = itemRef.current.getScreenCTM();
    offset.current = { x: (e.clientX - CTM.e) / CTM.a - x, y: (e.clientY - CTM.f) / CTM.d - y };
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

  return <g ref={itemRef} transform={`translate(${x}, ${y})`} onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>{children}</g>;
};


// Main App Component
export default function App() {
  const [inputs, setInputs] = useState({
    plotWidth: 60, plotLength: 40, roadWidth: 30, roadType: 'Main Road', northDirection: 'top',
    setbackFront: 5, setbackBack: 5, setbackLeft: 5, setbackRight: 5,
  });

  const [items, setItems] = useState({
    house: { enabled: true, width: 30, length: 25, description: 'G+2 House', position: { x: 15, y: 10 } },
    staircase: { enabled: true, width: 10, length: 6, position: { x: 50, y: 10 } },
    lift: { enabled: true, width: 6, length: 6, position: { x: 50, y: 18 } },
    parking: { enabled: true, width: 29, length: 18, position: { x: 15, y: 15 } },
  });

  const [surroundings, setSurroundings] = useState({ north: "Neighbor's Property", south: "30ft Main Road", east: "Vacant Plot", west: "Park" });
  const [identificationText, setIdentificationText] = useState("Identified through EC Bill & Customer");
  const [floors, setFloors] = useState([{ id: 1, name: 'Ground Floor', grossArea: 1200 }, { id: 2, name: 'FF to 3F', grossArea: 1200 }]);

  const diagramRef = useRef(null);

  const handleInputChange = (e) => setInputs(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSurroundingsChange = (e) => setSurroundings(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleItemChange = (key, field, value) => setItems(p => ({ ...p, [key]: { ...p[key], [field]: value } }));
  const handleItemToggle = (key, checked) => setItems(p => ({ ...p, [key]: { ...p[key], enabled: checked } }));

  const handlePositionChange = (itemName, newPosition) => {
    const currentItem = { ...items[itemName], position: newPosition };
    let collision = false;
    for (const key in items) {
      if (key !== itemName && items[key].enabled) {
        if (checkCollision(currentItem, items[key])) {
          collision = true;
          break;
        }
      }
    }
    if (!collision) {
      setItems(prev => ({ ...prev, [itemName]: { ...prev[itemName], position: newPosition } }));
    }
  };
  
  const calculations = useMemo(() => {
    const pW = parseFloat(inputs.plotWidth)||0, pL = parseFloat(inputs.plotLength)||0;
    const sL = parseFloat(inputs.setbackLeft)||0, sR = parseFloat(inputs.setbackRight)||0;
    const sF = parseFloat(inputs.setbackFront)||0, sB = parseFloat(inputs.setbackBack)||0;

    const plotArea = pW * pL;
    const buildableWidth = pW - sL - sR;
    const buildableLength = pL - sF - sB;
    const buildableArea = buildableWidth * buildableLength;
    const setbackArea = plotArea - buildableArea;
    const totalAllowableFloorArea = buildableArea * floors.length;

    const itemAreas = Object.fromEntries(Object.entries(items).map(([key, item]) => [
        `${key}Area`, item.enabled ? (parseFloat(item.width) * parseFloat(item.length)) : 0
    ]));

    const floorCalculations = floors.map((floor, index) => {
        const gross = parseFloat(floor.grossArea) || 0;
        const isGroundFloor = index === 0;
        const parkingDeduction = isGroundFloor ? itemAreas.parkingArea : 0;
        const netBua = gross - parkingDeduction - itemAreas.staircaseArea - itemAreas.liftArea - setbackArea;
        return { ...floor, netBua: Math.max(0, netBua), ...itemAreas, setbackArea, parkingDeduction };
    });
    
    const totalNetBUA = floorCalculations.reduce((sum, f) => sum + f.netBua, 0);
    const far = plotArea > 0 ? totalNetBUA / plotArea : 0;
    
    return { plotArea, buildableArea, setbackArea, totalAllowableFloorArea, floorCalculations, totalNetBUA, far, ...itemAreas };
  }, [inputs, items, floors]);

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
      <div className="min-h-screen bg-gray-100 p-4 flex flex-col xl:flex-row gap-4 font-sans">
        {/* --- Left Panel --- */}
        <div className="w-full xl:w-1/3 border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-semibold mb-4">Plot & Building Details</h2>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Plot W (ft)" name="plotWidth" value={inputs.plotWidth} onChange={handleInputChange} />
            <Input label="Plot L (ft)" name="plotLength" value={inputs.plotLength} onChange={handleInputChange} />
          </div>
          <h3 className="text-lg font-semibold my-3">Internal Structures</h3>
          {Object.entries(items).map(([key, item]) => (
              <div key={key} className="p-2 border rounded-md mb-2 bg-gray-50">
                  <Checkbox label={`Add ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={item.enabled} onChange={(e) => handleItemToggle(key, e.target.checked)} />
                  {item.enabled && (<>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                          <Input label="Width" value={item.width} onChange={(e) => handleItemChange(key, 'width', e.target.value)} />
                          <Input label="Length" value={item.length} onChange={(e) => handleItemChange(key, 'length', e.target.value)} />
                      </div>
                      {key === 'house' && <Input label="Description" type="text" value={item.description} onChange={(e) => handleItemChange(key, 'description', e.target.value)} />}
                  </>)}
              </div>
          ))}
          <h3 className="text-lg font-semibold my-3">Surroundings</h3>
          <Input label="North Side" name="north" value={surroundings.north} onChange={handleSurroundingsChange} type="text" />
          <Input label="South Side" name="south" value={surroundings.south} onChange={handleSurroundingsChange} type="text" />
          <Input label="East Side" name="east" value={surroundings.east} onChange={handleSurroundingsChange} type="text" />
          <Input label="West Side" name="west" value={surroundings.west} onChange={handleSurroundingsChange} type="text" />
          <Input label="Identified By" name="identification" value={identificationText} onChange={(e) => setIdentificationText(e.target.value)} type="text" />
        </div>
        
        {/* --- Right Panel --- */}
        <div className="w-full xl:w-2/3 flex flex-col gap-4">
          <div className="flex-1 flex justify-center items-center p-2 border rounded-md shadow-sm bg-white min-w-0">
            <PlotDiagramSVG inputs={inputs} items={items} surroundings={surroundings} onPositionChange={handlePositionChange} isExport={false} />
          </div>
          <div className="w-full border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[40vh]">
            <h2 className="text-xl font-semibold mb-2">Floor-wise Gross Area</h2>
            {floors.map((f) => (<div key={f.id} className="grid grid-cols-3 gap-2 items-center mb-2"><input type="text" value={f.name} onChange={(e) => {}} className="p-1 border rounded" /><input type="number" value={f.grossArea} onChange={(e) => {}} className="p-1 border rounded text-right" /><button onClick={()=>{}} className="bg-red-500 text-white py-1 px-2 rounded text-sm">X</button></div>))}
            <button onClick={()=>{}} className="w-full mt-2 bg-green-600 text-white py-2 rounded">Add Floor</button>
            <button onClick={handleExport} className="w-full mt-4 bg-blue-600 text-white py-2 rounded">Export as PNG</button>
          </div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', left: '-9999px' }}><ExportableImage ref={diagramRef} {...{inputs, items, surroundings, calculations, identificationText}} /></div>
    </>
  );
}

// --- Reusable Form Field Components ---
const Input = ({ label, ...props }) => (<div className="w-full"><label className="block text-xs font-medium text-gray-600">{label}</label><input className="mt-1 p-1.5 w-full border rounded-md shadow-sm" {...props} /></div>);
const Checkbox = ({ label, ...props }) => (<div className="flex items-center"><input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" {...props} /><label className="ml-2 block text-sm font-semibold">{label}</label></div>);

// --- Export-only Component ---
const ExportableImage = React.forwardRef(({ inputs, items, surroundings, calculations, identificationText }, ref) => (
    <div ref={ref} className="p-8 bg-white border-2 border-black" style={{ width: '1800px', fontFamily: 'monospace' }}>
        <h1 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>Plot Area Calculation & Diagram</h1>
        <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ width: '60%' }}>
                <PlotDiagramSVG inputs={inputs} items={items} surroundings={surroundings} onPositionChange={()=>{}} isExport={true} />
            </div>
            <div style={{ width: '40%', fontSize: '20px', paddingTop: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px' }}>Calculation Details</h2>
                {calculations.floorCalculations.map((floor, index) => (
                    <div key={floor.id} style={{ marginBottom: '24px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '22px' }}>{floor.name}:</p>
                        <p style={{ paddingLeft: '16px' }}>{floor.grossArea} sqft (Gross)</p>
                        {index === 0 && <p style={{ paddingLeft: '16px' }}>- {calculations.parkingArea.toFixed(0)} sqft (Parking)</p>}
                        <p style={{ paddingLeft: '16px' }}>- {calculations.staircaseArea.toFixed(0)} sqft (Staircase)</p>
                        <p style={{ paddingLeft: '16px' }}>- {calculations.liftArea.toFixed(0)} sqft (Lift)</p>
                        <p style={{ paddingLeft: '16px' }}>- {calculations.setbackArea.toFixed(0)} sqft (Setbacks)</p>
                        <p style={{ paddingLeft: '16px', borderTop: '1px solid #888', paddingTop: '4px', marginTop: '4px' }}>= <span style={{ fontWeight: 'bold' }}>{floor.netBua.toFixed(0)} sqft (Net BUA)</span></p>
                    </div>
                ))}
                <div style={{ marginTop: '24px', borderTop: '2px solid black', paddingTop: '16px' }}>
                    <p><strong>Buildable Area:</strong> {calculations.buildableArea.toFixed(0)} sqft</p>
                    <p><strong>Total Allowable Floor Area:</strong> {calculations.totalAllowableFloorArea.toFixed(0)} sqft</p>
                    <p><strong>Total As-Built Net BUA:</strong> {calculations.totalNetBUA.toFixed(0)} sqft</p>
                </div>
            </div>
        </div>
        <p style={{ marginTop: '32px', fontSize: '20px' }}><strong>* {identificationText}</strong></p>
    </div>
));


// --- SVG Diagram Component ---
const PlotDiagramSVG = ({ inputs, items, surroundings, onPositionChange, isExport }) => {
  const { plotWidth, plotLength, roadWidth, setbackFront, setbackBack, setbackLeft, setbackRight, northDirection } = inputs;
  
  const MAX_SVG_DIM = isExport ? 1000 : 500;
  const PADDING = 60;

  const pW = parseFloat(plotWidth)||0, pL = parseFloat(plotLength)||0, rW = parseFloat(roadWidth)||0;
  const sF = parseFloat(setbackFront)||0, sB = parseFloat(setbackBack)||0, sL = parseFloat(setbackLeft)||0, sR = parseFloat(setbackRight)||0;
  
  const scale = Math.min(MAX_SVG_DIM / (pW + PADDING), MAX_SVG_DIM / (pL + rW + PADDING));
  const svgWidth = pW * scale + PADDING * 2, svgHeight = (pL + rW) * scale + PADDING * 2;
  const bW = (pW - sL - sR) * scale, bL = (pL - sF - sB) * scale;
  
  const buildableConstraints = { x: sL * scale, y: sF * scale, bW, bL };
  const directions = { top: {N:'N',S:'S',E:'E',W:'W'}, bottom: {N:'S',S:'N',E:'W',W:'E'}, left: {N:'W',S:'E',E:'N',W:'S'}, right: {N:'E',S:'W',E:'S',W:'N'} }[northDirection];
  
  const Text = ({ children, ...props }) => <text style={{ fontSize: isExport ? '20px' : '10px' }} {...props}>{children}</text>;
  const BoldText = ({ children, ...props }) => <text style={{ fontSize: isExport ? '24px' : '12px', fontWeight: 'bold' }} {...props}>{children}</text>;
  
  return (
    <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        {/* Surroundings */}
        <BoldText x={pW*scale/2} y={-35} textAnchor="middle">{directions.N}</BoldText>
        <Text x={pW*scale/2} y={-15} textAnchor="middle">({surroundings.north})</Text>
        <Text x={-35} y={pL*scale/2+20} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90, -35, ${pL*scale/2+20})`}>({surroundings.west})</Text>

        {/* Plot and Road */}
        <rect x="0" y={pL*scale} width={pW*scale} height={rW*scale} fill="#e5e7eb" stroke="black" />
        <rect x="0" y="0" width={pW*scale} height={pL*scale} fill="#dcfce7" stroke="black" />

        {/* Setback Area and Labels */}
        <path d={`M0,0 H${pW*scale} V${pL*scale} H0 Z M${sL*scale},${sF*scale} V${(pL-sB)*scale} H${(pW-sR)*scale} V${sF*scale} Z`} fillRule="evenodd" fill="#fef9c3" opacity="0.6" />
        <Text x={pW*scale/2} y={sF*scale/2} textAnchor="middle" dominantBaseline="middle">{sF} ft</Text>
        <Text x={pW*scale/2} y={pL*scale - sB*scale/2} textAnchor="middle" dominantBaseline="middle">{sB} ft</Text>

        {/* Buildable Area */}
        <rect x={sL*scale} y={sF*scale} width={bW} height={bL} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
        
        {/* Draggable Items */}
        {Object.entries(items).map(([key, item]) => item.enabled && (
          <DraggableSVGItem key={key} x={item.position.x * scale} y={item.position.y * scale} onPositionChange={isExport ? ()=>{} : (pos) => onPositionChange(key, { x: pos.x / scale, y: pos.y / scale })} constraints={{x:sL*scale, y:sF*scale, maxX: sL*scale+bW-(item.width*scale), maxY: sF*scale+bL-(item.length*scale)}}>
            <rect width={item.width*scale} height={item.length*scale} fill={key === 'house' ? '#bfdbfe' : '#fef9c3'} stroke={key === 'house' ? '#3b82f6' : '#ca8a04'} strokeWidth="1.5" />
            <foreignObject width={item.width*scale} height={item.length*scale}><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'2px',textTransform:'capitalize',fontSize:isExport ? '18px' : '10px'}}>{item.description || key}</div></foreignObject>
          </DraggableSVGItem>
        ))}
      </g>
    </svg>
  );
};
