import React from 'react';
import DraggableSVGItem from './DraggableSVGItem';

export default function PlotDiagramSVG({ inputs, items, surroundings, onPositionChange, isExport, collisionItemKey }) {
  const { plotWidth, plotLength, roadWidth, setbackFront, setbackBack, setbackLeft, setbackRight, northDirection } = inputs;
  const MAX_SVG_DIM = isExport ? 1000 : 500;
  const PADDING = 60;

  const pW=parseFloat(plotWidth)||0, pL=parseFloat(plotLength)||0, rW=parseFloat(roadWidth)||0, sF=parseFloat(setbackFront)||0, sB=parseFloat(setbackBack)||0, sL=parseFloat(setbackLeft)||0, sR=parseFloat(setbackRight)||0;
  
  const scale = Math.min(MAX_SVG_DIM / (pW + PADDING), MAX_SVG_DIM / (pL + rW + PADDING));
  const svgWidth = pW * scale + PADDING * 2, svgHeight = (pL + rW) * scale + PADDING * 2;
  const bW = (pW - sL - sR) * scale, bL = (pL - sF - sB) * scale;
  
  const buildableConstraints = { x: sL * scale, y: sF * scale, bW, bL };
  const directions = { top: {N:'N',S:'S',E:'E',W:'W'}, bottom: {N:'S',S:'N',E:'W',W:'E'}, left: {N:'W',S:'E',E:'N',W:'S'}, right: {N:'E',S:'W',E:'S',W:'N'} }[northDirection];
  
  const Text = ({ children, ...props }) => <text style={{ fontSize: isExport ? '20px' : '12px', fill: '#333' }} {...props}>{children}</text>;
  const BoldText = ({ children, ...props }) => <text style={{ fontSize: isExport ? '24px' : '14px', fontWeight: 'bold' }} {...props}>{children}</text>;

  return (
    <svg width="100%" height="auto" viewBox={`0 0 ${svgWidth} ${svgHeight}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="red" />
        </filter>
      </defs>
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        {/* Surroundings & Directions */}
        <BoldText x={pW*scale/2} y={-35} textAnchor="middle">{directions.N}</BoldText>
        <Text x={pW*scale/2} y={-15} textAnchor="middle">({surroundings.north})</Text>

        {/* Plot and Road */}
        <rect x="0" y={pL*scale} width={pW*scale} height={rW*scale} fill="#e5e7eb" stroke="black" />
        <rect x="0" y="0" width={pW*scale} height={pL*scale} fill="#dcfce7" stroke="black" />

        {/* Setback Area and Labels */}
        <path d={`M0,0 H${pW*scale} V${pL*scale} H0 Z M${sL*scale},${sF*scale} V${(pL-sB)*scale} H${(pW-sR)*scale} V${sF*scale} Z`} fillRule="evenodd" fill="#fef9c3" opacity="0.6" />
        <Text x={pW*scale/2} y={sF*scale/2} textAnchor="middle" dominantBaseline="middle">{sF} ft</Text>
        
        {/* Buildable Area */}
        <rect x={sL*scale} y={sF*scale} width={bW} height={bL} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
        
        {/* Draggable Items */}
        {Object.entries(items).map(([key, item]) => item.enabled && (
          <DraggableSVGItem key={key} x={item.position.x * scale} y={item.position.y * scale} onPositionChange={isExport ? ()=>{} : (pos) => onPositionChange(key, { x: pos.x / scale, y: pos.y / scale })} constraints={{x:sL*scale, y:sF*scale, maxX: sL*scale+bW-(item.width*scale), maxY: sF*scale+bL-(item.length*scale)}} >
            <g style={{ filter: collisionItemKey === key ? 'url(#glow)' : 'none', transition: 'filter 0.2s' }}>
              <rect width={item.width*scale} height={item.length*scale} fill={key === 'house' ? '#bfdbfe' : '#fef9c3'} stroke={key === 'house' ? '#3b82f6' : '#ca8a04'} strokeWidth="1.5" />
              <foreignObject width={item.width*scale} height={item.length*scale}><div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'2px',textTransform:'capitalize',fontSize:isExport ? '18px' : '11px', overflow:'hidden'}}>{item.description || key}</div></foreignObject>
            </g>
          </DraggableSVGItem>
        ))}
      </g>
    </svg>
  );
};
