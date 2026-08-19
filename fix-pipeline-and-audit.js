const fs = require('fs');
const cp = require('child_process');

console.log('--- 1. PATCHING STANDARD FEED COMPONENT ---');
const pcFile = 'apps/web/src/components/feed/PollCard.tsx';
if (fs.existsSync(pcFile)) {
  let pcCode = fs.readFileSync(pcFile, 'utf8');
  
  // Inject the captions, hashtags, and premium AI slug into the standard feed ShareCardGenerator
  if (!pcCode.includes('captions={{')) {
    const shareReplacement = `<ShareCardGenerator
            title={poll.question}
            headline={poll.results?.[0] ? \`\${poll.results[0].option} leads with \${poll.results[0].percentage}%\` : "Latest poll result"}
            subtitle={\`\${poll.total_votes?.toLocaleString()} votes • \${cohort} cohort\`}
            voteCount={poll.total_votes}
            resultData={poll.results?.map((result) => ({ label: result.option, value: result.percentage }))}
            shareUrl={\`\${typeof window !== "undefined" ? window.location.origin : ""}/poll/\${poll.slug || poll.id}\`}
            hashtags={poll.hashtags || []}
            captions={{
              whatsapp: poll.whatsapp_share_text || undefined,
              x: poll.x_caption || undefined,
              facebook: poll.facebook_caption || undefined,
              instagram: poll.instagram_caption || undefined
            }}
          />`;
    
    pcCode = pcCode.replace(/<ShareCardGenerator[\s\S]*?\/>/, shareReplacement);
    fs.writeFileSync(pcFile, pcCode);
    console.log('✅ Frontend Feed (PollCard.tsx): Social payloads and AI Slug linked.');
  } else {
    console.log('✅ Frontend Feed (PollCard.tsx): Already linked.');
  }
} else {
  console.log('⚠️ PollCard.tsx not found in expected directory.');
}

console.log('\n--- 2. LOCATING THE BROKEN SUBMISSION FORM ---');
try {
  // Find the exact file responsible for the "Launch Poll" action
  const output = cp.execSync('grep -rnw "apps/web/src" -e "Launch Poll" | grep ".tsx" | grep -v "node_modules"').toString();
  console.log(output);
} catch(e) {
  console.log("Could not find the 'Launch Poll' component.");
}
