const fs = require('fs');

// --- 1. BACKEND: Allow the Zod Schema to accept the social/SEO payloads ---
const typesFile = 'apps/api/src/modules/polls/polls.types.ts';
if (fs.existsSync(typesFile)) {
  let typesCode = fs.readFileSync(typesFile, 'utf8');
  if (!typesCode.includes('facebook_caption:')) {
    const newTypes = `ai_summary: z.string().optional(),
  slug: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  facebook_caption: z.string().optional(),
  instagram_caption: z.string().optional(),
  x_caption: z.string().optional(),
  whatsapp_share_text: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),`;
    
    typesCode = typesCode.replace(/ai_summary:\s*z\.string\(\)\.optional\(\),/, newTypes);
    fs.writeFileSync(typesFile, typesCode);
    console.log('Backend Types: Social and SEO fields linked.');
  }
}

// --- 2. BACKEND: Instruct the Service to save the payloads to PostgreSQL ---
const serviceFile = 'apps/api/src/modules/polls/polls.service.ts';
if (fs.existsSync(serviceFile)) {
  let serviceCode = fs.readFileSync(serviceFile, 'utf8');
  if (!serviceCode.includes('facebook_caption:')) {
    const newService = `ai_summary: input.ai_summary,
        slug: input.slug,
        hashtags: input.hashtags,
        keywords: input.keywords,
        facebook_caption: input.facebook_caption,
        instagram_caption: input.instagram_caption,
        x_caption: input.x_caption,
        whatsapp_share_text: input.whatsapp_share_text,
        og_title: input.og_title,
        og_description: input.og_description,`;
    
    serviceCode = serviceCode.replace(/ai_summary:\s*input\.ai_summary,/, newService);
    fs.writeFileSync(serviceFile, serviceCode);
    console.log('Backend Service: Database persistence linked.');
  }
}

// --- 3. FRONTEND: Wire up Instagram and prioritize the AI Slug ---
const epcFile = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
if (fs.existsSync(epcFile)) {
  let epcCode = fs.readFileSync(epcFile, 'utf8');
  
  // Prioritize the premium AI slug over manual calculation
  if (!epcCode.includes('if (poll.slug) return poll.slug;')) {
    epcCode = epcCode.replace(/if\s*\(poll\.hashtags\s*&&\s*poll\.hashtags\.length\s*>\s*0\)\s*\{/, 'if (poll.slug) return poll.slug;\n    if (poll.hashtags && poll.hashtags.length > 0) {');
  }
  
  // Inject the missing Instagram caption prop
  if (!epcCode.includes('instagram: poll.instagram_caption')) {
    epcCode = epcCode.replace(/facebook:\s*poll\.facebook_caption\s*\|\|\s*undefined/, 'facebook: poll.facebook_caption || undefined,\n              instagram: poll.instagram_caption || undefined');
  }
  fs.writeFileSync(epcFile, epcCode);
  console.log('Frontend Feed: AI Slug and Instagram UI linked.');
}

// --- 4. FRONTEND: Update the Canonical Enforcer to strictly use the AI Slug ---
const pdcFile = 'apps/web/src/components/poll/PollDetailClient.tsx';
if (fs.existsSync(pdcFile)) {
  let pdcCode = fs.readFileSync(pdcFile, 'utf8');
  if (!pdcCode.includes('let slug = poll.slug || "";')) {
    pdcCode = pdcCode.replace(/let slug = "";/, 'let slug = poll.slug || "";');
    pdcCode = pdcCode.replace(/if\s*\(poll\.hashtags\s*&&\s*poll\.hashtags\.length\s*>\s*0\)\s*\{/, 'if (!slug && poll.hashtags && poll.hashtags.length > 0) {');
    pdcCode = pdcCode.replace(/\} else \{/, '} else if (!slug) {');
    fs.writeFileSync(pdcFile, pdcCode);
    console.log('Frontend Detail: Canonical Address Bar Enforcer upgraded.');
  }
}

console.log('End-to-End Virality Bridge deployment complete.');
