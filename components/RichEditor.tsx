
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, 
  X, ChevronDown, Calculator, Plus, 
  Palette, Image as ImageIcon, Loader2, Trash2, Shapes, Circle as CircleIcon, Triangle, Settings, Check, Hexagon, Ruler, 
  Grid3X3, Trash, Maximize2, Pencil, Settings2, Edit2, Dot, Activity, Square
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Extension, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import LatexRenderer from './LatexRenderer.tsx';
import { Subject } from '../types.ts';

// --- Geometry Extension (Multi-shape & Labels) ---

interface ShapeData {
  id: string;
  shapeType: string;
  width: number;
  height: number;
  color: string;
  rotation: number;
  xOffset: number;
  yOffset: number;
  sideLabels: string[];
  vertexLabels: string[];
  angleLabels: string[];
}

const GeometryNode = Node.create({
  name: 'geometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      shapes: { 
        default: [{
          id: 'shape-1',
          shapeType: '3_iso',
          width: 150,
          height: 150,
          color: '#3B82F6',
          rotation: 0,
          xOffset: 0,
          yOffset: 0,
          sideLabels: [],
          vertexLabels: [],
          angleLabels: [],
        }],
        parseHTML: element => {
          const shapes = element.getAttribute('data-shapes');
          return shapes ? JSON.parse(shapes) : [];
        },
        renderHTML: attributes => ({
          'data-shapes': JSON.stringify(attributes.shapes),
        }),
      },
      showLabels: { 
        default: true,
        parseHTML: element => element.getAttribute('data-show-labels') === 'true',
        renderHTML: attributes => ({
          'data-show-labels': attributes.showLabels,
        }),
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
  const { shapes, showLabels } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [activeShapeIdx, setActiveShapeIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{x: number, y: number} | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const safeShapes = Array.isArray(shapes) ? shapes : [];
  const activeShape = safeShapes[activeShapeIdx] || safeShapes[0] || {};

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'rotate' | 'draw', shapeIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'draw') {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        setIsDrawing(true);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDrawStart({ x, y });
        setDrawCurrent({ x, y });
        return;
    }

    setActiveShapeIdx(shapeIdx);
    if (action === 'drag') setIsDragging(true);
    if (action === 'rotate') setIsRotating(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isRotating && !isDrawing) return;
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDrawing) {
        setDrawCurrent({ x: mouseX, y: mouseY });
        return;
      }

      const centerX = 125 + (activeShape.xOffset || 0);
      const centerY = 175 + (activeShape.yOffset || 0);

      const newShapes = [...safeShapes];
      
      if (isDragging) {
        newShapes[activeShapeIdx] = {
          ...activeShape,
          xOffset: mouseX - 125,
          yOffset: mouseY - 175,
        };
        updateAttributes({ shapes: newShapes });
      }

      if (isRotating) {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        newShapes[activeShapeIdx] = {
          ...activeShape,
          rotation: angle,
        };
        updateAttributes({ shapes: newShapes });
      }
    };

    const handleMouseUp = () => {
      if (isDrawing && drawStart && drawCurrent) {
        const dx = drawCurrent.x - drawStart.x;
        const dy = drawCurrent.y - drawStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 5) {
          const centerX = (drawStart.x + drawCurrent.x) / 2;
          const centerY = (drawStart.y + drawCurrent.y) / 2;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          const newLine: ShapeData = {
            id: `shape-${Date.now()}`,
            shapeType: 'line',
            width: length,
            height: 0,
            color: '#000000',
            rotation: angle,
            xOffset: centerX - 125,
            yOffset: centerY - 175,
            sideLabels: [],
            vertexLabels: [],
            angleLabels: [],
          };
          updateAttributes({ shapes: [...safeShapes, newLine] });
          setActiveShapeIdx(safeShapes.length);
        }
      }
      setIsDragging(false);
      setIsRotating(false);
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
    };

    if (isDragging || isRotating || isDrawing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRotating, isDrawing, drawStart, drawCurrent, activeShape, activeShapeIdx, safeShapes, updateAttributes]);

  const getPolygonVertices = (shape: ShapeData) => {
    const centerX = 125 + (shape.xOffset || 0);
    const centerY = 175 + (shape.yOffset || 0);
    const { shapeType, width, height } = shape;

    if (shapeType === 'circle') return [];
    if (shapeType === 'line') {
      return [
        { x: centerX - width / 2, y: centerY },
        { x: centerX + width / 2, y: centerY }
      ];
    }

    const parts = (shapeType || '').split('_');
    const numSidesStr = parts[0];
    const subType = parts[1];
    const numSides = parseInt(numSidesStr);

    let vertices: { x: number, y: number }[] = [];

    if (numSides === 3) {
      const w = width;
      const h = height;
      if (subType === 'iso') vertices = [{ x: centerX, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
      else if (subType === 'right') vertices = [{ x: centerX - w / 2, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
      else if (subType === 'obtuse') vertices = [{ x: centerX + w / 3, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
    } else if (numSides === 4) {
      const w = width;
      const h = subType === 'rect' ? height : width;
      vertices = [
        { x: centerX - w / 2, y: centerY - h / 2 },
        { x: centerX + w / 2, y: centerY - h / 2 },
        { x: centerX + w / 2, y: centerY + h / 2 },
        { x: centerX - w / 2, y: centerY + h / 2 }
      ];
    } else {
      const radiusX = width / 2;
      const radiusY = height / 2;
      for (let i = 0; i < numSides; i++) {
        const angle = (i * 2 * Math.PI) / numSides - Math.PI / 2;
        vertices.push({
          x: centerX + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle)
        });
      }
    }
    return vertices;
  };

  const renderLabels = (shape: ShapeData, vertices: { x: number, y: number }[]) => {
    if (!showLabels) return null;
    const centerX = 125 + (shape.xOffset || 0);
    const centerY = 175 + (shape.yOffset || 0);
    
    const elements: any[] = [];

    if (shape.shapeType === 'circle') {
      elements.push(<text key="r" x={centerX} y={centerY - shape.width / 2 - 10} textAnchor="middle" fontSize="12" fill={shape.color} fontWeight="bold">{shape.sideLabels?.[0] || `R=${shape.width / 2}`}</text>);
    } else {
      vertices.forEach((v, i) => {
        if (shape.shapeType === 'line' && i === 1) return;
        const nextV = vertices[(i + 1) % vertices.length];
        if (shape.shapeType === 'line' && i === 0) {
            elements.push(<text key={`s-${i}`} x={(v.x + nextV.x)/2} y={(v.y+nextV.y)/2 - 15} textAnchor="middle" fontSize="11" fill={shape.color} fontWeight="black">{shape.sideLabels?.[0] || ''}</text>);
        } else {
            const midX = (v.x + nextV.x) / 2;
            const midY = (v.y + nextV.y) / 2;
            const dx = nextV.x - v.x;
            const dy = nextV.y - v.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length < 1) return;
            const nx = -dy / length;
            const ny = dx / length;
            const labelX = midX + nx * 18 * ( (nx*(centerX-midX) + ny*(centerY-midY)) > 0 ? -1 : 1 );
            const labelY = midY + ny * 18 * ( (nx*(centerX-midX) + ny*(centerY-midY)) > 0 ? -1 : 1 );
            if (shape.sideLabels?.[i]) {
                elements.push(<text key={`s-${i}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={shape.color} fontWeight="black">{shape.sideLabels[i]}</text>);
            }
        }
      });
    }

    vertices.forEach((v, i) => {
      const dx = v.x - centerX;
      const dy = v.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      if (shape.vertexLabels?.[i]) {
        elements.push(<text key={`v-${i}`} x={v.x + ux * 15} y={v.y + uy * 15} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill={shape.color} fontWeight="black" className="italic">{shape.vertexLabels[i]}</text>);
      }

      if (shape.angleLabels?.[i] && shape.shapeType !== 'line') {
        elements.push(<text key={`a-${i}`} x={v.x - ux * 25} y={v.y - uy * 25} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={shape.color} fontWeight="bold">{shape.angleLabels[i]}</text>);
      }
    });

    return elements;
  };

  const renderShape = (shape: ShapeData, idx: number) => {
    const centerX = 125 + (shape.xOffset || 0);
    const centerY = 175 + (shape.yOffset || 0);
    const transform = `rotate(${shape.rotation || 0}, ${centerX}, ${centerY})`;
    const vertices = getPolygonVertices(shape);
    const strokeWidth = activeShapeIdx === idx ? 4 : 2;

    return (
      <g key={shape.id} transform={transform}>
        {shape.shapeType === 'circle' ? (
          <circle cx={centerX} cy={centerY} r={shape.width / 2} stroke={shape.color} strokeWidth={strokeWidth} fill={`${shape.color}10`} className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        ) : shape.shapeType === 'line' ? (
          <line x1={vertices[0].x} y1={vertices[0].y} x2={vertices[1].x} y2={vertices[1].y} stroke={shape.color} strokeWidth={strokeWidth} strokeLinecap="round" className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        ) : (
          <polygon points={vertices.map(v => `${v.x},${v.y}`).join(' ')} stroke={shape.color} strokeWidth={strokeWidth} fill={`${shape.color}10`} className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        )}
        {renderLabels(shape, vertices)}
        {selected && activeShapeIdx === idx && !drawMode && (
          <g>
            <line x1={centerX} y1={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : shape.height / 2)} x2={centerX} y2={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : shape.height / 2) - 30} stroke={shape.color} strokeWidth="1" strokeDasharray="2" />
            <circle cx={centerX} cy={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : shape.height / 2) - 30} r="7" fill="white" stroke={shape.color} strokeWidth="2" className="cursor-pointer hover:fill-primary transition-colors" onMouseDown={(e) => handleMouseDown(e, 'rotate', idx)} />
          </g>
        )}
      </g>
    );
  };

  const [drawMode, setDrawMode] = useState(false);

  const handleAddShape = () => {
    if (safeShapes.length >= 8) return;
    const newShape: ShapeData = {
      id: `shape-${Date.now()}`,
      shapeType: '4_square',
      width: 100,
      height: 100,
      color: '#EF4444',
      rotation: 0,
      xOffset: 40,
      yOffset: 40,
      sideLabels: [],
      vertexLabels: [],
      angleLabels: [],
    };
    updateAttributes({ shapes: [...safeShapes, newShape] });
    setActiveShapeIdx(safeShapes.length);
  };

  const handleRemoveShape = (idx: number) => {
    if (safeShapes.length <= 1) {
        deleteNode();
        return;
    }
    const newShapes = safeShapes.filter((_: any, i: number) => i !== idx);
    updateAttributes({ shapes: newShapes });
    setActiveShapeIdx(0);
  };

  const updateActiveShape = (data: Partial<ShapeData>) => {
    const newShapes = [...safeShapes];
    newShapes[activeShapeIdx] = { ...activeShape, ...data };
    updateAttributes({ shapes: newShapes });
  };

  const getNumVertices = () => {
    if (activeShape.shapeType === 'circle') return 0;
    if (activeShape.shapeType === 'line') return 2;
    return parseInt((activeShape.shapeType || '').split('_')[0]) || 0;
  };

  const getNumSides = () => {
    if (activeShape.shapeType === 'circle') return 1;
    if (activeShape.shapeType === 'line') return 1;
    return parseInt((activeShape.shapeType || '').split('_')[0]) || 0;
  };

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/geo relative ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-3xl' : ''}`}>
      <div 
        className={`bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-inner relative w-full flex justify-center overflow-hidden min-h-[400px] ${drawMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={(e) => drawMode && handleMouseDown(e, 'draw', 0)}
      >
        <svg ref={svgRef} width="100%" height="400" viewBox="0 0 250 400" className="drop-shadow-sm overflow-visible">
          {(isDragging || isRotating || isDrawing) && (
             <g opacity="0.1"><line x1="0" y1="200" x2="250" y2="200" stroke="#000" strokeDasharray="4"/><line x1="125" y1="0" x2="125" y2="400" stroke="#000" strokeDasharray="4"/></g>
          )}
          {safeShapes.map((s: ShapeData, i: number) => renderShape(s, i))}
          {isDrawing && drawStart && drawCurrent && (
            <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y} stroke="#000" strokeWidth="2" strokeDasharray="4" />
          )}
        </svg>
        <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover/geo:opacity-100 transition-opacity no-print">
            <button 
                onClick={() => setDrawMode(!drawMode)} 
                className={`p-2.5 rounded-xl shadow-lg transition-all ${drawMode ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:text-orange-500'}`}
                title="צייר קו (גרור על המסך)"
            >
                <Pencil size={20} />
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl shadow-lg transition-all ${isEditing ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`} title="הגדרות"><Settings size={20} /></button>
            <button onClick={deleteNode} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק שרטוט"><Trash2 size={20} /></button>
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2 no-print overflow-x-auto max-w-[80%] pb-1 no-scrollbar">
            {safeShapes.map((_: any, i: number) => (
                <button key={i} onClick={() => setActiveShapeIdx(i)} className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md shrink-0 ${activeShapeIdx === i ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>צורה {i+1}</button>
            ))}
            {safeShapes.length < 8 && (
                <button onClick={handleAddShape} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 shadow-sm border border-blue-100 flex items-center gap-1 shrink-0"><Plus size={14}/> הוסף צורה</button>
            )}
        </div>
      </div>

      {isEditing && (
        <div className="w-full mt-4 p-6 bg-white rounded-[2rem] border-2 border-primary/20 shadow-xl animate-fade-in no-print z-20">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
             <div className="flex items-center gap-4">
                <h4 className="font-black text-primary">עריכת צורה {activeShapeIdx + 1}</h4>
                <div className="flex gap-1">
                    {['#3B82F6', '#EF4444', '#10B981', '#000000', '#F59E0B'].map(c => (
                        <button key={c} onClick={() => updateActiveShape({ color: c })} className={`w-6 h-6 rounded-full border-2 border-white shadow-sm ${activeShape.color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
             </div>
             <button onClick={() => handleRemoveShape(activeShapeIdx)} className="text-red-500 text-xs font-black flex items-center gap-1 hover:bg-red-50 px-3 py-1 rounded-lg transition-all"><Trash size={14}/> מחק צורה זו</button>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">סוג צורה</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'circle', label: 'עיגול', icon: CircleIcon },
                    { id: 'line', label: 'קו', icon: Plus },
                    { id: '3_iso', label: 'משולש', icon: Triangle },
                    // Fix: Imported Square icon from lucide-react to resolve 'Cannot find name Square'
                    { id: '4_rect', label: 'מרובע', icon: Square },
                    { id: '5_regular', label: '5 צלעות', icon: Hexagon },
                    { id: '6_regular', label: '6 צלעות', icon: Hexagon },
                    { id: '8_regular', label: 'מתומן', icon: Hexagon },
                  ].map(item => (
                    <button key={item.id} onClick={() => updateActiveShape({ shapeType: item.id, sideLabels: [], vertexLabels: [], angleLabels: [] })} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${(activeShape.shapeType || '').startsWith(item.id.split('_')[0]) && item.id !== 'line' && item.id !== 'circle' || activeShape.shapeType === item.id ? 'border-primary bg-blue-50 text-primary font-black' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}><item.icon size={18} /><span className="text-[9px] mt-1">{item.label}</span></button>
                  ))}
                </div>
              </div>

              {(activeShape.shapeType || '').startsWith('3') && (
                <div className="grid grid-cols-3 gap-2">
                    {[{ id: '3_iso', label: 'חד זווית' }, { id: '3_right', label: 'ישר זווית' }, { id: '3_obtuse', label: 'קהה זווית' }].map(s => (
                        <button key={s.id} onClick={() => updateActiveShape({ shapeType: s.id })} className={`py-2 px-1 rounded-lg border-2 text-[10px] font-bold transition-all ${activeShape.shapeType === s.id ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 text-gray-400'}`}>{s.label}</button>
                    ))}
                </div>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[40px]">{activeShape.shapeType === 'line' ? 'אורך' : 'רוחב'}</span><input type="range" min="30" max="220" value={activeShape.width || 100} onChange={e => updateActiveShape({ width: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>
                {activeShape.shapeType !== 'circle' && activeShape.shapeType !== 'line' && activeShape.shapeType !== '4_square' && (<div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[40px]">גובה</span><input type="range" min="30" max="220" value={activeShape.height || 100} onChange={e => updateActiveShape({ height: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>)}
              </div>
            </div>

            <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase block mb-3">סימון קודקודים וזוויות</label>
                   <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto no-scrollbar pr-1">
                      {Array.from({ length: getNumVertices() }).map((_, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl space-y-2 border border-gray-100">
                           <span className="text-[9px] font-black text-gray-400">קודקוד {i+1}</span>
                           <div className="flex gap-2">
                             <input type="text" placeholder="אות" maxLength={2} value={activeShape.vertexLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.vertexLabels || [])]; l[i] = e.target.value; updateActiveShape({ vertexLabels: l }); }} className="w-full p-1.5 bg-white border rounded text-xs font-bold text-center uppercase" />
                             {activeShape.shapeType !== 'line' && <input type="text" placeholder="זווית" value={activeShape.angleLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.angleLabels || [])]; l[i] = e.target.value; updateActiveShape({ angleLabels: l }); }} className="w-full p-1.5 bg-white border rounded text-xs font-bold text-center" />}
                           </div>
                        </div>
                      ))}
                      {getNumVertices() === 0 && <div className="col-span-2 text-center py-4 text-gray-300 text-xs font-bold italic">בחר צורה עם קודקודים</div>}
                   </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-3">אורך צלעות</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: getNumSides() }).map((_, i) => (
                            <input key={i} type="text" placeholder={`צלע ${i+1}`} value={activeShape.sideLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.sideLabels || [])]; l[i] = e.target.value; updateActiveShape({ sideLabels: l }); }} className="p-2 bg-gray-50 border rounded-lg text-xs font-bold text-center" />
                        ))}
                    </div>
                </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100">
             <button onClick={() => updateAttributes({ showLabels: !showLabels })} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${showLabels ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{showLabels ? <Check size={14}/> : <Plus size={14}/>} הצג תוויות בשרטוט</button>
             <button onClick={() => setIsEditing(false)} className="bg-primary text-white px-10 py-2 rounded-xl font-black text-xs hover:bg-blue-600 shadow-lg">סיום עריכה</button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// --- Analytic Geometry Extension ---

interface AnalyticObject {
    id: string;
    type: 'point' | 'line' | 'parabola' | 'segment';
    params: any;
    color: string;
    label?: string;
    showEquation?: boolean;
}

const AnalyticGeometryNode = Node.create({
  name: 'analyticGeometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      objects: { 
        default: [],
        parseHTML: element => {
          const objects = element.getAttribute('data-objects');
          return objects ? JSON.parse(objects) : [];
        },
        renderHTML: attributes => ({
          'data-objects': JSON.stringify(attributes.objects),
        }),
      },
      viewRange: { 
        default: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
        parseHTML: element => {
          const range = element.getAttribute('data-view-range');
          return range ? JSON.parse(range) : { minX: -10, maxX: 10, minY: -10, maxY: 10 };
        },
        renderHTML: attributes => ({
          'data-view-range': JSON.stringify(attributes.viewRange),
        }),
      },
      showGrid: { 
        default: true,
        parseHTML: element => element.getAttribute('data-show-grid') === 'true',
        renderHTML: attributes => ({
          'data-show-grid': attributes.showGrid,
        }),
      },
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
  const { objects, viewRange, showGrid } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState<AnalyticObject['type'] | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [showRangeSettings, setShowRangeSettings] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{x: number, y: number} | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Size constants
  const size = 350;
  const margin = 25;
  const plotSize = size - 2 * margin;

  const safeObjects = Array.isArray(objects) ? objects : [];
  const safeViewRange = viewRange || { minX: -10, maxX: 10, minY: -10, maxY: 10 };

  const toSVGX = (x: number) => margin + (x - safeViewRange.minX) * (plotSize / (safeViewRange.maxX - safeViewRange.minX));
  const toSVGY = (y: number) => size - (margin + (y - safeViewRange.minY) * (plotSize / (safeViewRange.maxY - safeViewRange.minY)));

  const fromSVGX = (svgX: number) => safeViewRange.minX + (svgX - margin) * ((safeViewRange.maxX - safeViewRange.minX) / plotSize);
  const fromSVGY = (svgY: number) => safeViewRange.minY + (size - margin - svgY) * ((safeViewRange.maxY - safeViewRange.minY) / plotSize);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!drawMode) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsDrawing(true);
      setDrawStart({x, y});
      setDrawCurrent({x, y});
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawing || !drawStart || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        setDrawCurrent({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseUp = () => {
        if (isDrawing && drawStart && drawCurrent) {
            const x1 = Number(fromSVGX(drawStart.x).toFixed(2));
            const y1 = Number(fromSVGY(drawStart.y).toFixed(2));
            const x2 = Number(fromSVGX(drawCurrent.x).toFixed(2));
            const y2 = Number(fromSVGY(drawCurrent.y).toFixed(2));

            const dist = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            if (dist > 0.1) {
                // Add a finite segment instead of infinite line, label is empty string
                handleAddObject('segment', { x1, y1, x2, y2 }, "");
            }
        }
        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
    };

    if (isDrawing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDrawing, drawStart, drawCurrent]);

  const handleAddObject = (type: AnalyticObject['type'], params: any, label?: string, showEquation?: boolean) => {
    if (editingObjectId) {
      const updatedObjects = safeObjects.map((o: AnalyticObject) => {
        if (o.id === editingObjectId) {
          return { ...o, type, params, label, showEquation: showEquation ?? true };
        }
        return o;
      });
      updateAttributes({ objects: updatedObjects });
      setEditingObjectId(null);
    } else {
      const newObj: AnalyticObject = {
          id: `obj-${Date.now()}`,
          type,
          params,
          label,
          showEquation: showEquation ?? true,
          color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'][safeObjects.length % 5]
      };
      updateAttributes({ objects: [...safeObjects, newObj] });
    }
    setEditingType(null);
  };

  const handleRemoveObject = (id: string) => {
    updateAttributes({ objects: safeObjects.filter((o: AnalyticObject) => o.id !== id) });
    if (editingObjectId === id) {
      setEditingObjectId(null);
      setEditingType(null);
    }
  };

  const handleEditObject = (obj: AnalyticObject) => {
    setEditingObjectId(obj.id);
    setEditingType(obj.type);
  };

  const getTickStep = (range: number) => {
    if (range > 100) return 20;
    if (range > 50) return 10;
    if (range > 20) return 5;
    if (range > 10) return 2;
    return 1;
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const gridLines = [];
    const rangeX = safeViewRange.maxX - safeViewRange.minX;
    const rangeY = safeViewRange.maxY - safeViewRange.minY;
    const stepX = getTickStep(rangeX);
    const stepY = getTickStep(rangeY);

    for (let x = Math.ceil(safeViewRange.minX / stepX) * stepX; x <= safeViewRange.maxX; x += stepX) {
        const sx = toSVGX(x);
        gridLines.push(<line key={`gx-${x}`} x1={sx} y1={margin} x2={sx} y2={size - margin} stroke={Math.abs(x) < 0.0001 ? "#cbd5e1" : "#f1f5f9"} strokeWidth={Math.abs(x) < 0.0001 ? "2" : "1"} />);
    }
    for (let y = Math.ceil(safeViewRange.minY / stepY) * stepY; y <= safeViewRange.maxY; y += stepY) {
        const sy = toSVGY(y);
        gridLines.push(<line key={`gy-${y}`} x1={margin} y1={sy} x2={size - margin} y2={sy} stroke={Math.abs(y) < 0.0001 ? "#cbd5e1" : "#f1f5f9"} strokeWidth={Math.abs(y) < 0.0001 ? "2" : "1"} />);
    }
    return <g>{gridLines}</g>;
  };

  const renderAxes = () => {
    const originX = toSVGX(0);
    const originY = toSVGY(0);
    const ticks = [];
    
    if (showGrid) {
      const rangeX = safeViewRange.maxX - safeViewRange.minX;
      const rangeY = safeViewRange.maxY - safeViewRange.minY;
      const stepX = getTickStep(rangeX);
      const stepY = getTickStep(rangeY);

      // X ticks
      for (let x = Math.ceil(safeViewRange.minX / stepX) * stepX; x <= safeViewRange.maxX; x += stepX) {
          if (Math.abs(x) < 0.0001) continue;
          const sx = toSVGX(x);
          ticks.push(
              <g key={`xtick-${x}`}>
                  <line x1={sx} y1={originY - 3} x2={sx} y2={originY + 3} stroke="#94a3b8" strokeWidth="1" />
                  <text x={sx} y={originY + 12} fontSize="8" fill="#94a3b8" textAnchor="middle">{x}</text>
              </g>
          );
      }

      // Y ticks
      for (let y = Math.ceil(safeViewRange.minY / stepY) * stepY; y <= safeViewRange.maxY; y += stepY) {
          if (Math.abs(y) < 0.0001) continue;
          const sy = toSVGY(y);
          ticks.push(
              <g key={`ytick-${y}`}>
                  <line x1={originX - 3} y1={sy} x2={originX + 3} y2={sy} stroke="#94a3b8" strokeWidth="1" />
                  <text x={originX - 6} y={sy + 3} fontSize="8" fill="#94a3b8" textAnchor="end">{y}</text>
              </g>
          );
      }
    }

    return (
        <g>
            <line x1={margin} y1={originY} x2={size - margin} y2={originY} stroke="#94a3b8" strokeWidth="1.5" />
            <line x1={originX} y1={margin} x2={originX} y2={size - margin} stroke="#94a3b8" strokeWidth="1.5" />
            {/* Arrows */}
            <path d={`M ${size - margin + 5} ${originY} L ${size - margin} ${originY - 3} L ${size - margin} ${originY + 3} Z`} fill="#94a3b8" />
            <path d={`M ${originX} ${margin - 5} L ${originX - 3} ${margin} L ${originX + 3} ${margin} Z`} fill="#94a3b8" />
            <text x={size - margin + 5} y={originY + 15} fontSize="10" fill="#64748b" textAnchor="end" fontWeight="black">x</text>
            <text x={originX - 10} y={margin - 5} fontSize="10" fill="#64748b" fontWeight="black">y</text>
            {ticks}
        </g>
    );
  };

  const renderObjects = () => {
    return safeObjects.map((obj: AnalyticObject) => {
        if (obj.type === 'point') {
            const { x, y } = obj.params || { x: 0, y: 0 };
            const sx = toSVGX(x);
            const sy = toSVGY(y);
            return (
                <g key={obj.id}>
                    <circle cx={sx} cy={sy} r="4" fill={obj.color} className="drop-shadow-sm" />
                    <text x={sx + 6} y={sy - 6} fontSize="10" fill={obj.color} fontWeight="black" textAnchor="start">
                        {obj.label && <tspan fontWeight="900" fontSize="11">{obj.label} </tspan>}
                        {obj.showEquation && `(${x},${y})`}
                    </text>
                </g>
            );
        }
        if (obj.type === 'line') {
            const { m, b } = obj.params || { m: 1, b: 0 };
            const x1 = safeViewRange.minX;
            const y1 = m * x1 + b;
            const x2 = safeViewRange.maxX;
            const y2 = m * x2 + b;
            const sx1 = toSVGX(x1);
            const sy1 = toSVGY(y1);
            const sx2 = toSVGX(x2);
            const sy2 = toSVGY(y2);
            
            const midXVal = (safeViewRange.minX + safeViewRange.maxX) / 2;
            const midYVal = m * midXVal + b;
            const midX = toSVGX(midXVal);
            const midY = toSVGY(midYVal);

            return (
                <g key={obj.id}>
                    <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={obj.color} strokeWidth="2.5" strokeLinecap="round" />
                    <text x={midX + 10} y={midY - 10} fontSize="9" fill={obj.color} fontWeight="black">
                        {obj.label && <tspan fontWeight="900" fontSize="11">{obj.label}: </tspan>}
                        {obj.showEquation && `y = ${m}x${b >= 0 ? '+' : ''}${b}`}
                    </text>
                </g>
            );
        }
        if (obj.type === 'segment') {
          const { x1, y1, x2, y2 } = obj.params || { x1: 0, y1: 0, x2: 1, y2: 1 };
          const sx1 = toSVGX(x1);
          const sy1 = toSVGY(y1);
          const sx2 = toSVGX(x2);
          const sy2 = toSVGY(y2);
          return (
            <g key={obj.id}>
              <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={obj.color} strokeWidth="2.5" strokeLinecap="round" />
              {/* No labels around drawing segments as requested */}
            </g>
          );
        }
        if (obj.type === 'parabola') {
            const points = [];
            const step = (safeViewRange.maxX - safeViewRange.minX) / 100;
            const { a, b, c } = obj.params || { a: 1, b: 0, c: 0 };
            for (let x = safeViewRange.minX; x <= safeViewRange.maxX; x += step) {
                const y = a * x * x + b * x + c;
                const sy = toSVGX(x);
                const sYCoord = toSVGY(y);
                if (sYCoord >= -50 && sYCoord <= size + 50) {
                    points.push(`${sy},${sYCoord}`);
                }
            }
            
            const vx = -b / (2 * a || 1);
            const vy = a * vx * vx + b * vx + c;
            
            return (
                <g key={obj.id}>
                    <polyline points={points.join(' ')} fill="none" stroke={obj.color} strokeWidth="2.5" strokeLinejoin="round" />
                    <text x={toSVGX(vx) + 10} y={toSVGY(vy) - 15} fontSize="9" fill={obj.color} fontWeight="black">
                        {obj.label && <tspan fontWeight="900" fontSize="11">{obj.label}: </tspan>}
                        {obj.showEquation && `y = ${a}x²${b >= 0 ? '+' : ''}${b}x${c >= 0 ? '+' : ''}${c}`}
                    </text>
                </g>
            );
        }
        return null;
    });
  };

  const editingObject = safeObjects.find((o: AnalyticObject) => o.id === editingObjectId);

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/analytic relative ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-[3rem]' : ''}`}>
      <div 
        className={`bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl relative w-full flex flex-col items-center overflow-hidden ${drawMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible bg-white">
            {renderGrid()}
            {renderAxes()}
            {renderObjects()}
            {isDrawing && drawStart && drawCurrent && (
                <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y} stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}
        </svg>

        <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover/analytic:opacity-100 transition-opacity no-print">
            <button 
                onClick={() => setDrawMode(!drawMode)} 
                className={`p-2.5 rounded-xl shadow-lg transition-all ${drawMode ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:text-orange-500'}`}
                title="צייר קטע (גרור על המערכת)"
            >
                <Pencil size={20} />
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl shadow-lg transition-all ${isEditing ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`} title="ערוך אובייקטים"><Settings size={20} /></button>
            <button onClick={() => { setShowRangeSettings(!showRangeSettings); setIsEditing(false); }} className={`p-2.5 rounded-xl shadow-lg transition-all ${showRangeSettings ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:text-emerald-600'}`} title="הגדרות טווח"><Settings2 size={20} /></button>
            <button onClick={deleteNode} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק"><Trash2 size={20} /></button>
        </div>
      </div>

      {showRangeSettings && (
        <div className="w-full mt-4 p-8 bg-white rounded-[2.5rem] border-2 border-emerald-100 shadow-2xl animate-fade-in no-print z-20" dir="rtl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                <h4 className="text-xl font-black text-emerald-600 flex items-center gap-2"><Ruler size={24}/> הגדרות טווח צירים</h4>
                <button onClick={() => setShowRangeSettings(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Input label="X מינימלי" placeholder="-10" id="range-minX" defaultValue={safeViewRange.minX.toString()}/>
                <Input label="X מקסימלי" placeholder="10" id="range-maxX" defaultValue={safeViewRange.maxX.toString()}/>
                <Input label="Y מינימלי" placeholder="-10" id="range-minY" defaultValue={safeViewRange.minY.toString()}/>
                <Input label="Y מקסימלי" placeholder="10" id="range-maxY" defaultValue={safeViewRange.maxY.toString()}/>
            </div>
            <button onClick={() => {
                const getVal = (id: string) => parseFloat((document.getElementById(`analytic-input-${id}`) as HTMLInputElement).value || '0');
                const minX = getVal('range-minX');
                const maxX = getVal('range-maxX');
                const minY = getVal('range-minY');
                const maxY = getVal('range-maxY');
                if (maxX > minX && maxY > minY) {
                    updateAttributes({ viewRange: { minX, maxX, minY, maxY } });
                    setShowRangeSettings(false);
                } else {
                    alert('טווח לא תקין: ערך מקסימלי חייב להיות גדול ממינימלי');
                }
            }} className="w-full mt-8 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">עדכן טווח צירים</button>
        </div>
      )}

      {isEditing && (
        <div className="w-full mt-4 p-8 bg-white rounded-[2.5rem] border-2 border-primary/20 shadow-2xl animate-fade-in no-print z-20" dir="rtl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                <h4 className="text-xl font-black text-primary flex items-center gap-2"><Grid3X3 size={24}/> עריכת גרף</h4>
                <div className="flex gap-2">
                    <button onClick={() => updateAttributes({ showGrid: !showGrid })} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${showGrid ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>רשת ומספרים</button>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => { setEditingType('point'); setEditingObjectId(null); }} className={`flex flex-col items-center gap-2 p-3 rounded-2xl font-black transition-all shadow-sm border-2 ${editingType === 'point' && !editingObjectId ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}><Dot size={20}/> נקודה</button>
                        <button onClick={() => { setEditingType('line'); setEditingObjectId(null); }} className={`flex flex-col items-center gap-2 p-3 rounded-2xl font-black transition-all shadow-sm border-2 ${editingType === 'line' && !editingObjectId ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}><Maximize2 size={20}/> ישר</button>
                        <button onClick={() => { setEditingType('parabola'); setEditingObjectId(null); }} className={`flex flex-col items-center gap-2 p-3 rounded-2xl font-black transition-all shadow-sm border-2 ${editingType === 'parabola' && !editingObjectId ? 'bg-purple-50 border-purple-400 text-purple-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}><Activity size={20}/> פרבולה</button>
                    </div>

                    {editingType && (
                        <div key={editingObjectId || 'new'} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 animate-fade-in">
                            <h5 className="font-black text-gray-800 mb-6 text-sm">
                              {editingObjectId ? 'עריכת' : 'הזנת'} ערכים: {
                                editingType === 'point' ? 'נקודה (x,y)' : 
                                editingType === 'segment' ? 'קטע (x1,y1) -> (x2,y2)' :
                                editingType === 'line' ? 'ישר (y=mx+b)' : 
                                'פרבולה (y=ax²+bx+c)'
                              }
                            </h5>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {editingType === 'point' && (
                                  <>
                                    <Input label="x" placeholder="0" id="x" defaultValue={editingObject?.params?.x?.toString() || '0'}/>
                                    <Input label="y" placeholder="0" id="y" defaultValue={editingObject?.params?.y?.toString() || '0'}/>
                                  </>
                                )}
                                {editingType === 'segment' && (
                                  <>
                                    <Input label="x1" placeholder="0" id="x1" defaultValue={editingObject?.params?.x1?.toString() || '0'}/>
                                    <Input label="y1" placeholder="0" id="y1" defaultValue={editingObject?.params?.y1?.toString() || '0'}/>
                                    <Input label="x2" placeholder="5" id="x2" defaultValue={editingObject?.params?.x2?.toString() || '5'}/>
                                    <Input label="y2" placeholder="5" id="y2" defaultValue={editingObject?.params?.y2?.toString() || '5'}/>
                                  </>
                                )}
                                {editingType === 'line' && (
                                  <>
                                    <Input label="m (שיפוע)" placeholder="1" id="m" defaultValue={editingObject?.params?.m?.toString() || '1'}/>
                                    <Input label="b (חיתוך y)" placeholder="0" id="b" defaultValue={editingObject?.params?.b?.toString() || '0'}/>
                                  </>
                                )}
                                {editingType === 'parabola' && (
                                  <>
                                    <Input label="a" placeholder="1" id="a" defaultValue={editingObject?.params?.a?.toString() || '1'}/>
                                    <Input label="b" placeholder="0" id="b" defaultValue={editingObject?.params?.b?.toString() || '0'}/>
                                    <div className="col-span-2">
                                      <Input label="c" placeholder="0" id="c" defaultValue={editingObject?.params?.c?.toString() || '0'}/>
                                    </div>
                                  </>
                                )}
                                
                                <div className="col-span-2 mt-4 space-y-4 border-t pt-4">
                                    <Input label="תגית (למשל A או L)" placeholder="תגית..." id="label" defaultValue={editingObject?.label || ''}/>
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <input type="checkbox" id="analytic-show-eq" defaultChecked={editingObject?.showEquation ?? true} className="w-4 h-4 accent-primary" />
                                        <label htmlFor="analytic-show-eq" className="text-xs font-black text-gray-600">הצג משוואה / קואורדינטות בגרף</label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const vals: any = {};
                                    ['x','y','m','b','a','c','x1','y1','x2','y2'].forEach(id => {
                                        const el = document.getElementById(`analytic-input-${id}`) as HTMLInputElement;
                                        if (el) vals[id] = parseFloat(el.value || '0');
                                    });
                                    const label = (document.getElementById('analytic-input-label') as HTMLInputElement).value;
                                    const showEq = (document.getElementById('analytic-show-eq') as HTMLInputElement).checked;
                                    handleAddObject(editingType!, vals, label, showEq);
                                }} className="flex-1 bg-primary text-white py-3 rounded-xl font-black shadow-lg">
                                  {editingObjectId ? 'עדכן אובייקט' : 'הוסף לגרף'}
                                </button>
                                <button onClick={() => { setEditingType(null); setEditingObjectId(null); }} className="px-6 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">ביטול</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase block pr-1">אובייקטים בגרף</label>
                    <div className="bg-gray-50 rounded-[2rem] p-4 min-h-[150px] space-y-2 max-h-[300px] overflow-y-auto border border-gray-100 no-scrollbar">
                        {safeObjects.length === 0 ? <p className="text-gray-300 text-center mt-10 font-bold italic">הגרף ריק...</p> : safeObjects.map((o: AnalyticObject) => (
                            <div key={o.id} className={`flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border transition-all group ${editingObjectId === o.id ? 'border-primary ring-1 ring-primary' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                                    <span className="text-xs font-black text-gray-700 truncate">
                                        {o.label && <span className="text-primary ml-1">{o.label}:</span>}
                                        {o.type === 'point' ? `נקודה (${o.params?.x || 0}, ${o.params?.y || 0})` : 
                                         o.type === 'segment' ? `קטע: (${o.params?.x1 || 0},${o.params?.y1 || 0}) ➔ (${o.params?.x2 || 0},${o.params?.y2 || 0})` :
                                         o.type === 'line' ? `ישר: y=${o.params?.m || 1}x${(o.params?.b || 0) >= 0 ? '+' : ''}${o.params?.b || 0}` :
                                         `פרבולה: y=${o.params?.a || 1}x²${(o.params?.b || 0) >= 0 ? '+' : ''}${o.params?.b || 0}x${(o.params?.c || 0) >= 0 ? '+' : ''}${o.params?.c || 0}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleEditObject(o)} className="p-1 text-gray-300 hover:text-primary transition-colors"><Edit2 size={14}/></button>
                                  <button onClick={() => handleRemoveObject(o.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, placeholder, id, defaultValue = "" }: { label: string, placeholder: string, id: string, defaultValue?: string }) => (
    <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 mr-1">{label}</label>
        <input id={`analytic-input-${id}`} type="text" placeholder={placeholder} defaultValue={defaultValue} className="w-full p-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-primary outline-none text-center font-bold text-sm shadow-inner" />
    </div>
);

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

// --- Custom Math Extension for Live Rendering ---

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
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-node"]',
        getAttrs: (element: string | HTMLElement) => {
           if (typeof element === 'string') return {};
           return { latex: element.getAttribute('data-latex') };
        }
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math-node', 'data-latex': HTMLAttributes.latex })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

const MathNodeView = (props: any) => {
  const { node, selected, deleteNode } = props;
  const latex = node.attrs.latex || '';

  return (
    <NodeViewWrapper className={`math-node-view ${selected ? 'selected' : ''}`}>
      <div className="flex items-center gap-1 group/math relative">
        <LatexRenderer text={latex.startsWith('$') ? latex : `$${latex}$`} className="math-inline-plain" />
        {selected && (
            <button 
                onClick={(e) => { e.stopPropagation(); deleteNode(); }}
                className="bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors ml-1 shadow-sm"
            >
                <X size={10} />
            </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// --- Main Editor Component ---

interface MathParam {
  id: string;
  label: string;
  placeholder: string;
}

interface MathSymbol {
  label: string;
  code?: string;
  after?: string;
  params?: MathParam[];
  template?: (vals: Record<string, string>) => string;
}

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showGuide?: boolean;
  minHeight?: string;
  minimalMode?: boolean;
  subject?: string;
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, placeholder, showGuide = true, minHeight = "450px", minimalMode = false, subject }) => {
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSymbol, setActiveSymbol] = useState<MathSymbol | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const isMath = subject === Subject.MATH;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      TextStyle.configure(),
      Color.configure(),
      Underline.configure(),
      FontFamily.configure(),
      FontSize,
      MathNode,
      GeometryNode,
      AnalyticGeometryNode,
      Image.configure({ allowBase64: true }),
      Placeholder.configure({
        placeholder: placeholder || "התחילו לכתוב כאן... ניתן להשתמש בעיצוב עשיר ובמתמטיקה",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `tiptap prose prose-blue max-w-none focus:outline-none p-8 text-right bg-transparent`,
        dir: 'rtl',
        style: `min-height: ${minHeight};`
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
       if (!editor.isFocused) {
         editor.commands.setContent(value, { emitUpdate: false });
       }
    }
  }, [value, editor]);

  const mathSymbols: MathSymbol[] = [
    { label: 'שבר', params: [{id: 'n', label: 'מונה', placeholder: '1'}, {id: 'd', label: 'מכנה', placeholder: '2'}], template: (vals) => `\\frac{${vals['n'] || ''}}{${vals['d'] || ''}}` },
    { label: 'חזקה', params: [{id: 'b', label: 'בסיס', placeholder: 'x'}, {id: 'e', label: 'מעריך', placeholder: '2'}], template: (vals) => `${vals['b'] || 'x'}^{${vals['e'] || ''}}` },
    { label: 'שורש ריבועי', params: [{id: 'v', label: 'מתחת לשורש', placeholder: 'x'}], template: (vals) => `\\sqrt{${vals['v'] || ''}}` },
    { label: 'שורש n-י', params: [{id: 'i', label: 'אינדקס (n)', placeholder: '3'}, {id: 'v', label: 'מספר', placeholder: 'x'}], template: (vals) => `\\sqrt[${vals['i'] || ''}]{${vals['v'] || ''}}` },
    { label: 'משוואה (=)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '5'}], template: (vals) => `${vals['l'] || ''} = ${vals['r'] || ''}` },
    { label: 'אי-שוויון (≠)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}], template: (vals) => `${vals['l'] || ''} \\neq ${vals['r'] || ''}` },
    { label: 'גדול מ... (>)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '3'}], template: (vals) => `${vals['l'] || ''} \\gt ${vals['r'] || ''}` },
    { label: 'גדול מ... (<)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '10'}], template: (vals) => `${vals['l'] || ''} \\lt ${vals['r'] || ''}` },
    { label: 'גדול/שווה (≥)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}], template: (vals) => `${vals['l'] || ''} \\ge ${vals['r'] || ''}` },
    { label: 'קטן/שווה (≤)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '11'}], template: (vals) => `${vals['l'] || ''} \\le ${vals['r'] || ''}` },
    { label: 'גבול (lim)', params: [{id: 'v', label: 'שואף ל...', placeholder: 'x \\to \\infty'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}], template: (vals) => `\\lim_{${vals['v'] || ''}} ${vals['e'] || ''}` },
    { label: 'אינטגרל מסוים', params: [{id: 'l', label: 'גבול תחתון', placeholder: 'a'}, {id: 'u', label: 'גבול עליון', placeholder: 'b'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}], template: (vals) => `\\int_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''} dx` },
    { label: 'סכום (Σ)', params: [{id: 'l', label: 'התחלה', placeholder: 'i=1'}, {id: 'u', label: 'סוף', placeholder: 'n'}, {id: 'e', label: 'ביטוי', placeholder: 'i'}], template: (vals) => `\\sum_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''}` },
    { label: 'לוגריתם', params: [{id: 'b', label: 'בסיס', placeholder: '10'}, {id: 'v', label: 'ערך', placeholder: 'x'}], template: (vals) => `\\log_{${vals['b'] || ''}}(${vals['v'] || ''})` },
    { label: 'סינוס/קוסינוס', params: [{id: 't', label: 'פונקציה', placeholder: 'sin'}, {id: 'v', label: 'ערך', placeholder: 'x'}], template: (vals) => `\\${vals['t'] || 'sin'}(${vals['v'] || ''})` },
    { label: 'מערכת משוואות', params: [{id: 'e1', label: 'משוואה 1', placeholder: 'x+y=5'}, {id: 'e2', label: 'משוואה 2', placeholder: 'x-y=1'}], template: (vals) => `\\begin{cases} ${vals['e1'] || ''} \\\\ ${vals['e2'] || ''} \\end{cases}` },
    { label: 'פאי (π)', params: [], template: () => `\\pi` },
    { label: 'אלפא/בטא', params: [{id: 'v', label: 'alpha / beta', placeholder: 'alpha'}], template: (vals) => `\\${vals['v'] || 'alpha'}` }
  ];

  const fonts = [{ name: 'רוביק', value: 'Rubik' }, { name: 'היבו', value: 'Heebo' }, { name: 'אסיסטנט', value: 'Assistant' }, { name: 'אלף', value: 'Alef' }, { name: 'דוד', value: 'David Libre' }, { name: 'ורלה', value: 'Varela Round' }, { name: 'מכונת כתיבה', value: 'Courier New' }];
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '60px', '72px'];

  const handleMathSymbolClick = (sym: MathSymbol) => {
    if (sym.params && sym.params.length > 0) { setActiveSymbol(sym); setParamValues({}); setShowMathPanel(false); }
    else { const latex = sym.template ? sym.template({}) : ''; editor?.commands.insertContent({ type: 'mathNode', attrs: { latex } }); setShowMathPanel(false); }
  };

  const handleInsertGeometry = () => editor?.commands.insertContent({ type: 'geometryNode' });
  const handleInsertAnalytic = () => editor?.commands.insertContent({ type: 'analyticGeometryNode' });

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
      <style>{`.tiptap h1 { font-size: 2.25rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 1rem; color: #111827; } .tiptap h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #374151; } .tiptap ul { list-style-type: disc; padding-right: 1.5rem; margin: 1rem 0; } .tiptap ol { list-style-type: decimal; padding-right: 1.5rem; margin: 1rem 0; } .tiptap li { margin-bottom: 0.5rem; } .tiptap p { margin-bottom: 1rem; line-height: 1.75; } .math-inline-plain .katex { font-size: 1.25em !important; }`}</style>
      {activeSymbol && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-indigo-100 p-8 transform animate-slide-up">
              <div className="flex justify-between items-center mb-6"><h4 className="font-black text-lg text-indigo-600 flex items-center gap-2"><Calculator size={20}/><span>הזנת ערכים: {activeSymbol.label}</span></h4><button onClick={() => setActiveSymbol(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
              <div className="space-y-4 mb-8">{activeSymbol.params?.map(param => (<div key={param.id}><label className="block text-xs font-black text-gray-400 uppercase mb-1.5 mr-1">{param.label}</label><input autoFocus={activeSymbol.params?.[0].id === param.id} type="text" value={paramValues[param.id] || ''} onChange={(e) => setParamValues({...paramValues, [param.id]: e.target.value})} placeholder={param.placeholder} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-center shadow-inner" onKeyDown={(e) => { if(e.key === 'Enter') submitParams(); }} /></div>))}</div>
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
              <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group"><select onChange={(e) => { const val = e.target.value; if (val === "") editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(); else editor.chain().focus().setMark('textStyle', { fontSize: val }).run(); }} className="appearance-none bg-white border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:ring-1 ring-primary/20 outline-none cursor-pointer text-gray-700 w-16 transition-all hover:bg-gray-100" value={editor.getAttributes('textStyle').fontSize || ''}><option value="">גודל</option>{fontSizes.map(s => (<option key={s} value={s}>{s.replace('px','')}</option>))}</select><ChevronDown size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" /></div>
              <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="כותרת גדולה"><Heading1 size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="כותרת משנה"><Heading2 size={16}/></button>
              </div>
              <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="רשימת נקודות"><List size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('orderedList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="רשימה ממוספרת"><ListOrdered size={16}/></button>
              </div>
            </>
          )}

          <div className="flex items-center gap-1 px-1 border-l border-gray-200 ml-1">
            {isMath && !minimalMode && (
              <button type="button" onClick={handleInsertGeometry} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-2" title="הוספת שרטוט גיאומטריה">
                <Shapes size={16}/>
                <span className="text-[10px] font-black">גיאומטריה</span>
              </button>
            )}
            {isMath && (
              <button type="button" onClick={handleInsertAnalytic} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-2" title="הוספת גיאומטריה אנליטית">
                <Grid3X3 size={16}/>
                <span className="text-[10px] font-black">אנליטית</span>
              </button>
            )}
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
};

export default RichEditor;
