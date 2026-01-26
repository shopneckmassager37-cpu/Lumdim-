
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface LatexRendererProps {
  text: string;
  className?: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className = "" }) => {
  const processedText = useMemo(() => {
    if (!text) return '';
    
    // Efficiency: use a single regex for LaTeX alternatives like \[ \] and \( \)
    // Note: Standard $ and $$ are handled natively by remark-math.
    const replacements: Record<string, string> = {
      '\\[': '$$',
      '\\]': '$$',
      '\\(': '$',
      '\\)': '$'
    };

    // We use a regex that matches common LaTeX wrapper formats used by LLMs
    return text.replace(/\\\[|\\\]|\\\(|\\\)/g, (match) => replacements[match] || match);
  }, [text]);

  if (!processedText) return null;

  return (
    <div className={`markdown-content leading-relaxed text-right font-sans ${className}`} dir="rtl">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-black mt-8 mb-6 text-gray-900 border-b-4 border-primary/20 pb-3 inline-block">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-black mt-10 mb-5 text-gray-800 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-8 before:bg-primary before:rounded-full">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold mt-8 mb-4 text-gray-700 bg-gray-50 px-4 py-2 rounded-xl border-r-4 border-accent/40 w-fit">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-5 text-gray-700 leading-loose text-lg font-normal">{children}</p>,
          ul: ({ children }) => <ul className="space-y-3 my-6 pr-6 list-disc list-outside text-lg text-gray-700 font-normal">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-3 my-6 pr-6 list-decimal list-outside text-lg text-gray-700 font-normal">{children}</ol>,
          li: ({ children }) => (
            <li className="leading-relaxed text-lg text-gray-700 font-normal">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 px-0.5">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-primary font-medium mx-0.5">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-8 p-6 bg-blue-50/50 border-r-8 border-primary rounded-2xl shadow-sm italic text-gray-600 text-lg">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-gray-100 border-t-2" />,
          img: ({ src, alt, style, ...props }) => (
            <img 
              src={src} 
              alt={alt} 
              style={{...style, maxWidth: '100%', height: 'auto', borderRadius: '1rem', display: 'block', margin: '1.5rem auto'}} 
              className="shadow-lg border border-gray-100"
              {...props}
            />
          ),
          div: ({ className, children, ...props }) => {
            if (className?.includes('math-display')) {
              return (
                <div 
                  className="my-8 overflow-x-auto bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-gray-100 shadow-xl flex justify-center"
                  dir="ltr"
                  {...props}
                >
                  {children}
                </div>
              );
            }
            return <div className={className} {...props}>{children}</div>;
          },
          span: ({ className, children, ...props }) => {
            if (className?.includes('math-inline')) {
              return (
                <span className="math-inline inline-block px-1.5 py-0.5 bg-gray-50 rounded font-serif text-primary" dir="ltr" {...props}>
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          }
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default LatexRenderer;
