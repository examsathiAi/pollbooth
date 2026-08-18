import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed badges
  const badges = [
    { code: "FIRST_VOTE", name: "First Vote", description: "Cast your first vote on PollBooth", criteria_type: "VOTE_COUNT", criteria_value: 1 },
    { code: "CONSISTENT_VOICE", name: "Consistent Voice", description: "7-day vote streak", criteria_type: "STREAK_DAYS", criteria_value: 7 },
    { code: "POLLBOOTH_PATRIOT", name: "PollBooth Patriot", description: "30-day vote streak", criteria_type: "STREAK_DAYS", criteria_value: 30 },
    { code: "VOICE_OF_GEN_Z", name: "Voice of Gen Z", description: "100 votes as 18-24", criteria_type: "VOTE_COUNT_AGE", criteria_value: 100 },
    { code: "TOP_1_PERCENT", name: "Top 1% Voter", description: "Top 1% by vote count this month", criteria_type: "TOP_PERCENTILE", criteria_value: 1 },
    { code: "NOSTRADAMUS", name: "Nostradamus", description: "10 correct predictions", criteria_type: "PREDICTION_COUNT", criteria_value: 10 },
    { code: "POLLBOOTH_INSIDER", name: "PollBooth Insider", description: "100% profile complete", criteria_type: "PROFILE_COMPLETE", criteria_value: 100 },
    { code: "SURVEY_STAR", name: "Survey Star", description: "Complete 5 paid surveys", criteria_type: "SURVEY_COUNT", criteria_value: 5 },
    { code: "LOCAL_LEADER", name: "Local Leader", description: "Top voter in your city", criteria_type: "TOP_CITY_VOTER", criteria_value: 1 },
    { code: "COMMUNITY_CURATOR", name: "Community Curator", description: "Survey suggestion approved by admin", criteria_type: "SUGGESTION_APPROVED", criteria_value: 1 },
    { code: "VOICE_OF_WEEK", name: "Voice of the Week", description: "Most-agreed opinion in a category", criteria_type: "TOP_OPINION_WEEK", criteria_value: 1 },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }

  const adminPhone = "+919876543222";
  const adminPhoneHash = await bcrypt.hash(adminPhone.trim().toLowerCase(), 12);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ phone_hash: adminPhoneHash }, { phone_number: adminPhone }],
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        phone_hash: adminPhoneHash,
        phone_number: adminPhone,
        username: "pollbooth_admin",
        role: "SUPER_ADMIN",
        is_active: true,
      },
    });
  } else {
    const existingUsername = await prisma.user.findUnique({ where: { username: "pollbooth_admin" } });
    if (existingUsername) {
      await prisma.user.update({
        where: { id: existingUsername.id },
        data: {
          phone_hash: adminPhoneHash,
          phone_number: adminPhone,
          role: "SUPER_ADMIN",
          is_active: true,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          phone_hash: adminPhoneHash,
          phone_number: adminPhone,
          username: "pollbooth_admin",
          role: "SUPER_ADMIN",
          is_active: true,
        },
      });
    }
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
