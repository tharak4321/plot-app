import React, { useState, useRef } from 'react';
import { useAppData } from './hooks/useAppData';
import PlotDiagramSVG from './components/PlotDiagramSVG';
import ExportableImage from './components/ExportableImage';
import html2canvas from 'html2canvas';

// --- Reusable UI Components ---
const Input = ({ label, ...props }) => (<div className="w-full"><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input className="p-2 w-full border rounded-md shadow-sm bg-gray-50 text-right" {...props} /></div>);
const Checkbox = ({ label, ...props }) => (<div className="flex items-center"><input type="checkbox" className="h-5 w-5 text-blue-600 border-gray-300 rounded" {...props} /><label className="ml-3 block text-base font-semibold">{label}</label></div>);
const Section = ({ title, children }) => (<details className="p-3 border rounded-lg bg-white shadow-sm" open><summary className="text-lg font-bold cursor-pointer">{title}</summary><div className="mt-4 space-y-4">{children}</div></details>);

export default function App() {
  const { inputs, items, surroundings, identificationText, floors, calculations, setState, handleItemChange, handlePositionChange, resetData, collisionItemKey } = useAppData();
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = 'plot-diagram-export.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleFloorChange = (id, field, value) => {
    const newFloors = floors.map(f => f.id === id ? { ...f, [field]: value } : f);
    setState('floors', newFloors);
  };
  
  const addFloor = () => setState('floors', [...floors, { id: Date.now(), name: `New Floor`, grossArea: 1000 }]);
  const removeFloor = (id) => setState('floors', floors.filter(f => f.id !== id));

  return (
    <>
      <div className="p-4 bg-gray-100 font-sans">
        <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* --- Left Panel (Inputs) --- */}
          <div className="w-full lg:w-1/4 space-y-4">
            <Section title="Plot & Road"><div className="grid grid-cols-2 gap-4"><Input label="Plot W (ft)" name="plotWidth" value={inputs.plotWidth} onChange={e => setState('inputs', {...inputs, plotWidth: e.target.value})} /><Input label="Plot L (ft)" name="plotLength" value={inputs.plotLength} onChange={e => setState('inputs', {...inputs, plotLength: e.target.value})} /></div><Input label="Road Width" name="roadWidth" value={inputs.roadWidth} onChange={e => setState('inputs', {...inputs, roadWidth: e.target.value})} /></Section>
            <Section title="Setbacks"><div className="grid grid-cols-2 gap-4"><Input label="Front" value={inputs.setbackFront} onChange={e=>setState('inputs', {...inputs, setbackFront: e.target.value})} /><Input label="Back" value={inputs.setbackBack} onChange={e=>setState('inputs', {...inputs, setbackBack: e.target.value})} /><Input label="Left" value={inputs.setbackLeft} onChange={e=>setState('inputs', {...inputs, setbackLeft: e.target.value})} /><Input label="Right" value={inputs.setbackRight} onChange={e=>setState('inputs', {...inputs, setbackRight: e.target.value})} /></div></Section>
            <Section title="Internal Structures">
              {Object.entries(items).map(([key, item]) => (
                <div key={key} className="p-3 border rounded-md bg-gray-50"><Checkbox label={`Add ${key}`} checked={item.enabled} onChange={(e) => handleItemChange(key, 'enabled', e.target.checked)} />
                  {item.enabled && (<div className="grid grid-cols-2 gap-2 mt-2">
                    <Input label="Width" value={item.width} onChange={(e) => handleItemChange(key, 'width', e.target.value)} />
                    <Input label="Length" value={item.length} onChange={(e) => handleItemChange(key, 'length', e.target.value)} />
                    {key === 'house' && <div className="col-span-2"><Input label="Desc" type="text" value={item.description} onChange={(e) => handleItemChange(key, 'description', e.target.value)} /></div>}
                  </div>)}
                </div>
              ))}
            </Section>
            <Section title="Site Details"><Input label="North Side" value={surroundings.north} onChange={e => setState('surroundings', {...surroundings, north: e.target.value})} type="text" /><Input label="South Side" value={surroundings.south} onChange={e => setState('surroundings', {...surroundings, south: e.target.value})} type="text" /><Input label="East Side" value={surroundings.east} onChange={e => setState('surroundings', {...surroundings, east: e.target.value})} type="text" /><Input label="West Side" value={surroundings.west} onChange={e => setState('surroundings', {...surroundings, west: e.target.value})} type="text" /><Input label="Identified By" value={identificationText} onChange={e => setState('identificationText', e.target.value)} type="text" /></Section>
          </div>

          {/* --- Middle Panel (Diagram) --- */}
          <div className="w-full lg:w-1/2 p-4 bg-white rounded-lg shadow-md flex items-center justify-center">
            <PlotDiagramSVG inputs={inputs} items={items} surroundings={surroundings} onPositionChange={handlePositionChange} collisionItemKey={collisionItemKey} isExport={false} />
          </div>

          {/* --- Right Panel (Floors & Calcs) --- */}
          <div className="w-full lg:w-1/4 space-y-4">
            <Section title="Floor Management">{floors.map((f) => (<div key={f.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center"><input type="text" value={f.name} onChange={(e) => handleFloorChange(f.id, 'name', e.target.value)} className="p-2 border rounded" /><input type="number" value={f.grossArea} onChange={(e) => handleFloorChange(f.id, 'grossArea', e.target.value)} className="p-2 border rounded text-right" /><button onClick={()=>removeFloor(f.id)} className="bg-red-500 text-white w-8 h-8 rounded">&times;</button></div>))}<button onClick={addFloor} className="w-full mt-2 bg-green-600 text-white py-2 rounded">Add Floor</button></Section>
            <Section title="Calculations"><div className="text-lg space-y-2"><div><strong>Plot Area:</strong><span className="float-right">{calculations.plotArea.toFixed(0)} sqft</span></div><div><strong>Total Allowable BUA:</strong><span className="float-right">{calculations.totalAllowableFloorArea.toFixed(0)} sqft</span></div><div><strong>Total As-Built BUA:</strong><span className="float-right">{calculations.totalNetBUA.toFixed(0)} sqft</span></div></div></Section>
            <div className="p-3 bg-white rounded-lg shadow-sm space-y-3"><button onClick={handleExport} disabled={isExporting} className="w-full text-xl font-bold bg-blue-600 text-white py-3 rounded-lg disabled:bg-gray-400">{isExporting ? 'Generating...' : 'Export as PNG'}</button><button onClick={resetData} className="w-full text-lg bg-red-500 text-white py-2 rounded-lg">Reset Data</button></div>
          </div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}><ExportableImage ref={exportRef} {...{inputs, items, surroundings, calculations, identificationText}} /></div>
    </>
  );
}
