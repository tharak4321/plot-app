import React, { useState, useRef, useMemo, useCallback } from "react";
import html2canvas from "html2canvas";

// Helper to format camelCase keys into readable labels
const formatLabel = (key) => {
  const result = key.replace(/([A-Z])/g, " $1");
  // Special handling for units or specific labels
  if (
    key.includes("Width") ||
    key.includes("Length") ||
    key.includes("setback") ||
    key.includes("Height")
  ) {
    return result.charAt(0).toUpperCase() + result.slice(1) + " (ft)";
  }
  if (key === "floors") return "Number of Floors";
  if (key === "plotOrientation") return "Plot Orientation (degrees)";
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export default function App() {
  const [inputs, setInputs] = useState({
    plotWidth: 50,
    plotLength: 100,
    roadWidth: 30,
    setbackFront: 15,
    setbackBack: 10,
    setbackLeft: 8,
    setbackRight: 8,
    buildingFootprintWidth: 30, // New input for actual building footprint
    buildingFootprintLength: 60, // New input for actual building footprint
    floors: 3,
    buildingHeightPerFloor: 10, // New input
    maxGroundCoverageLimit: 60, // New regulation limit
    maxFARLimit: 2.0, // New regulation limit
    plotOrientation: 0, // New input for North arrow rotation (degrees)
    addParking: true,
    parkingWidth: 20,
    parkingLength: 20,
    staircaseWidth: 8,
    staircaseLength: 8,
    addStaircase: true,
    addGrid: true, // Toggle for grid overlay
  });

  const diagramRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, type, value, checked } = e.target;
    setInputs((prevInputs) => ({
      ...prevInputs,
      [name]:
        type === "checkbox" ? checked : Math.max(0, parseFloat(value) || 0),
    }));
  }, []);

  const calculations = useMemo(() => {
    const {
      plotWidth,
      plotLength,
      setbackLeft,
      setbackRight,
      setbackFront,
      setbackBack,
      floors,
      buildingFootprintWidth,
      buildingFootprintLength,
      buildingHeightPerFloor,
      maxGroundCoverageLimit,
      maxFARLimit,
    } = inputs;

    const plotArea = plotWidth * plotLength;
    const buildableWidth = Math.max(0, plotWidth - setbackLeft - setbackRight);
    const buildableLength = Math.max(
      0,
      plotLength - setbackFront - setbackBack
    );
    const buildableArea = buildableWidth * buildableLength;

    // Ensure building footprint doesn't exceed buildable area
    const actualBuildingWidth = Math.min(
      buildingFootprintWidth,
      buildableWidth
    );
    const actualBuildingLength = Math.min(
      buildingFootprintLength,
      buildableLength
    );

    const groundFloorArea = actualBuildingWidth * actualBuildingLength;
    const totalBUA = groundFloorArea * floors;
    const groundCoverage =
      plotArea > 0 ? (groundFloorArea / plotArea) * 100 : 0;
    const far = plotArea > 0 ? totalBUA / plotArea : 0;
    const totalBuildingHeight = floors * buildingHeightPerFloor;

    // Compliance Checks
    const isGroundCoverageCompliant = groundCoverage <= maxGroundCoverageLimit;
    const isFARCompliant = far <= maxFARLimit;
    const isBuildingWithinBuildableArea =
      buildingFootprintWidth <= buildableWidth &&
      buildingFootprintLength <= buildableLength;

    return {
      plotArea,
      buildableArea,
      groundFloorArea,
      totalBUA,
      groundCoverage,
      far,
      buildableWidth,
      buildableLength,
      actualBuildingWidth,
      actualBuildingLength,
      totalBuildingHeight,
      isGroundCoverageCompliant,
      isFARCompliant,
      isBuildingWithinBuildableArea,
      maxGroundCoverageLimit,
      maxFARLimit,
    };
  }, [inputs]);

  const handleExport = async () => {
    if (!diagramRef.current) return;
    const canvas = await html2canvas(diagramRef.current, {
      backgroundColor: null,
      logging: false,
      scale: 2,
    }); // Increased scale for better resolution
    const link = document.createElement("a");
    link.download = "advanced-plot-diagram.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col lg:flex-row gap-6 font-sans">
      <div className="lg:w-1/3 border rounded-md p-4 shadow-sm bg-white overflow-y-auto max-h-[calc(100vh-2rem)]">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Property Dimensions & Regulations
        </h2>
        {Object.keys(inputs).map((key) => {
          if (typeof inputs[key] === "boolean") {
            return (
              <div
                key={key}
                className="flex justify-between items-center text-sm mb-2 pb-1 border-b border-gray-100 last:border-b-0"
              >
                <label className="text-gray-600">{formatLabel(key)}</label>
                <input
                  type="checkbox"
                  name={key}
                  checked={inputs[key]}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            );
          }
          return (
            <div
              key={key}
              className="flex justify-between items-center text-sm mb-2 pb-1 border-b border-gray-100 last:border-b-0"
            >
              <label className="text-gray-600">{formatLabel(key)}</label>
              <input
                type="number"
                name={key}
                value={inputs[key]}
                onChange={handleChange}
                min="0"
                step={key === "plotOrientation" ? "5" : "1"} // Allow fine-tuning for orientation
                className="border p-1.5 w-28 text-right rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          );
        })}

        <div className="border-t pt-4 mt-4 space-y-2">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            Calculated Metrics
          </h3>
          <MetricItem
            label="Plot Area"
            value={calculations.plotArea}
            unit="sq.ft"
          />
          <MetricItem
            label="Buildable Area"
            value={calculations.buildableArea}
            unit="sq.ft"
          />
          <MetricItem
            label="Ground Floor Area (Building)"
            value={calculations.groundFloorArea}
            unit="sq.ft"
          />
          <MetricItem
            label="Total Built-Up Area (BUA)"
            value={calculations.totalBUA}
            unit="sq.ft"
          />
          <MetricItem
            label="Ground Coverage"
            value={calculations.groundCoverage}
            unit="%"
            compliant={calculations.isGroundCoverageCompliant}
            limit={calculations.maxGroundCoverageLimit}
          />
          <MetricItem
            label="Floor Area Ratio (FAR)"
            value={calculations.far}
            unit=""
            compliant={calculations.isFARCompliant}
            limit={calculations.maxFARLimit}
          />
          <MetricItem
            label="Total Building Height"
            value={calculations.totalBuildingHeight}
            unit="ft"
          />
        </div>
        <button
          onClick={handleExport}
          className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Export Diagram as PNG
        </button>
      </div>

      <div className="flex-1 flex justify-center items-center p-4 border rounded-md shadow-sm bg-white">
        <div ref={diagramRef} className="p-4 bg-white relative">
          <PlotDiagramSVG inputs={inputs} buildable={calculations} />
        </div>
      </div>
    </div>
  );
}

// Reusable Metric Item Component
const MetricItem = ({ label, value, unit, compliant = true, limit = null }) => {
  const isComplianceMetric = limit !== null;
  const complianceClass = isComplianceMetric
    ? compliant
      ? "text-green-600"
      : "text-red-600"
    : "text-gray-800";
  const limitText = isComplianceMetric ? ` (Limit: ${limit}${unit})` : "";

  return (
    <div className="flex justify-between text-sm items-center pb-1 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-600">{label}:</span>
      <strong className={`${complianceClass}`}>
        {value.toFixed(2)}
        {unit}
        {limitText}
      </strong>
    </div>
  );
};

// ------------------- Advanced SVG Component -------------------
const PlotDiagramSVG = ({ inputs, buildable }) => {
  const {
    plotWidth,
    plotLength,
    roadWidth,
    setbackFront,
    setbackBack,
    setbackLeft,
    setbackRight,
    parkingWidth,
    parkingLength,
    staircaseWidth,
    staircaseLength,
    addParking,
    addStaircase,
    plotOrientation,
    addGrid,
  } = inputs;

  const PADDING = 30; // Increased padding
  const MAX_SVG_DIM = 600; // Max dimension for the SVG canvas

  const totalWidthFt = plotWidth;
  const totalHeightFt = plotLength + roadWidth;

  if (totalWidthFt <= 0 || totalHeightFt <= 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
        Enter valid plot dimensions to view diagram
      </div>
    );
  }

  // Calculate scale based on the largest dimension of the plot + road
  const scale = Math.min(
    MAX_SVG_DIM / totalWidthFt,
    MAX_SVG_DIM / totalHeightFt
  );

  const svgWidth = totalWidthFt * scale + PADDING * 2;
  const svgHeight = totalHeightFt * scale + PADDING * 2;

  // Scaled dimensions
  const pW = plotWidth * scale;
  const pL = plotLength * scale;
  const rW = roadWidth * scale;
  const sF = setbackFront * scale;
  const sB = setbackBack * scale;
  const sL = setbackLeft * scale;
  const sR = setbackRight * scale;

  const bW = buildable.buildableWidth * scale;
  const bL = buildable.buildableLength * scale;

  const actualBW = buildable.actualBuildingWidth * scale;
  const actualBL = buildable.actualBuildingLength * scale;

  // Center the actual building footprint within the buildable area
  const actualBuildingX = sL + (bW - actualBW) / 2;
  const actualBuildingY = sB + (bL - actualBL) / 2;

  const parkW = parkingWidth * scale;
  const parkL = parkingLength * scale;
  const stairW = staircaseWidth * scale;
  const stairL = staircaseLength * scale;

  // Position parking towards the back, centered
  const parkX = sL + (bW - parkW) / 2;
  const parkY = sB + bL - parkL - 5; // A bit offset from the back setback

  // Position staircase towards the front-left, inside building footprint
  const stairX = actualBuildingX + 5;
  const stairY = actualBuildingY + 5;

  // Compliance colors
  const buildingOutlineColor = buildable.isBuildingWithinBuildableArea
    ? "#1d4ed8"
    : "#dc2626"; // Blue for compliant, Red for non-compliant

  // Grid setup
  const gridSize = 10 * scale; // 10 ft grid lines

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>{`
          .dim-text { font-size: 10px; fill: #333; }
          .label-text { font-size: 12px; font-weight: bold; fill: #fff; }
          .outline-text { font-size: 11px; fill: #1f2937; }
          .compliance-label { font-size: 10px; fill: #dc2626; font-weight: bold; }
        `}</style>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="black" />
        </marker>
      </defs>

      <g transform={`translate(${PADDING}, ${PADDING})`}>
        {/* North Arrow */}
        <g
          transform={`translate(${pW / 2}, ${
            -PADDING / 2
          }) rotate(${plotOrientation})`}
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-20"
            stroke="black"
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
          <text
            x="0"
            y="-25"
            textAnchor="middle"
            style={{ fontSize: "14px", fontWeight: "bold", fill: "#333" }}
          >
            N
          </text>
        </g>
        {/* Road */}
        <rect
          x="0"
          y={pL}
          width={pW}
          height={rW}
          fill="#e5e7eb"
          stroke="#6b7280"
          strokeWidth="1"
        />
        <text
          x={pW / 2}
          y={pL + rW / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="label-text"
          fill="#374151"
        >
          Road ({inputs.roadWidth} ft)
        </text>
        {/* Plot Area */}
        <rect
          x="0"
          y="0"
          width={pW}
          height={pL}
          fill="#dcfce7"
          stroke="#15803d"
          strokeWidth="1"
        />
        <text
          x={pW / 2}
          y={pL / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="outline-text"
        >
          Plot Area: {buildable.plotArea.toFixed(0)} sq.ft
        </text>
        {/* Setbacks */}
        <rect
          x="0"
          y="0"
          width={sL}
          height={pL}
          fill="#fef9c3"
          opacity="0.5"
        />{" "}
        {/* Left Setback */}
        <rect
          x={pW - sR}
          y="0"
          width={sR}
          height={pL}
          fill="#fef9c3"
          opacity="0.5"
        />{" "}
        {/* Right Setback */}
        <rect
          x="0"
          y="0"
          width={pW}
          height={sF}
          fill="#fef9c3"
          opacity="0.5"
        />{" "}
        {/* Front Setback */}
        <rect
          x="0"
          y={pL - sB}
          width={pW}
          height={sB}
          fill="#fef9c3"
          opacity="0.5"
        />{" "}
        {/* Back Setback */}
        <text
          x={sL / 2}
          y={pL / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="dim-text"
          transform={`rotate(-90, ${sL / 2}, ${pL / 2})`}
        >
          {inputs.setbackLeft} ft
        </text>
        <text
          x={pW - sR / 2}
          y={pL / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="dim-text"
          transform={`rotate(90, ${pW - sR / 2}, ${pL / 2})`}
        >
          {inputs.setbackRight} ft
        </text>
        <text
          x={pW / 2}
          y={sF / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="dim-text"
        >
          {inputs.setbackFront} ft
        </text>
        <text
          x={pW / 2}
          y={pL - sB / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="dim-text"
        >
          {inputs.setbackBack} ft
        </text>
        {/* Buildable Area */}
        <rect
          x={sL}
          y={sF}
          width={bW}
          height={bL}
          fill="#bfdbfe"
          stroke="#3b82f6"
          strokeWidth="1"
          strokeDasharray="2"
        />
        <text
          x={sL + bW / 2}
          y={sF + bL / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="outline-text"
          fill="#1e3a8a"
        >
          Buildable Area: {buildable.buildableArea.toFixed(0)} sq.ft
        </text>
        {/* Actual Building Footprint */}
        <rect
          x={actualBuildingX}
          y={actualBuildingY}
          width={actualBW}
          height={actualBL}
          fill="#93c5fd"
          stroke={buildingOutlineColor}
          strokeWidth="2"
        />
        <text
          x={actualBuildingX + actualBW / 2}
          y={actualBuildingY + actualBL / 2}
          textAnchor="middle"
          alignmentBaseline="middle"
          className="label-text"
          fill="#1e3a8a"
        >
          Building Footprint ({buildable.actualBuildingWidth.toFixed(0)}x
          {buildable.actualBuildingLength.toFixed(0)}ft)
        </text>
        {!buildable.isBuildingWithinBuildableArea && (
          <text
            x={sL + bW / 2}
            y={sF + bL + 10}
            textAnchor="middle"
            className="compliance-label"
          >
            Building exceeds Buildable Area!
          </text>
        )}
        {/* Parking */}
        {addParking && parkingWidth > 0 && parkingLength > 0 && (
          <rect
            x={parkX}
            y={parkY}
            width={parkW}
            height={parkL}
            fill="#fef08a"
            stroke="#ca8a04"
            strokeDasharray="4"
          />
        )}
        {addParking && parkingWidth > 0 && parkingLength > 0 && (
          <text
            x={parkX + parkW / 2}
            y={parkY + parkL / 2}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="dim-text"
            fill="#a16207"
          >
            Parking
          </text>
        )}
        {/* Staircase */}
        {addStaircase && staircaseWidth > 0 && staircaseLength > 0 && (
          <rect
            x={stairX}
            y={stairY}
            width={stairW}
            height={stairL}
            fill="#fecaca"
            stroke="#dc2626"
            strokeDasharray="2"
          />
        )}
        {addStaircase && staircaseWidth > 0 && staircaseLength > 0 && (
          <text
            x={stairX + stairW / 2}
            y={stairY + stairL / 2}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="dim-text"
            fill="#b91c1c"
          >
            Stair
          </text>
        )}
        {/* Grid Overlay */}
        {addGrid && (
          <g
            className="grid-overlay"
            stroke="#cccccc"
            strokeWidth="0.5"
            opacity="0.4"
          >
            {/* Horizontal lines */}
            {Array.from({ length: Math.floor(pL / (gridSize / scale)) }).map(
              (_, i) => (
                <line
                  key={`h-grid-${i}`}
                  x1="0"
                  y1={i * gridSize}
                  x2={pW}
                  y2={i * gridSize}
                />
              )
            )}
            {/* Vertical lines */}
            {Array.from({ length: Math.floor(pW / (gridSize / scale)) }).map(
              (_, i) => (
                <line
                  key={`v-grid-${i}`}
                  x1={i * gridSize}
                  y1="0"
                  x2={i * gridSize}
                  y2={pL}
                />
              )
            )}
          </g>
        )}
        {/* Overall Dimensions (Plot) */}
        <path
          d={`M 0 ${pL + rW + 10} L ${pW} ${pL + rW + 10}`}
          stroke="black"
          strokeWidth="0.5"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={pW / 2}
          y={pL + rW + 20}
          textAnchor="middle"
          className="dim-text"
        >
          {plotWidth} ft
        </text>
        <path
          d={`M ${pW + 10} 0 L ${pW + 10} ${pL}`}
          stroke="black"
          strokeWidth="0.5"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={pW + 20}
          y={pL / 2}
          textAnchor="middle"
          className="dim-text"
          transform={`rotate(-90, ${pW + 20}, ${pL / 2})`}
        >
          {plotLength} ft
        </text>
      </g>
    </svg>
  );
};
