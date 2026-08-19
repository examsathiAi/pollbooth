const fs = require('fs');
const file = 'apps/admin/src/components/PollCreationPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Ensure useEffect is imported
if (!code.includes('useEffect')) {
    code = code.replace(/import \{ useMemo, useState \}/, 'import { useMemo, useState, useEffect }');
}

// 2. Inject the DOM synchronizer immediately after your state variables
const target = 'const [topicTags, setTopicTags] = useState<string[]>([]);';
const resizerHook = `const [topicTags, setTopicTags] = useState<string[]>([]);

  // DOM Force: Auto-resize all textareas whenever AI populates data or user types
  useEffect(() => {
    // A micro-delay ensures React has finished painting the new text to the screen
    setTimeout(() => {
      document.querySelectorAll('textarea').forEach(el => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      });
    }, 10);
  }, [aiContent, question, options]);`;

if (code.includes(target) && !code.includes('document.querySelectorAll(\'textarea\')')) {
    code = code.replace(target, resizerHook);
    fs.writeFileSync(file, code);
    console.log("✅ UI Synced: Textareas will now snap open instantly when AI data arrives.");
} else {
    console.log("⚠️ Target state not found or hook already injected.");
}
