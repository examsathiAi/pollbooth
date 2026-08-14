import cron from "node-cron";
import { prisma } from "../../config/database";
import { config } from "../../config";

export async function runAutoModerator() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    // 1. Fetch pending opinions created in the last 2 hours
    const pendingOpinions = await prisma.opinion.findMany({
      where: {
        created_at: { gte: twoHoursAgo },
        moderation_status: "PENDING",
      },
      select: { id: true, content: true, user_id: true }
    });

    if (pendingOpinions.length === 0) return;

    // 2. Batch format for Gemini prompt to preserve token context
    const batch = pendingOpinions.map(o => ({ id: o.id, content: o.content }));

    const prompt = `You are a strict AI safety moderator for a public forum.
Analyze the following JSON array of user comments.
Identify any comments containing foul, abusive, highly toxic, hate speech, or explicitly sexual language.
Return STRICTLY a JSON array of strings containing ONLY the 'id' of the flagged comments. Do not include markdown formatting, explanations, or any other text.
If no comments violate the rules, return an empty array: []

Input: ${JSON.stringify(batch)}`;

    // 3. Execute LLM Evaluation (Replicating exact logic from ai.service.ts)
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
      })
    });

    if (!response.ok) throw new Error("Auto-Moderator Gemini API request failed");

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    let flaggedIds: string[] = [];
    try {
      flaggedIds = JSON.parse(cleanJson);
    } catch {
      console.error("Auto-Moderator failed to parse JSON from LLM:", cleanJson);
      return;
    }

    if (!Array.isArray(flaggedIds) || flaggedIds.length === 0) return;

    // 4. Enforce Moderation & Issue Strikes
    const flaggedOpinions = pendingOpinions.filter(o => flaggedIds.includes(o.id));

    for (const opinion of flaggedOpinions) {
      // Hide the comment from the public feed
      await prisma.opinion.update({
        where: { id: opinion.id },
        data: {
          is_hidden: true,
          moderation_status: "FLAGGED"
        }
      });

      // Issue a strike to the user profile
      await prisma.userModerationStatus.upsert({
        where: { user_id: opinion.user_id },
        update: {
          warning_count: { increment: 1 },
          last_warning_at: new Date()
        },
        create: {
          user_id: opinion.user_id,
          warning_count: 1,
          last_warning_at: new Date()
        }
      });

      // Dispatch DPDP/Platform warning notification to the user
      await prisma.notification.create({
        data: {
          user_id: opinion.user_id,
          type: "MODERATION_WARNING",
          title: "Content Policy Violation",
          body: "Your recent comment was flagged by our automated safety systems for inappropriate language and has been hidden. Further violations may result in a ban.",
          data: { opinion_id: opinion.id },
          is_read: false
        }
      });
    }

    console.log(`[SYSTEM] Auto-Moderator completed. Flagged ${flaggedOpinions.length} toxic comments.`);
  } catch (err) {
    console.error("[SYSTEM] Auto-Moderation cron job encountered a critical error:", err);
  }
}

// Initialize the 2-Hour Cron Schedule (Runs at minute 0 past every 2nd hour)
export function initAutoModeratorCron() {
  cron.schedule("0 */2 * * *", () => {
    console.log("[SYSTEM] Waking up AI Auto-Moderator...");
    runAutoModerator();
  });
}