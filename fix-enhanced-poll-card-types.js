const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Check if slug is already in the interface definition
if (!code.includes('slug?:')) {
  // Inject slug and hashtags into the poll interface prop
  code = code.replace(
    /total_opinions:\s*number;/,
    'total_opinions: number;\n    slug?: string | null;\n    hashtags?: string[] | null;\n    whatsapp_share_text?: string | null;\n    x_caption?: string | null;\n    facebook_caption?: string | null;\n    instagram_caption?: string | null;'
  );
  fs.writeFileSync(file, code);
  console.log("✅ EnhancedPollCard TypeScript interface patched with SEO and social properties.");
} else {
  console.log("⚠️ Properties already exist in interface.");
}
