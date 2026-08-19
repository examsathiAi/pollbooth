const fs = require('fs');
const file = 'apps/admin/src/components/PollCreationPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Upgrade React imports to include useRef and useEffect for DOM manipulation
if (!code.includes('useRef')) {
    code = code.replace(/import \{ useMemo, useState \} from "react";/, 'import { useMemo, useState, useRef, useEffect } from "react";');
}

// 2. Build the Facebook-style Auto-Resizing Component
const autoResizeComponent = `
const AutoResizeTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [props.value]);

  return <textarea ref={ref} {...props} style={{ minHeight: '44px', overflow: 'hidden', resize: 'none', ...props.style }} />;
};
`;

// Inject the component just before CATEGORY_OPTIONS if it doesn't exist
if (!code.includes('AutoResizeTextarea')) {
    code = code.replace(/const CATEGORY_OPTIONS =/, autoResizeComponent + '\nconst CATEGORY_OPTIONS =');
}

// 3. Convert all standard textareas to the fluid AutoResizeTextarea
code = code.replace(/<textarea /g, '<AutoResizeTextarea ');
code = code.replace(/<\/textarea>/g, '</AutoResizeTextarea>');

// 4. Strip out the hardcoded 'rows={x}' attributes since the component now perfectly self-manages height
code = code.replace(/rows=\{\d+\}/g, 'rows={1}');

fs.writeFileSync(file, code);
console.log('✅ Enterprise UX Applied: Textareas are now completely fluid and auto-resizing.');
