import { useState, useMemo, useEffect } from 'react';

// ... (checkCollision function remains the same)
const checkCollision = (item1, item2) => {
  const rect1 = { x: item1.position.x, y: item1.position.y, width: parseFloat(item1.width) || 0, height: parseFloat(item1.length) || 0 };
  const rect2 = { x: item2.position.x, y: item2.position.y, width: parseFloat(item2.width) || 0, height: parseFloat(item2.length) || 0 };
  return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
};


const INITIAL_STATE = {
  inputs: { plotWidth: 60, plotLength: 40, roadWidth: 30, roadType: 'Main Road', northDirection: 'top', setbackFront: 5, setbackBack: 5, setbackLeft: 5, setbackRight: 5 },
  items: {
    house: { enabled: true, width: 30, length: 25, description: 'G+2 House', facing: 'north', position: { x: 15, y: 10 } },
    staircase: { enabled: true, width: 10, length: 6, position: { x: 50, y: 10 } },
    lift: { enabled: true, width: 6, length: 6, position: { x: 50, y: 18 } },
    parking: { enabled: true, width: 20, length: 15, position: { x: 15, y: 15 } },
  },
  surroundings: { north: "Neighbor's Property", south: "30ft Main Road", east: "Vacant Plot", west: "Park" },
  identificationText: "Identified through EC Bill & Customer",
  floors: [{ id: 1, name: 'Ground Floor', grossArea: 1200 }, { id: 2, name: 'FF to 3F', grossArea: 1200 }],
};

export const useAppData = () => {
  const [appState, setAppState] = useState(() => {
    try {
      const savedState = localStorage.getItem('plotDiagramState');
      return savedState ? JSON.parse(savedState) : INITIAL_STATE;
    } catch (error) { return INITIAL_STATE; }
  });
  const [collisionItemKey, setCollisionItemKey] = useState(null);

  // ... (useEffect for localStorage and calculations useMemo remain the same)
  useEffect(() => {
    localStorage.setItem('plotDiagramState', JSON.stringify(appState));
  }, [appState]);

  const { inputs, items, surroundings, identificationText, floors } = appState;

  const calculations = useMemo(() => {
    const pW=parseFloat(inputs.plotWidth)||0, pL=parseFloat(inputs.plotLength)||0, sL=parseFloat(inputs.setbackLeft)||0, sR=parseFloat(inputs.setbackRight)||0, sF=parseFloat(inputs.setbackFront)||0, sB=parseFloat(inputs.setbackBack)||0;
    const plotArea = pW * pL;
    const buildableWidth = pW - sL - sR;
    const buildableLength = pL - sF - sB;
    const buildableArea = buildableWidth * buildableLength;
    const setbackArea = plotArea - buildableArea;
    const totalAllowableFloorArea = buildableArea * floors.length;
    const itemAreas = Object.fromEntries(Object.entries(items).map(([key, item]) => [ `${key}Area`, item.enabled ? (parseFloat(item.width) * parseFloat(item.length)) : 0 ]));
    const floorCalculations = floors.map((floor, index) => {
        const gross = parseFloat(floor.grossArea) || 0;
        const netBua = gross - (index === 0 ? itemAreas.parkingArea : 0) - itemAreas.staircaseArea - itemAreas.liftArea - setbackArea;
        return { ...floor, netBua: Math.max(0, netBua), ...itemAreas, setbackArea, parkingDeduction: (index === 0 ? itemAreas.parkingArea : 0) };
    });
    const totalNetBUA = floorCalculations.reduce((sum, f) => sum + f.netBua, 0);
    const far = plotArea > 0 ? totalNetBUA / plotArea : 0;
    return { plotArea, buildableArea, buildableWidth, buildableLength, setbackArea, totalAllowableFloorArea, floorCalculations, totalNetBUA, far, ...itemAreas };
  }, [inputs, items, floors]);


  const setState = (key, value) => setAppState(p => ({...p, [key]: value}));

  const handleItemChange = (key, field, value) => {
    const updatedItems = { ...items, [key]: { ...items[key], [field]: value } };
    const currentItem = updatedItems[key];
    if ((field === 'width' && value > calculations.buildableWidth) || (field === 'length' && value > calculations.buildableLength)) return;
    for (const otherKey in updatedItems) {
      if (key !== otherKey && updatedItems[otherKey].enabled && checkCollision(currentItem, updatedItems[otherKey])) return;
    }
    setAppState(p => ({ ...p, items: updatedItems }));
  };

  const handlePositionChange = (itemName, newPosition) => {
    const currentItem = { ...items[itemName], position: newPosition };
    for (const key in items) {
      if (key !== itemName && items[key].enabled && checkCollision(currentItem, items[key])) {
        setCollisionItemKey(key);
        setTimeout(() => setCollisionItemKey(null), 500);
        return;
      }
    }
    setAppState(p => ({ ...p, items: { ...p.items, [itemName]: { ...p.items[itemName], position: newPosition } } }));
  };

  const resetData = () => {
      if (window.confirm("Are you sure you want to reset all data?")) {
          localStorage.removeItem('plotDiagramState');
          setAppState(INITIAL_STATE);
      }
  };

  return { ...appState, setState, calculations, handleItemChange, handlePositionChange, resetData, collisionItemKey };
};
