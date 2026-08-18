import { PrismaClient } from "@prisma/client";
import { generatePollInsight } from "./src/modules/ai/journalist.service";

const prisma = new PrismaClient();

async function run() {
  console.log("Searching for a poll with votes to analyze...");
  const poll = await prisma.poll.findFirst({
    where: { votes: { some: {} } },
    orderBy: { created_at: "desc" }
  });

  if (!poll) {
    console.log("No polls with votes found. Go vote on a poll first!");
    process.exit(0);
  }

  console.log(`Found Poll: "${poll.question}"`);
  console.log("Triggering AI Data Journalist (this takes 5-10 seconds)...");
  
  const success = await generatePollInsight(poll.id);
  
  if (success) {
    console.log("SUCCESS! Article generated and saved to database.");
  } else {
    console.log("FAILED. Check your Gemini API key and network.");
  }
}

run().finally(() => process.exit(0));
