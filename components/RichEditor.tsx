import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, 
  X, ChevronDown, Calculator, Plus, 
  Palette, Image as ImageIcon, Loader2, Trash2, Type, TypeIcon
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Extension, Node, mergeAttributes } from '@tiptap/react';
// Fix: Removed explicit import from @tiptap/core as it was causing issues with module augmentation in this environment
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import LatexRenderer from './LatexRenderer.tsx';

// --- Improved Font Size Extension ---

// Fix: Removed problematic module augmentation for @tiptap/core. 
// Standard Tiptap commands like setMark will be used directly in the UI components instead.

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
  // Fix: Removed custom addCommands to avoid dependency on module augmentation
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
  const latex = node.attrs.latex;

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
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, placeholder, showGuide = true, minHeight = "450px" }) => {
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSymbol, setActiveSymbol] = useState<MathSymbol | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      TextStyle,
      Color,
      Underline,
      FontFamily,
      FontSize,
      MathNode,
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
         editor.commands.setContent(value, false);
       }
    }
  }, [value, editor]);

  const mathSymbols: MathSymbol[] = [
    { 
      label: 'שבר', 
      params: [{id: 'n', label: 'מונה', placeholder: '1'}, {id: 'd', label: 'מכנה', placeholder: '2'}],
      template: (vals) => `\\frac{${vals['n'] || ''}}{${vals['d'] || ''}}`
    },
    { 
      label: 'חזקה', 
      params: [{id: 'b', label: 'בסיס', placeholder: 'x'}, {id: 'e', label: 'מעריך', placeholder: '2'}],
      template: (vals) => `${vals['b'] || 'x'}^{${vals['e'] || ''}}` 
    },
    { 
      label: 'שורש ריבועי', 
      params: [{id: 'v', label: 'מתחת לשורש', placeholder: 'x'}],
      template: (vals) => `\\sqrt{${vals['v'] || ''}}`
    },
    { 
      label: 'שורש n-י', 
      params: [{id: 'i', label: 'אינדקס (n)', placeholder: '3'}, {id: 'v', label: 'מספר', placeholder: 'x'}],
      template: (vals) => `\\sqrt[${vals['i'] || ''}]{${vals['v'] || ''}}`
    },
    { 
      label: 'משוואה (=)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '5'}],
      template: (vals) => `${vals['l'] || ''} = ${vals['r'] || ''}`
    },
    { 
      label: 'אי-שוויון (≠)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}],
      template: (vals) => `${vals['l'] || ''} \\neq ${vals['r'] || ''}`
    },
    { 
      label: 'גדול מ... (>)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '3'}],
      template: (vals) => `${vals['l'] || ''} \\gt ${vals['r'] || ''}`
    },
    { 
      label: 'קטן מ... (<)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '10'}],
      template: (vals) => `${vals['l'] || ''} \\lt ${vals['r'] || ''}`
    },
    { 
      label: 'גדול/שווה (≥)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}],
      template: (vals) => `${vals['l'] || ''} \\ge ${vals['r'] || ''}`
    },
    { 
      label: 'קטן/שווה (≤)', 
      params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '11'}],
      template: (vals) => `${vals['l'] || ''} \\le ${vals['r'] || ''}`
    },
    { 
      label: 'גבול (lim)', 
      params: [{id: 'v', label: 'שואף ל...', placeholder: 'x \\to \\infty'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}],
      template: (vals) => `\\lim_{${vals['v'] || ''}} ${vals['e'] || ''}`
    },
    { 
      label: 'אינטגרל מסוים', 
      params: [{id: 'l', label: 'גבול תחתון', placeholder: 'a'}, {id: 'u', label: 'גבול עליון', placeholder: 'b'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}],
      template: (vals) => `\\int_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''} dx`
    },
    { 
      label: 'סכום (Σ)', 
      params: [{id: 'l', label: 'התחלה', placeholder: 'i=1'}, {id: 'u', label: 'סוף', placeholder: 'n'}, {id: 'e', label: 'ביטוי', placeholder: 'i'}],
      template: (vals) => `\\sum_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''}`
    },
    { 
      label: 'לוגריתם', 
      params: [{id: 'b', label: 'בסיס', placeholder: '10'}, {id: 'v', label: 'ערך', placeholder: 'x'}],
      template: (vals) => `\\log_{${vals['b'] || ''}}(${vals['v'] || ''})`
    },
    { 
      label: 'סינוס/קוסינוס', 
      params: [{id: 't', label: 'פונקציה', placeholder: 'sin'}, {id: 'v', label: 'ערך', placeholder: 'x'}],
      template: (vals) => `\\${vals['t'] || 'sin'}(${vals['v'] || ''})` 
    },
    { 
      label: 'מערכת משוואות', 
      params: [{id: 'e1', label: 'משוואה 1', placeholder: 'x+y=5'}, {id: 'e2', label: 'משוואה 2', placeholder: 'x-y=1'}],
      template: (vals) => `\\begin{cases} ${vals['e1'] || ''} \\\\ ${vals['e2'] || ''} \\end{cases}` 
    },
    { 
      label: 'פאי (π)', 
      params: [],
      template: () => `\\pi` 
    },
    { 
      label: 'אלפא/בטא', 
      params: [{id: 'v', label: 'alpha / beta', placeholder: 'alpha'}],
      template: (vals) => `\\${vals['v'] || 'alpha'}` 
    }
  ];

  const fonts = [
    { name: 'רוביק', value: 'Rubik' },
    { name: 'היבו', value: 'Heebo' },
    { name: 'אסיסטנט', value: 'Assistant' },
    { name: 'אלף', value: 'Alef' },
    { name: 'דוד', value: 'David Libre' },
    { name: 'ורלה', value: 'Varela Round' },
    { name: 'מכונת כתיבה', value: 'Courier New' },
  ];

  const fontSizes = [
    '12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '60px', '72px'
  ];

  const handleMathSymbolClick = (sym: MathSymbol) => {
    if (sym.params && sym.params.length > 0) {
      setActiveSymbol(sym);
      setParamValues({});
      setShowMathPanel(false);
    } else {
      const latex = sym.template ? sym.template({}) : '';
      editor?.commands.insertContent({
        type: 'mathNode',
        attrs: { latex },
      });
      setShowMathPanel(false);
    }
  };

  const submitParams = () => {
    if (activeSymbol?.template && editor) {
      const latex = activeSymbol.template(paramValues);
      editor.commands.insertContent({
        type: 'mathNode',
        attrs: { latex },
      });
    }
    setActiveSymbol(null);
    setParamValues({});
  };

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
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        editor.commands.setImage({ src: base64 });
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const colors = [
    { name: 'שחור', value: '#000000' },
    { name: 'כחול', value: '#3b82f6' },
    { name: 'אדום', value: '#ef4444' },
    { name: 'ירוק', value: '#10b981' },
    { name: 'סגול', value: '#8b5cf6' },
  ];

  if (!editor) return null;

  return (
    <div className="flex flex-col w-full bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm focus-within:ring-2 ring-primary/10 transition-all text-right relative" dir="rtl">
      
      <style>{`
        .tiptap h1 { font-size: 2.25rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 1rem; color: #111827; }
        .tiptap h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #374151; }
        .tiptap ul { list-style-type: disc; padding-right: 1.5rem; margin: 1rem 0; }
        .tiptap ol { list-style-type: decimal; padding-right: 1.5rem; margin: 1rem 0; }
        .tiptap li { margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 1rem; line-height: 1.75; }
        .math-inline-plain .katex { font-size: 1.25em !important; }
      `}</style>

      {/* Math Params Popup */}
      {activeSymbol && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-indigo-100 p-8 transform animate-slide-up">
              <div className="justify-between items-center mb-6">
                <h4 className="font-black text-lg text-indigo-600 flex items-center gap-2">
                   <Calculator size={20}/>
                   <span>הזנת ערכים: {activeSymbol.label}</span>
                </h4>
                <button onClick={() => setActiveSymbol(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
              </div>
              
              <div className="space-y-4 mb-8">
                {activeSymbol.params?.map(param => (
                  <div key={param.id}>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-1.5 mr-1">{param.label}</label>
                    <input 
                      autoFocus={activeSymbol.params?.[0].id === param.id}
                      type="text" 
                      value={paramValues[param.id] || ''} 
                      onChange={(e) => setParamValues({...paramValues, [param.id]: e.target.value})}
                      placeholder={param.placeholder}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-center shadow-inner"
                      onKeyDown={(e) => { if(e.key === 'Enter') submitParams(); }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                 <button onClick={submitParams} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">הוסף לעורך</button>
                 <button onClick={() => setActiveSymbol(null)} className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">ביטול</button>
              </div>
           </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-gray-50 border-b border-gray-100 gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Style Controls */}
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleBold().run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('bold') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="הדגשה (Ctrl+B)"
            >
              <Bold size={16}/>
            </button>
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleItalic().run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('italic') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="נטוי (Ctrl+I)"
            >
              <Italic size={16}/>
            </button>
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleUnderline().run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('underline') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="קו תחתי (Ctrl+U)"
            >
              <UnderlineIcon size={16}/>
            </button>
          </div>

          {/* Font Family Dropdown - Modified to attach chevron closely */}
          <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group flex items-center bg-white rounded-xl hover:bg-gray-100 transition-all">
            <select 
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              className="appearance-none bg-transparent border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:outline-none cursor-pointer text-gray-700 w-auto min-w-[85px] transition-all"
              value={editor.getAttributes('textStyle').fontFamily || ''}
            >
              <option value="">סוג פונט</option>
              {fonts.map(f => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
          </div>

          {/* Font Size Dropdown */}
          <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group">
            <select 
              onChange={(e) => {
                const val = e.target.value;
                // Fix: use setMark directly instead of custom commands to avoid module augmentation issues
                if (val === "") editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
                else editor.chain().focus().setMark('textStyle', { fontSize: val }).run();
              }}
              className="appearance-none bg-white border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:ring-1 ring-primary/20 outline-none cursor-pointer text-gray-700 w-16 transition-all hover:bg-gray-100"
              value={editor.getAttributes('textStyle').fontSize || ''}
            >
              <option value="">גודל</option>
              {fontSizes.map(s => (
                <option key={s} value={s}>{s.replace('px','')}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
          </div>
          
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="כותרת גדולה"
            >
              <Heading1 size={16}/>
            </button>
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="כותרת משנה"
            >
              <Heading2 size={16}/>
            </button>
          </div>

          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleBulletList().run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="רשימת נקודות"
            >
              <List size={16}/>
            </button>
            <button 
              type="button" 
              onClick={() => editor.chain().focus().toggleOrderedList().run()} 
              className={`p-2 rounded-xl transition-all ${editor.isActive('orderedList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`}
              title="רשימה ממוספרת"
            >
              <ListOrdered size={16}/>
            </button>
          </div>

          {/* Math Tools */}
          {showGuide && (
            <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 relative">
              <button 
                type="button" 
                onClick={() => setShowMathPanel(!showMathPanel)} 
                className={`p-2 rounded-xl transition-all flex items-center gap-2 ${showMathPanel ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-50 text-indigo-600 hover:bg-blue-100'}`}
                title="הוספת נוסחה"
              >
                <Calculator size={16}/>
                <span className="text-[10px] font-black">מתמטיקה</span>
                <ChevronDown size={10} className={showMathPanel ? 'rotate-180 transition-transform' : ''}/>
              </button>
              
              {showMathPanel && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMathPanel(false)}></div>
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white shadow-2xl rounded-3xl border border-gray-100 z-20 w-80 animate-fade-in max-h-[450px] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                        {mathSymbols.map((sym, idx) => (
                            <button key={idx} type="button" onClick={() => handleMathSymbolClick(sym)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-all text-right group">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-mono text-indigo-600 group-hover:bg-white shadow-sm transition-all"><Plus size={10} /></div>
                                <span className="text-[11px] font-bold text-gray-600 group-hover:text-indigo-700 leading-tight">{sym.label}</span>
                            </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Color Palette Controls */}
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 group relative">
             <div className="p-2 text-gray-400"><Palette size={16} /></div>
             <div className="flex gap-1 ml-2">
                {colors.map(colorItem => (
                  <button 
                    key={colorItem.value}
                    type="button"
                    onClick={() => editor.chain().focus().setColor(colorItem.value).run()}
                    className={`w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 ${editor.isActive('textStyle', { color: colorItem.value }) ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    style={{ backgroundColor: colorItem.value }}
                    title={colorItem.name}
                  />
                ))}
             </div>
          </div>

          <div className="flex items-center gap-0.5 px-1">
             <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
              className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-xl transition-all"
              title="הוספת תמונה"
             >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
             </button>
             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>
      </div>

      <div className="relative bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichEditor;