import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { config } from "../../config";

const prisma = new PrismaClient();

export async function generatePollInsight(pollId: string) {
  if (!config.geminiApiKey) {
    console.error("[Journalist] Gemini API key missing.");
    return false;
  }

  try {
    // 1. Gather all required Poll Data
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        votes: {
          include: { user: { include: { profile: true } } }
        },
        opinions: {
          orderBy: { agree_count: 'desc' },
          take: 5,
          include: { user: { include: { profile: true } } }
        }
      }
    });

    if (!poll || poll.votes.length === 0) return false;

    // 2. Aggregate Demographics & Voting Stats
    const totalVotes = poll.votes.length;
    const optionCounts: Record<number, number> = {};
    const ageDemographics: Record<string, number> = {};
    const tierDemographics: Record<string, number> = {};

    poll.votes.forEach((vote) => {
      optionCounts[vote.option_index] = (optionCounts[vote.option_index] || 0) + 1;
      
      const age = vote.user?.profile?.age_bracket || "Unknown";
      ageDemographics[age] = (ageDemographics[age] || 0) + 1;

      const tier = vote.user?.city_tier || "Unknown";
      tierDemographics[tier] = (tierDemographics[tier] || 0) + 1;
    });

    const results = poll.options.map((opt, idx) => ({
      option: opt,
      percentage: ((optionCounts[idx] || 0) / totalVotes) * 100
    }));

    const topComments = poll.opinions.map(op => 
      `"${op.content}" (Agrees: ${op.agree_count}, Disagrees: ${op.disagree_count}) - User Demographic: ${op.user?.profile?.age_bracket || "Unknown Age"}, Tier: ${op.user?.city_tier || "Unknown"}`
    );

    // 3. Build the Data Journalist Prompt
    const prompt = `You are an elite data journalist and political analyst working for 'PollBooth Times'. 
Your task is to write a highly engaging, 3-4 minute read "Exit Poll Analysis" based on real user voting data, demographics, and comments.

POLL CONTEXT:
- Category: ${poll.category}
- Question: ${poll.question}
- Total Turnout: ${totalVotes} votes

RESULTS:
${JSON.stringify(results, null, 2)}

DEMOGRAPHICS SUMMARY:
- Age Brackets: ${JSON.stringify(ageDemographics)}
- City Tiers: ${JSON.stringify(tierDemographics)}

TOP USER COMMENTS:
${topComments.join("\n")}

MANDATE:
1. Write a punchy, click-worthy 'headline'.
2. Write the 'content' (3-4 paragraphs, roughly 400 words) in the style of Inshorts or Firstpost. Analyze *why* people voted the way they did. Call out interesting demographic splits (e.g., "Gen Z overwhelmingly favored X, while Tier 1 cities were split..."). Quote the provided user comments naturally. 
3. You MUST append this exact disclaimer at the very end of the 'content' string: 
   "<br><br><em>*Disclaimer: This analysis was AI-generated based on real-time platform voting data and public comments. It reflects user sentiment on PollBooth Times, not necessarily broader societal facts.</em>"
4. Summarize the key demographic takeaways in a short 'demographics_summary' object.

Return strictly valid JSON matching this schema:
{
  "headline": "string",
  "content": "string (HTML formatted with <p> and <strong> tags for readability)",
  "demographics_summary": {
    "key_takeaway": "string",
    "dominant_age_group": "string"
  }
}`;

    // 4. Request Generation from Gemini
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2500 }
      }),
    });

    if (!response.ok) throw new Error("Gemini API failed");

    const payload = await response.json() as any;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Empty Gemini response");

    const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanJson);

    // 5. Save to Database
    await prisma.pollInsight.create({
      data: {
        poll_id: pollId,
        headline: parsed.headline,
        content: parsed.content,
        demographics_summary: parsed.demographics_summary || {},
        is_published: true
      }
    });

    console.log(`[Journalist] Successfully generated insight for poll: ${pollId}`);
    return true;
  } catch (error) {
    console.error(`[Journalist] Failed to generate insight for ${pollId}:`, error);
    return false;
  }
}

export function startJournalistCron() {
  // Runs every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("[Journalist] Waking up to process yesterday's closed polls...");
    
    try {
      // Find polls that ended in the last 48 hours but don't have an insight yet
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const closedPolls = await prisma.poll.findMany({
        where: {
          end_date: {
            lte: new Date(),
            gte: fortyEightHoursAgo
          },
          poll_insight: null, // Ensure we don't duplicate work
          votes: { some: {} } // Must have at least 1 vote
        },
        select: { id: true }
      });

      console.log(`[Journalist] Found ${closedPolls.length} polls needing insights.`);

      for (const p of closedPolls) {
        await generatePollInsight(p.id);
        // Sleep for 3 seconds between LLM calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log("[Journalist] Cron job finished successfully.");
    } catch (error) {
      console.error("[Journalist] Cron job encountered an error:", error);
    }
  });
  
  console.log("[Journalist] AI Data Journalism Cron Job scheduled for 02:00 AM daily.");
}
