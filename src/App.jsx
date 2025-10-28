import React, { useState, useRef } from 'react';
import { useAppData } from './hooks/useAppData';
import PlotDiagramSVG from './components/PlotDiagramSVG';
import ExportableImage from './components/ExportableImage';
import html2canvas from 'html2canvas';

// --- Reusable UI Components ---
const Input = ({ label, ...props }) => (<div className="w-full"><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input className="p-2 w-full border rounded-md shadow-sm bg-gray-50" {...props} /></div>);
const Checkbox = ({ label, ...props }) => (<div className="flex items-center"><input type="checkbox" className="h-5 w-5 text-blue-600 border-gray-300 rounded" {...props} /><label className="ml-3 block text-base font-semibold">{label}</label></div>);
const TabButton = ({ label, isActive, onClick }) => (<button onClick={onClick} className={`px-4 py-2 text-lg font-semibold rounded-t-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{label}</button>);

export default function App() {
  const { inputs, items, surroundings, identificationText, floors, calculations, setAllState, handleItemChange, handlePositionChange, resetData } = useAppData();
  const [activeTab, setActiveTab] = useState('plot');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = 'plot-diagram-export.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Failed to export image:", error);
      alert("Could not export the image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'plot': return (
        <>
          <Input label="Plot Width (ft)" name="plotWidth" value={inputs.plotWidth} onChange={e => setAllState({ inputs: {...inputs, plotWidth: e.target.value} })} />
          <Input label="Plot Length (ft)" name="plotLength" value={inputs.plotLength} onChange={e => setAllState({ inputs: {...inputs, plotLength: e.target.value} })} />
          <Input label="Road Width (ft)" name="roadWidth" value={inputs.roadWidth} onChange={e => setAllState({ inputs: {...inputs, roadWidth: e.target.value} })} />
        </>
      );
      case 'items': return (
        <>
          {Object.entries(items).map(([key, item]) => (
              <div key={key} className="p-3 border rounded-md mb-3 bg-gray-50">
                  <Checkbox label={`Add ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={item.enabled} onChange={(e) => handleItemChange(key, 'enabled', e.target.checked)} />
                  {item.enabled && (<div className="mt-2 space-y-2">
                      <Input label="Width (ft)" value={item.width} onChange={(e) => handleItemChange(key, 'width', e.target.value)} />
                      <Input label="Length (ft)" value={item.length} onChange={(e) => handleItemChange(key, 'length', e.target.value)} />
                      {key === 'house' && <Input label="Description" type="text" value={item.description} onChange={(e) => handleItemChange(key, 'description', e.target.value)} />}
                  </div>)}
              </div>
          ))}
        </>
      );
      // Add other cases for 'floors', 'surroundings' if needed
      default: return null;
    }
  };

  return (
    <>
      <div className="p-4 bg-gray-100 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* --- Diagram Section --- */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <PlotDiagramSVG inputs={inputs} items={items} surroundings={surroundings} onPositionChange={handlePositionChange} isExport={false} />
          </div>

          {/* --- Input Section with Tabs --- */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-2">
                <TabButton label="Plot" isActive={activeTab === 'plot'} onClick={() => setActiveTab('plot')} />
                <TabButton label="Items" isActive={activeTab === 'items'} onClick={() => setActiveTab('items')} />
              </nav>
            </div>
            <div className="space-y-4">{renderTabContent()}</div>
          </div>
          
          {/* --- Action Buttons --- */}
          <div className="p-4 bg-white rounded-lg shadow-md space-y-4">
              <button onClick={handleExport} disabled={isExporting} className="w-full text-xl font-bold bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                  {isExporting ? 'Generating PNG...' : 'Export as PNG'}
              </button>
              <button onClick={resetData} className="w-full text-lg bg-red-500 text-white py-2 rounded-lg hover:bg-red-600">
                  Reset to Defaults
              </button>
          </div>
        </div>
      </div>
      
      {/* Hidden component for generating the export image */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <ExportableImage ref={exportRef} {...{inputs, items, surroundings, calculations, identificationText}} />
      </div>
    </>
  );
}
