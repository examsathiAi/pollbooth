import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ConsentService {
  async getUserConsents(userId: string) {
    const consents = await prisma.surveyConsent.findMany({
      where: { user_id: userId },
      include: { survey: true },
      orderBy: { consented_at: "desc" },
    });

    return consents.map((c) => ({
      id: c.id,
      partner_name: c.partner_name,
      survey_title: c.survey.survey_title,
      data_shared: c.data_shared,
      consented_at: c.consented_at,
      is_completed: c.is_completed,
      is_active: c.is_active,
      revoked_at: c.revoked_at,
    }));
  }

  async revokeConsent(userId: string, consentId: string) {
    const consent = await prisma.surveyConsent.findFirst({
      where: { id: consentId, user_id: userId },
    });

    if (!consent) {
      throw new Error("Consent not found");
    }

    await prisma.surveyConsent.update({
      where: { id: consentId },
      data: {
        is_active: false,
        revoked_at: new Date(),
      },
    });

    // In production: notify partner of revocation
    return { message: "Consent revoked successfully" };
  }

  async recordDPDPConsent(userId: string, ipAddress: string, userAgent: string) {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: "DPDP_CONSENT_GIVEN",
        entity_type: "USER",
        entity_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          purpose: "aggregated_research_analytics",
          retention_period: "7_years",
          rights: ["access", "correction", "erasure", "withdrawal"],
        },
      },
    });
  }
}

export const consentService = new ConsentService();
