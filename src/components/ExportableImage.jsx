import React from 'react';
import PlotDiagramSVG from './PlotDiagramSVG';

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

export default ExportableImage;
