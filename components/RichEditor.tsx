
import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, 
  X, ChevronDown, Calculator, Plus, 
  Palette, Image as ImageIcon, Loader2, Trash2, Type, TypeIcon, Shapes, Square, Circle as CircleIcon, Triangle, Settings, Check, Hexagon, Move, RotateCw, Ruler, 
  Target, LineChart, Activity, Grid3X3, Trash, Edit, MousePointer2, PlusCircle, MinusCircle, Maximize2, Minimize2, Type as LetterIcon
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, InputRule } from '@tiptap/react';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import LatexRenderer from './LatexRenderer.tsx';

// --- Geometry Extension ---

const DEFAULT_SHAPE = {
  shapeType: '3_iso',
  width: 120,
  height: 120,
  color: '#3B82F6',
  rotation: 0,
  xOffset: 0,
  yOffset: 0,
  sideLabels: [],
  vertexLabels: [],
  angleLabels: [],
  showLabels: true
};

const GeometryNode = Node.create({
  name: 'geometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      shapes: { 
        default: [{ ...DEFAULT_SHAPE, id: 's1' }],
        parseHTML: element => {
          const data = element.getAttribute('data-shapes');
          try {
            return data ? JSON.parse(data).map((s: any) => ({ ...DEFAULT_SHAPE, ...s })) : [{ ...DEFAULT_SHAPE, id: 's1' }];
          } catch (e) {
            return [{ ...DEFAULT_SHAPE, id: 's1' }];
          }
        },
        renderHTML: attributes => ({ 'data-shapes': JSON.stringify(attributes.shapes) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="geometry-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'geometry-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GeometryNodeView);
  },
});

const GeometryNodeView = (props: any) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const { shapes = [] } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [activeShapeIdx, setActiveShapeIdx] = useState(0);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [rotatingIdx, setRotatingIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const updateShape = (idx: number, attrs: any) => {
    const newShapes = [...shapes];
    newShapes[idx] = { ...newShapes[idx], ...attrs };
    updateAttributes({ shapes: newShapes });
  };

  const handleMouseDown = (e: React.MouseEvent, idx: number, action: 'drag' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveShapeIdx(idx);
    if (action === 'drag') setDraggingIdx(idx);
    if (action === 'rotate') setRotatingIdx(idx);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingIdx === null && rotatingIdx === null) return;
      if (!svgRef.current || !shapes[draggingIdx ?? rotatingIdx ?? -1]) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const targetIdx = draggingIdx !== null ? draggingIdx : rotatingIdx!;
      const shape = shapes[targetIdx];
      const centerX = 125 + (shape.xOffset || 0);
      const centerY = 175 + (shape.yOffset || 0);

      if (draggingIdx !== null) {
        updateShape(draggingIdx, {
          xOffset: mouseX - 125,
          yOffset: mouseY - 175,
        });
      }

      if (rotatingIdx !== null) {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        updateShape(rotatingIdx, { rotation: angle });
      }
    };

    const handleMouseUp = () => {
      setDraggingIdx(null);
      setRotatingIdx(null);
    };

    if (draggingIdx !== null || rotatingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIdx, rotatingIdx, shapes]);

  const getPolygonVertices = (shape: any) => {
    const { shapeType = '3_iso', width = 120, height = 120, xOffset = 0, yOffset = 0 } = shape || {};
    const centerX = 125 + xOffset;
    const centerY = 175 + yOffset;

    if (shapeType === 'line') {
      return [{ x: centerX - width/2, y: centerY }, { x: centerX + width/2, y: centerY }];
    }

    if (shapeType === 'circle') return [];

    const [numSidesStr, subType] = shapeType.split('_');
    const numSides = parseInt(numSidesStr) || 3;

    if (numSides === 3) {
      const w = width; const h = height;
      if (subType === 'iso') return [{x: centerX, y: centerY - h/2}, {x: centerX - w/2, y: centerY + h/2}, {x: centerX + w/2, y: centerY + h/2}];
      if (subType === 'right') return [{x: centerX - w/2, y: centerY - h/2}, {x: centerX - w/2, y: centerY + h/2}, {x: centerX + w/2, y: centerY + h/2}];
      if (subType === 'obtuse') return [{x: centerX + w/3, y: centerY - h/2}, {x: centerX - w/2, y: centerY + h/2}, {x: centerX + w/2, y: centerY + h/2}];
    }
    if (numSides === 4) {
      const w = width; const h = subType === 'rect' ? height : width;
      return [{x: centerX - w/2, y: centerY - h/2}, {x: centerX + w/2, y: centerY - h/2}, {x: centerX + w/2, y: centerY + h/2}, {x: centerX - w/2, y: centerY + h/2}];
    }
    
    const vertices = [];
    for (let i = 0; i < numSides; i++) {
      const angle = (i * 2 * Math.PI) / numSides - Math.PI / 2;
      vertices.push({ x: centerX + (width/2) * Math.cos(angle), y: centerY + (height/2) * Math.sin(angle) });
    }
    return vertices;
  };

  const renderShape = (shape: any, idx: number) => {
    if (!shape) return null;
    const { 
      shapeType = '3_iso', width = 120, height = 120, color = '#3B82F6', 
      showLabels = true, rotation = 0, xOffset = 0, yOffset = 0, 
      sideLabels = [], vertexLabels = [], angleLabels = [] 
    } = shape;
    
    const centerX = 125 + xOffset;
    const centerY = 175 + yOffset;
    const strokeWidth = 3;
    const transform = `rotate(${rotation}, ${centerX}, ${centerY})`;

    if (shapeType === 'circle') {
      const radius = width / 2;
      return (
        <g key={idx} transform={transform}>
          <circle cx={centerX} cy={centerY} r={radius} stroke={color} strokeWidth={strokeWidth} fill={`${color}15`} className="cursor-move" onMouseDown={(e) => handleMouseDown(e, idx, 'drag')} />
          {showLabels && vertexLabels && vertexLabels[0] && <text x={centerX} y={centerY - 5} textAnchor="middle" fontSize="14" fill={color} fontWeight="black">{vertexLabels[0]}</text>}
          {showLabels && sideLabels && sideLabels[0] && <text x={centerX} y={centerY - radius - 10} textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">{sideLabels[0]}</text>}
        </g>
      );
    }

    const vertices = getPolygonVertices(shape);
    if (!vertices || vertices.length === 0) return null;
    const pointsStr = vertices.map(v => `${v.x},${v.y}`).join(' ');

    return (
      <g key={idx} transform={transform}>
        {shapeType === 'line' ? (
          <line x1={vertices[0]?.x || 0} y1={vertices[0]?.y || 0} x2={vertices[1]?.x || 0} y2={vertices[1]?.y || 0} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" className="cursor-move" onMouseDown={(e) => handleMouseDown(e, idx, 'drag')} />
        ) : (
          <polygon points={pointsStr} stroke={color} strokeWidth={strokeWidth} fill={`${color}15`} className="cursor-move" onMouseDown={(e) => handleMouseDown(e, idx, 'drag')} />
        )}
        
        {showLabels && vertices.map((v, i) => {
          const nextV = vertices[(i + 1) % vertices.length];
          const labels = [];
          
          if (sideLabels && sideLabels[i] && shapeType !== 'line') {
            const midX = (v.x + nextV.x) / 2; const midY = (v.y + nextV.y) / 2;
            const dx = nextV.x - v.x; const dy = nextV.y - v.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const nx = -dy/len; const ny = dx/len;
            const dist = 15;
            labels.push(<text key={`s-${i}`} x={midX + nx * dist} y={midY + ny * dist} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={color} fontWeight="bold">{sideLabels[i]}</text>);
          } else if (sideLabels && sideLabels[0] && shapeType === 'line' && i === 0) {
             labels.push(<text key="line-label" x={(vertices[0].x + vertices[1].x)/2} y={vertices[0].y - 10} textAnchor="middle" fontSize="11" fill={color} fontWeight="bold">{sideLabels[0]}</text>);
          }

          if (vertexLabels && vertexLabels[i]) {
            const dx = v.x - centerX; const dy = v.y - centerY;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const dist = 15;
            labels.push(<text key={`v-${i}`} x={v.x + (dx/len) * dist} y={v.y + (dy/len) * dist} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill={color} fontWeight="black">{vertexLabels[i]}</text>);
          }

          if (angleLabels && angleLabels[i] && shapeType !== 'line') {
            const prevV = vertices[(i - 1 + vertices.length) % vertices.length];
            const d1x = prevV.x - v.x; const d1y = prevV.y - v.y;
            const d2x = nextV.x - v.x; const d2y = nextV.y - v.y;
            const a1 = Math.atan2(d1y, d1x); const a2 = Math.atan2(d2y, d2x);
            let midA = (a1 + a2) / 2;
            if (Math.abs(a1 - a2) > Math.PI) midA += Math.PI;
            const dist = 25;
            labels.push(<text key={`a-${i}`} x={v.x + Math.cos(midA) * dist} y={v.y + Math.sin(midA) * dist} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={color} fontStyle="italic" fontWeight="bold">{angleLabels[i]}</text>);
          }

          return labels;
        })}
      </g>
    );
  };

  const getNumSideInputs = (shape: any) => {
    if (!shape) return 0;
    if (shape.shapeType === 'circle' || shape.shapeType === 'line') return 1;
    return parseInt(shape.shapeType.split('_')[0]) || 0;
  };

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/geo relative ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-3xl' : ''}`}>
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-inner relative w-full flex justify-center overflow-hidden min-h-[400px]">
        <svg ref={svgRef} width="100%" height="400" viewBox="0 0 250 400" className="drop-shadow-sm overflow-visible">
          {shapes.map((s: any, i: number) => renderShape(s, i))}
          
          {selected && shapes[activeShapeIdx] && (
            <g transform={`rotate(${shapes[activeShapeIdx].rotation || 0}, ${125 + (shapes[activeShapeIdx].xOffset || 0)}, ${175 + (shapes[activeShapeIdx].yOffset || 0)})`}>
              <circle 
                cx={125 + (shapes[activeShapeIdx].xOffset || 0)} 
                cy={175 + (shapes[activeShapeIdx].yOffset || 0) - (shapes[activeShapeIdx].shapeType === 'circle' ? (shapes[activeShapeIdx].width || 120)/2 : (shapes[activeShapeIdx].height || 120)/2) - 30} 
                r="8" fill="white" stroke={shapes[activeShapeIdx].color || '#000'} strokeWidth="2" className="cursor-pointer hover:fill-primary hover:stroke-white transition-colors" 
                onMouseDown={(e) => handleMouseDown(e, activeShapeIdx, 'rotate')} 
              />
            </g>
          )}
        </svg>
        <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover/geo:opacity-100 transition-opacity no-print">
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl shadow-lg transition-all ${isEditing ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`} title="הגדרות צורה"><Settings size={20} /></button>
            <button onClick={deleteNode} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק שרטוט"><Trash2 size={20} /></button>
        </div>
      </div>

      {isEditing && (
        <div className="w-full mt-4 p-6 bg-white rounded-[2rem] border-2 border-primary/20 shadow-xl animate-fade-in no-print z-20">
          <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                {shapes.map((_: any, i: number) => (
                    <button key={i} onClick={() => setActiveShapeIdx(i)} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${activeShapeIdx === i ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>צורה {i+1}</button>
                ))}
                {shapes.length < 2 && (
                    <button onClick={() => { const newShapes = [...shapes, { ...DEFAULT_SHAPE, id: `s${Date.now()}`, xOffset: 30, yOffset: 30 }]; updateAttributes({ shapes: newShapes }); setActiveShapeIdx(1); }} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center gap-2 hover:bg-blue-100 transition-all"><Plus size={16}/>הוסף צורה נוספת</button>
                )}
              </div>
              {shapes.length > 1 && (
                  <button onClick={() => { const newShapes = shapes.filter((_: any, i: number) => i !== activeShapeIdx); updateAttributes({ shapes: newShapes }); setActiveShapeIdx(0); }} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all flex items-center gap-1 font-bold text-xs"><Trash2 size={14}/> הסר צורה</button>
              )}
          </div>

          {shapes[activeShapeIdx] && (
            <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">סוג צורה</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'line', label: 'קו', icon: MinusCircle },
                      { id: 'circle', label: 'עיגול', icon: CircleIcon },
                      { id: '3', label: '3', icon: Triangle },
                      { id: '4', label: '4', icon: Square },
                      { id: '5', label: '5', icon: Hexagon },
                      { id: '6', label: '6', icon: Hexagon },
                      { id: '8', label: '8', icon: Hexagon },
                    ].map(item => (
                      <button key={item.id} onClick={() => { 
                        let newType = item.id;
                        if (item.id === '3') newType = '3_iso';
                        else if (item.id === '4') newType = '4_rect';
                        else if (item.id !== 'circle' && item.id !== 'line') newType = `${item.id}_regular`;
                        updateShape(activeShapeIdx, { shapeType: newType, sideLabels: [], vertexLabels: [], angleLabels: [] }); 
                      }} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${(shapes[activeShapeIdx].shapeType || '').startsWith(item.id) ? 'border-primary bg-blue-50 text-primary font-black' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}><item.icon size={18} /><span className="text-[9px] mt-1">{item.label}</span></button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 flex items-center gap-2"><LetterIcon size={14}/><span>קודקודים</span></label>
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: getNumSideInputs(shapes[activeShapeIdx]) }).map((_, i) => (
                            <input key={i} type="text" value={(shapes[activeShapeIdx].vertexLabels && shapes[activeShapeIdx].vertexLabels[i]) || ''} onChange={(e) => { const newL = [...(shapes[activeShapeIdx].vertexLabels || [])]; newL[i] = e.target.value.toUpperCase(); updateShape(activeShapeIdx, { vertexLabels: newL }); }} placeholder={String.fromCharCode(65 + i)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black text-center" maxLength={2} />
                        ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 flex items-center gap-2"><Target size={14}/><span>זוויות (מעלות)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: getNumSideInputs(shapes[activeShapeIdx]) }).map((_, i) => (
                            <input key={i} type="text" value={(shapes[activeShapeIdx].angleLabels && shapes[activeShapeIdx].angleLabels[i]) || ''} onChange={(e) => { const newL = [...(shapes[activeShapeIdx].angleLabels || [])]; newL[i] = e.target.value; updateShape(activeShapeIdx, { angleLabels: newL }); }} placeholder="90°" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center" />
                        ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 flex items-center gap-2"><Ruler size={14} /><span>אורך צלעות</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: getNumSideInputs(shapes[activeShapeIdx]) }).map((_, i) => (
                      <input key={i} type="text" value={(shapes[activeShapeIdx].sideLabels && shapes[activeShapeIdx].sideLabels[i]) || ''} onChange={(e) => { const newL = [...(shapes[activeShapeIdx].sideLabels || [])]; newL[i] = e.target.value; updateShape(activeShapeIdx, { sideLabels: newL }); }} placeholder={`צלע ${i+1}`} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-primary outline-none text-center" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">ממדים וצבע</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[50px]">רוחב/רדיוס</span><input type="range" min="30" max="250" value={shapes[activeShapeIdx].width || 120} onChange={e => updateShape(activeShapeIdx, { width: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>
                  {shapes[activeShapeIdx].shapeType !== 'circle' && shapes[activeShapeIdx].shapeType !== 'line' && (<div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[50px]">גובה</span><input type="range" min="30" max="250" value={shapes[activeShapeIdx].height || 120} onChange={e => updateShape(activeShapeIdx, { height: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>)}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">{['#3B82F6', '#EF4444', '#10B981', '#000000', '#F59E0B', '#8B5CF6'].map(c => (<button key={c} onClick={() => updateShape(activeShapeIdx, { color: c })} className={`w-6 h-6 rounded-full border-2 border-white shadow-sm ${shapes[activeShapeIdx].color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={{ backgroundColor: c }} />))}</div>
                    <button onClick={() => updateShape(activeShapeIdx, { showLabels: !shapes[activeShapeIdx].showLabels })} className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-black transition-all ${shapes[activeShapeIdx].showLabels ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>{shapes[activeShapeIdx].showLabels ? <Check size={14}/> : <Plus size={14}/>}הצג תוויות</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setIsEditing(false)} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all">סיום עריכת שרטוט</button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// --- Analytic Geometry Extension ---

const AnalyticGeometryNode = Node.create({
  name: 'analyticGeometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      elements: { 
        default: [],
        parseHTML: element => {
          const data = element.getAttribute('data-elements');
          try {
            const parsed = data ? JSON.parse(data) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        },
        renderHTML: attributes => ({ 'data-elements': JSON.stringify(attributes.elements) }),
      },
      viewport: { default: { minX: -10, maxX: 10, minY: -10, maxY: 10 } },
      showGrid: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="analytic-geometry-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'analytic-geometry-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnalyticGeometryNodeView);
  },
});

const AnalyticGeometryNodeView = (props: any) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const { elements = [], viewport, showGrid } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const size = 400;
  const margin = 30;
  const drawableSize = size - (margin * 2);

  const transformX = (x: number) => {
    const val = isNaN(x) ? 0 : x;
    return margin + ((val - viewport.minX) / (viewport.maxX - viewport.minX)) * drawableSize;
  };
  
  const transformY = (y: number) => {
    const val = isNaN(y) ? 0 : y;
    return margin + ((viewport.maxY - val) / (viewport.maxY - viewport.minY)) * drawableSize;
  };

  const originX = transformX(0);
  const originY = transformY(0);

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    
    const xStep = Math.ceil((viewport.maxX - viewport.minX) / 10);
    const yStep = Math.ceil((viewport.maxY - viewport.minY) / 10);

    for (let x = Math.ceil(viewport.minX); x <= Math.floor(viewport.maxX); x += (xStep || 1)) {
      if (x === 0) continue;
      const sx = transformX(x);
      lines.push(<line key={`gx-${x}`} x1={sx} y1={margin} x2={sx} y2={size - margin} stroke="#e5e7eb" strokeWidth="1" />);
      lines.push(<text key={`gtx-${x}`} x={sx} y={originY + 15} fontSize="8" fill="#9ca3af" textAnchor="middle">{x}</text>);
    }
    for (let y = Math.ceil(viewport.minY); y <= Math.floor(viewport.maxY); y += (yStep || 1)) {
      if (y === 0) continue;
      const sy = transformY(y);
      lines.push(<line key={`gy-${y}`} x1={margin} y1={sy} x2={size - margin} y2={sy} stroke="#e5e7eb" strokeWidth="1" />);
      lines.push(<text key={`gty-${y}`} x={originX - 10} y={sy + 3} fontSize="8" fill="#9ca3af" textAnchor="end">{y}</text>);
    }
    return lines;
  };

  const renderParabola = (a: number, b: number, c: number, color: string) => {
    let path = "";
    const step = (viewport.maxX - viewport.minX) / 100;
    for (let x = viewport.minX; x <= viewport.maxX; x += step) {
      const y = a * x * x + b * x + c;
      const sx = transformX(x);
      const sy = transformY(y);
      if (sy >= 0 && sy <= size) {
        path += (path === "" ? "M" : "L") + ` ${sx} ${sy}`;
      }
    }
    return <path d={path} fill="none" stroke={color} strokeWidth="2.5" />;
  };

  const renderLine = (m: number, b: number, color: string) => {
    const x1 = viewport.minX;
    const y1 = m * x1 + b;
    const x2 = viewport.maxX;
    const y2 = m * x2 + b;
    
    return (
      <line 
        x1={transformX(x1)} y1={transformY(y1)} 
        x2={transformX(x2)} y2={transformY(y2)} 
        stroke={color} strokeWidth="3" strokeLinecap="round" 
      />
    );
  };

  const renderPolygon = (points: {x: number, y: number}[], color: string) => {
    if (!points || !Array.isArray(points)) return null;
    const validPoints = points.filter(p => p && !isNaN(p.x) && !isNaN(p.y));
    if (validPoints.length < 3) return null;
    const vertices = validPoints.map(p => `${transformX(p.x)},${transformY(p.y)}`);
    return <polygon points={vertices.join(' ')} fill={`${color}20`} stroke={color} strokeWidth="2.5" />;
  };

  const addElement = (type: 'point' | 'line' | 'parabola' | 'polygon') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newElement: any = { id: newId, type, color: '#3B82F6', label: type === 'polygon' ? 'משולש' : type[0].toUpperCase() };
    if (type === 'point') newElement.data = { x: 0, y: 0 };
    if (type === 'line') newElement.data = { m: 1, b: 0 };
    if (type === 'parabola') newElement.data = { a: 1, b: 0, c: 0 };
    if (type === 'polygon') newElement.data = { points: [{x: 0, y: 4}, {x: -3, y: -2}, {x: 3, y: -2}] };
    
    updateAttributes({ elements: [...elements, newElement] });
    setActiveElementId(newId);
  };

  const updateElement = (id: string, newData: any) => {
    const newElements = elements.map((el: any) => el.id === id ? { ...el, ...newData } : el);
    updateAttributes({ elements: newElements });
  };

  const removeElement = (id: string) => {
    updateAttributes({ elements: elements.filter((el: any) => el.id !== id) });
    if (activeElementId === id) setActiveElementId(null);
  };

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#000000', '#F59E0B', '#8B5CF6'];

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/analytic relative ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-3xl' : ''}`}>
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-inner relative w-full flex justify-center overflow-hidden min-h-[450px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm overflow-visible">
          {renderGrid()}
          <line x1={margin} y1={originY} x2={size - margin} y2={originY} stroke="#4b5563" strokeWidth="2.5" />
          <line x1={originX} y1={margin} x2={originX} y2={size - margin} stroke="#4b5563" strokeWidth="2.5" />
          <text x={size - margin + 10} y={originY + 5} fontSize="14" fill="#4b5563" fontWeight="black">X</text>
          <text x={originX - 5} y={margin - 10} fontSize="14" fill="#4b5563" fontWeight="black">Y</text>
          
          {elements.map((el: any) => (
            <g key={el.id} className="cursor-pointer" onClick={() => { setActiveElementId(el.id); setIsEditing(true); }}>
              {el.type === 'point' && (
                <>
                  <circle cx={transformX(el.data.x)} cy={transformY(el.data.y)} r="6" fill={el.color} className="drop-shadow-sm" />
                  <text x={transformX(el.data.x) + 10} y={transformY(el.data.y) - 10} fontSize="12" fill={el.color} fontWeight="black" textAnchor="start">{el.label}({el.data.x},{el.data.y})</text>
                </>
              )}
              {el.type === 'line' && (
                <>
                  {renderLine(el.data.m, el.data.b, el.color)}
                  <text x={transformX(viewport.maxX - 2)} y={transformY(el.data.m * (viewport.maxX - 2) + el.data.b) - 15} fontSize="12" fill={el.color} fontWeight="black" textAnchor="middle">{el.label}: y={el.data.m}x+{el.data.b}</text>
                </>
              )}
              {el.type === 'parabola' && renderParabola(el.data.a, el.data.b, el.data.c, el.color)}
              {el.type === 'polygon' && el.data?.points && (
                <>
                    {renderPolygon(el.data.points, el.color)}
                    <text x={transformX(el.data.points[0]?.x || 0)} y={transformY(el.data.points[0]?.y || 0) - 15} fontSize="14" fill={el.color} fontWeight="black" textAnchor="middle">{el.label}</text>
                </>
              )}
            </g>
          ))}
        </svg>

        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover/analytic:opacity-100 transition-opacity no-print">
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl shadow-lg transition-all ${isEditing ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:text-indigo-600'}`} title="עריכת מערכת צירים"><Settings size={20} /></button>
            <button onClick={deleteNode} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק שרטוט"><Trash2 size={20} /></button>
        </div>
      </div>

      {isEditing && (
        <div className="w-full mt-4 p-6 bg-white rounded-[2rem] border-2 border-indigo-100 shadow-xl animate-fade-in no-print z-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">הוספת אלמנטים</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addElement('point')} className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-black text-xs"><Target size={18} />נקודה</button>
                <button onClick={() => addElement('line')} className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all font-black text-xs"><LineChart size={18} />ישר</button>
                <button onClick={() => addElement('parabola')} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all font-black text-xs"><Activity size={18} />פרבולה</button>
                <button onClick={() => addElement('polygon')} className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all font-black text-xs"><Shapes size={18} />צורה</button>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">רשימת אלמנטים</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar pr-1">
                {elements.map((el: any) => (
                  <div key={el.id} className={`p-4 rounded-2xl border-2 transition-all ${activeElementId === el.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: el.color }} />
                        <span className="font-black text-sm text-gray-800 uppercase">{el.label} ({el.type})</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setActiveElementId(activeElementId === el.id ? null : el.id)} className={`p-1.5 rounded-lg transition-all ${activeElementId === el.id ? 'bg-indigo-200 text-indigo-700' : 'text-gray-400 hover:text-indigo-600'}`}><Edit size={16}/></button>
                        <button onClick={() => removeElement(el.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-all"><Trash size={16}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setIsEditing(false)} className="w-full mt-6 py-2 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all">סגור הגדרות מערכת צירים</button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// --- Custom Font Size Extension ---

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => (element as HTMLElement).style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

// --- Custom Math Extension (Atomic) ---

const MathNode = Node.create({
  name: 'mathNode',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: element => element.getAttribute('data-latex') || '',
        renderHTML: attributes => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math-node' })];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const latex = match[1];
          tr.replaceWith(range.from, range.to, this.type.create({ latex }));
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

const MathNodeView = (props: any) => {
  const { node, selected, deleteNode } = props;
  const latex = node.attrs.latex;

  // תיקון מחרוזת ה-LaTeX למניעת כפל סימוני דולר ושיפור התצוגה
  const cleanLatex = useMemo(() => {
    let l = (latex || '').trim();
    if (l.startsWith('$$') && l.endsWith('$$')) l = l.slice(2, -2);
    else if (l.startsWith('$') && l.endsWith('$')) l = l.slice(1, -1);
    return l;
  }, [latex]);

  return (
    <NodeViewWrapper className={`math-node-wrapper inline-block align-middle mx-2 my-1 transition-all duration-300 relative ${selected ? 'z-40' : 'z-10'}`} contentEditable={false}>
      <div 
        className={`px-4 py-3 rounded-2xl border-2 shadow-sm transition-all duration-300 flex items-center justify-center min-w-[40px] min-h-[40px]
        ${selected ? 'bg-indigo-600 border-white shadow-2xl scale-110 ring-4 ring-indigo-100' : 'bg-blue-50/90 border-blue-200 hover:bg-white hover:border-indigo-400 hover:shadow-lg'}`}
      >
        <div className={`math-content font-serif text-xl ${selected ? 'text-white' : 'text-indigo-900'}`}>
          <LatexRenderer text={`$${cleanLatex}$`} />
        </div>
      </div>
      
      {selected && (
          <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-all shadow-xl z-50 border-2 border-white animate-fade-in"
              title="מחק נוסחה"
          >
              <Trash2 size={14} />
          </button>
      )}
    </NodeViewWrapper>
  );
};

// --- Main Editor Component ---

export interface RichEditorHandle {
  insertGeometry: () => void;
  insertAnalytic: () => void;
}

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showGuide?: boolean;
  minHeight?: string;
  minimalMode?: boolean;
}

const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(({ value, onChange, placeholder, showGuide = true, minHeight = "450px", minimalMode = false }, ref) => {
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSymbol, setActiveSymbol] = useState<any | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle, Color, Underline, FontFamily, FontSize,
      MathNode, GeometryNode, AnalyticGeometryNode,
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder || "התחילו לכתוב כאן..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: `tiptap prose prose-blue max-w-none focus:outline-none p-8 text-right bg-transparent`,
        dir: 'rtl',
        style: `min-height: ${minHeight};`
      },
    },
  });

  useImperativeHandle(ref, () => ({
    insertGeometry: () => editor?.commands.insertContent({ type: 'geometryNode' }),
    insertAnalytic: () => editor?.commands.insertContent({ type: 'analyticGeometryNode' }),
  }));

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
       editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const mathSymbols = [
    { label: 'שבר', params: [{id: 'n', label: 'מונה', placeholder: '1'}, {id: 'd', label: 'מכנה', placeholder: '2'}], template: (vals: any) => `\\frac{${vals['n'] || ''}}{${vals['d'] || ''}}` },
    { label: 'חזקה', params: [{id: 'b', label: 'בסיס', placeholder: 'x'}, {id: 'e', label: 'מעריך', placeholder: '2'}], template: (vals: any) => `${vals['b'] || 'x'}^{${vals['e'] || ''}}` },
    { label: 'שורש ריבועי', params: [{id: 'v', label: 'מתחת לשורש', placeholder: 'x'}], template: (vals: any) => `\\sqrt{${vals['v'] || ''}}` },
    { label: 'שורש n-י', params: [{id: 'i', label: 'אינדקס', placeholder: '3'}, {id: 'v', label: 'מספר', placeholder: 'x'}], template: (vals: any) => `\\sqrt[${vals['i'] || ''}]{${vals['v'] || ''}}` },
    { label: 'משוואה (=)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '5'}], template: (vals: any) => `${vals['l'] || ''} = ${vals['r'] || ''}` },
    { label: 'גבול', params: [{id: 'v', label: 'שואף ל', placeholder: 'x \\to \\infty'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}], template: (vals: any) => `\\lim_{${vals['v'] || ''}} ${vals['e'] || ''}` },
    { label: 'פאי (π)', params: [], template: () => `\\pi` }
  ];

  const fonts = [{ name: 'רוביק', value: 'Rubik' }, { name: 'היבו', value: 'Heebo' }, { name: 'אסיסטנט', value: 'Assistant' }, { name: 'אלף', value: 'Alef' }, { name: 'דוד', value: 'David Libre' }];
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px'];

  const handleMathSymbolClick = (sym: any) => {
    if (sym.params && sym.params.length > 0) { setActiveSymbol(sym); setParamValues({}); setShowMathPanel(false); }
    else { const latex = sym.template ? sym.template({}) : ''; editor?.commands.insertContent({ type: 'mathNode', attrs: { latex } }); setShowMathPanel(false); }
  };

  const submitParams = () => { if (activeSymbol?.template && editor) { const latex = activeSymbol.template(paramValues); editor.commands.insertContent({ type: 'mathNode', attrs: { latex } }); } setActiveSymbol(null); setParamValues({}); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width; let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        editor.commands.setImage({ src: canvas.toDataURL('image/jpeg', 0.6) });
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const colors = [{ name: 'שחור', value: '#000000' }, { name: 'כחול', value: '#3b82f6' }, { name: 'אדום', value: '#ef4444' }, { name: 'ירוק', value: '#10b981' }, { name: 'סגול', value: '#8b5cf6' }];

  if (!editor) return null;

  return (
    <div className="flex flex-col w-full bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm focus-within:ring-2 ring-primary/10 transition-all text-right relative" dir="rtl">
      <style>{`.tiptap h2 { font-size: 2.25rem; font-weight: 900; margin-top: 2rem; margin-bottom: 1.5rem; color: #111827; } .tiptap h3 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 1rem; color: #374151; } .tiptap p { margin-bottom: 1rem; line-height: 1.75; font-size: 1.1rem; } .math-node-wrapper .katex { font-size: 1.5em !important; } .math-node-wrapper.selected > div { border-color: white !important; }`}</style>
      {activeSymbol && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-indigo-100 p-8 transform animate-slide-up">
              <div className="flex justify-between items-center mb-6"><h4 className="font-black text-lg text-indigo-600 flex items-center gap-2"><Calculator size={20}/><span>הזנת ערכים: {activeSymbol.label}</span></h4><button onClick={() => setActiveSymbol(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
              <div className="space-y-4 mb-8">{activeSymbol.params?.map((param: any) => (<div key={param.id}><label className="block text-xs font-black text-gray-400 uppercase mb-1.5 mr-1">{param.label}</label><input autoFocus={activeSymbol.params?.[0]?.id === param.id} type="text" value={paramValues[param.id] || ''} onChange={(e) => setParamValues({...paramValues, [param.id]: e.target.value})} placeholder={param.placeholder} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-center shadow-inner" onKeyDown={(e) => { if(e.key === 'Enter') submitParams(); }} /></div>))}</div>
              <div className="flex gap-3"><button onClick={submitParams} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">הוסף לעורך</button><button onClick={() => setActiveSymbol(null)} className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">ביטול</button></div>
           </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between p-3 bg-gray-50 border-b border-gray-100 gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {!minimalMode && (
            <>
              <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('bold') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="הדגשה (Ctrl+B)"><Bold size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('italic') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="נטוי (Ctrl+I)"><Italic size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('underline') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="קו תחתי (Ctrl+U)"><UnderlineIcon size={16}/></button>
              </div>
              <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group bg-white rounded-xl hover:bg-gray-100 transition-all">
                <select onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} className="appearance-none bg-transparent border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:outline-none cursor-pointer text-gray-700 w-auto min-w-[85px] transition-all" value={editor.getAttributes('textStyle').fontFamily || ''}><option value="">סוג פונט</option>{fonts.map(f => (<option key={f.value} value={f.value}>{f.name}</option>))}</select>
                <ChevronDown size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
              </div>
            </>
          )}

          <div className="flex items-center gap-1 px-1 border-l border-gray-200 ml-1">
            {!minimalMode && (
              <button type="button" onClick={() => editor.commands.insertContent({ type: 'geometryNode' })} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-2" title="הוספת שרטוט גיאומטריה">
                <Shapes size={16}/>
                <span className="text-[10px] font-black">גיאומטריה</span>
              </button>
            )}
            <button type="button" onClick={() => editor.commands.insertContent({ type: 'analyticGeometryNode' })} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-2" title="הוספת גיאומטריה אנליטית">
              <Grid3X3 size={16}/>
              <span className="text-[10px] font-black">אנליטית</span>
            </button>
          </div>

          {showGuide && (
            <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 relative">
              <button type="button" onClick={() => setShowMathPanel(!showMathPanel)} className={`p-2 rounded-xl transition-all flex items-center gap-2 ${showMathPanel ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-50 text-indigo-600 hover:bg-blue-100'}`} title="הוספת נוסחה"><Calculator size={16}/><span className="text-[10px] font-black">נוסחה</span><ChevronDown size={10} className={showMathPanel ? 'rotate-180 transition-transform' : ''}/></button>
              {showMathPanel && (<><div className="fixed inset-0 z-10" onClick={() => setShowMathPanel(false)}></div><div className="absolute top-full right-0 mt-2 p-4 bg-white shadow-2xl rounded-3xl border border-gray-100 z-20 w-80 animate-fade-in max-h-[450px] overflow-y-auto no-scrollbar"><div className="grid grid-cols-2 gap-2">{mathSymbols.map((sym, idx) => (<button key={idx} type="button" onClick={() => handleMathSymbolClick(sym)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-all text-right group"><div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-mono text-indigo-600 group-hover:bg-white shadow-sm transition-all"><Plus size={10} /></div><span className="text-[11px] font-bold text-gray-600 group-hover:text-indigo-700 leading-tight">{sym.label}</span></button>))}</div></div></>)}
            </div>
          )}

          {!minimalMode && (
            <>
              <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 group relative">
                <div className="p-2 text-gray-400"><Palette size={16} /></div>
                <div className="flex gap-1 ml-2">
                  {colors.map(colorItem => (
                    <button key={colorItem.value} type="button" onClick={() => editor.chain().focus().setColor(colorItem.value).run()} className={`w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 ${editor.isActive('textStyle', { color: colorItem.value }) ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={{ backgroundColor: colorItem.value }} title={colorItem.name} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-0.5 px-1">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-xl transition-all" title="הוספת תמונה">{isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}</button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="relative bg-white"><EditorContent editor={editor} /></div>
    </div>
  );
});

export default RichEditor;
