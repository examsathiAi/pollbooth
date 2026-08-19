const fs = require('fs');
const file = 'apps/admin/src/components/PollCreationPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the buggy custom React component
code = code.replace(/const AutoResizeTextarea = [\s\S]*?};\n/, '');
code = code.replace(/<AutoResizeTextarea/g, '<textarea');
code = code.replace(/<\/AutoResizeTextarea>/g, '</textarea>');

// 2. Inject the native DOM onInput resizer directly into all textareas
const onInputLogic = `onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}`;

// Apply it if it hasn't been applied yet
if (!code.includes('onInput={')) {
    code = code.replace(/<textarea /g, `<textarea ${onInputLogic} `);
}

fs.writeFileSync(file, code);
console.log("✅ Admin Textareas fixed: Native DOM auto-resizing applied.");
