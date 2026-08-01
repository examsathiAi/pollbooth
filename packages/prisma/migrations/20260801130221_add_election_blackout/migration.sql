-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_hash" TEXT NOT NULL,
    "phone_number" VARCHAR(20),
    "username" VARCHAR(50),
    "avatar_url" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "city_tier" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "referral_code" VARCHAR(20),
    "referred_by" UUID,
    "last_active_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "age_bracket" VARCHAR(20),
    "gender" VARCHAR(20),
    "education" VARCHAR(50),
    "income_bracket" VARCHAR(50),
    "employment" VARCHAR(50),
    "vehicle" VARCHAR(50),
    "diet" VARCHAR(50),
    "streaming_platforms" TEXT[],
    "shopping_pref" VARCHAR(50),
    "completed_percentage" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "category" VARCHAR(50) NOT NULL,
    "sub_category" VARCHAR(50),
    "sponsor_id" UUID,
    "is_commercial" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "target_filters" JSONB,
    "estimated_reach" INTEGER,
    "methodology" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_blackouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "region" TEXT NOT NULL,
    "polling_date" TIMESTAMP(3) NOT NULL,
    "blackout_starts" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_blackouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_poll_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "is_seen" BOOLEAN NOT NULL DEFAULT false,
    "is_voted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_poll_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "option_index" INTEGER NOT NULL,
    "voted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "poll_id" UUID NOT NULL,
    "option_index" INTEGER NOT NULL,
    "voted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" VARCHAR(255),
    "user_agent" TEXT,
    "converted_user_id" UUID,
    "converted_at" TIMESTAMP(6),

    CONSTRAINT "guest_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opinions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "content" VARCHAR(280) NOT NULL,
    "agree_count" INTEGER NOT NULL DEFAULT 0,
    "disagree_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "moderation_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "edited_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "opinions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opinion_reactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opinion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reaction_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opinion_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_moderation_status" (
    "user_id" UUID NOT NULL,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "last_warning_at" TIMESTAMP(6),
    "comment_banned_until" TIMESTAMP(6),
    "is_permanently_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_moderation_status_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "opinion_id" UUID,
    "action_type" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "triggered_by" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opinion_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "criteria_type" VARCHAR(50) NOT NULL,
    "criteria_value" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shared_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "question_text" VARCHAR(200) NOT NULL,
    "context" TEXT,
    "target_region" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(6),

    CONSTRAINT "survey_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civic_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "poll_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(6),

    CONSTRAINT "civic_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_name" VARCHAR(100) NOT NULL,
    "partner_logo" TEXT,
    "survey_title" TEXT NOT NULL,
    "survey_description" TEXT,
    "target_criteria" JSONB,
    "incentive_amount" INTEGER NOT NULL,
    "pulse_referral_fee" INTEGER NOT NULL,
    "survey_url" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "sample_size_needed" INTEGER NOT NULL,
    "sample_size_completed" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_medical" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "partner_name" VARCHAR(100) NOT NULL,
    "consented_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_shared" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(6),

    CONSTRAINT "survey_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_earnings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID,
    "amount" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "razorpay_subscription_id" VARCHAR(100),
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "cancelled_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poll_id" UUID,
    "ad_type" VARCHAR(50) NOT NULL,
    "client_name" VARCHAR(100),
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "amount_paid" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_digests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(6),
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_engagements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "poll_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_streaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_vote_date" DATE,
    "recovery_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "vote_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_hash_key" ON "users"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_phone_hash_idx" ON "users"("phone_hash");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_is_banned_idx" ON "users"("is_banned");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_city_idx" ON "users"("city");

-- CreateIndex
CREATE INDEX "users_state_idx" ON "users"("state");

-- CreateIndex
CREATE INDEX "polls_category_idx" ON "polls"("category");

-- CreateIndex
CREATE INDEX "polls_is_active_idx" ON "polls"("is_active");

-- CreateIndex
CREATE INDEX "polls_status_idx" ON "polls"("status");

-- CreateIndex
CREATE INDEX "polls_is_commercial_idx" ON "polls"("is_commercial");

-- CreateIndex
CREATE INDEX "polls_created_at_idx" ON "polls"("created_at");

-- CreateIndex
CREATE INDEX "polls_start_date_end_date_idx" ON "polls"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "user_poll_assignments_user_id_expires_at_idx" ON "user_poll_assignments"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "user_poll_assignments_poll_id_idx" ON "user_poll_assignments"("poll_id");

-- CreateIndex
CREATE INDEX "user_poll_assignments_is_seen_idx" ON "user_poll_assignments"("is_seen");

-- CreateIndex
CREATE UNIQUE INDEX "user_poll_assignments_user_id_poll_id_key" ON "user_poll_assignments"("user_id", "poll_id");

-- CreateIndex
CREATE INDEX "votes_poll_id_idx" ON "votes"("poll_id");

-- CreateIndex
CREATE INDEX "votes_voted_at_idx" ON "votes"("voted_at");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_poll_id_key" ON "votes"("user_id", "poll_id");

-- CreateIndex
CREATE INDEX "guest_votes_session_id_idx" ON "guest_votes"("session_id");

-- CreateIndex
CREATE INDEX "guest_votes_poll_id_idx" ON "guest_votes"("poll_id");

-- CreateIndex
CREATE INDEX "guest_votes_converted_user_id_idx" ON "guest_votes"("converted_user_id");

-- CreateIndex
CREATE INDEX "guest_votes_voted_at_idx" ON "guest_votes"("voted_at");

-- CreateIndex
CREATE INDEX "opinions_poll_id_agree_count_idx" ON "opinions"("poll_id", "agree_count");

-- CreateIndex
CREATE INDEX "opinions_poll_id_created_at_idx" ON "opinions"("poll_id", "created_at");

-- CreateIndex
CREATE INDEX "opinions_moderation_status_created_at_idx" ON "opinions"("moderation_status", "created_at");

-- CreateIndex
CREATE INDEX "opinions_is_hidden_idx" ON "opinions"("is_hidden");

-- CreateIndex
CREATE UNIQUE INDEX "opinions_user_id_poll_id_key" ON "opinions"("user_id", "poll_id");

-- CreateIndex
CREATE INDEX "opinion_reactions_opinion_id_idx" ON "opinion_reactions"("opinion_id");

-- CreateIndex
CREATE INDEX "opinion_reactions_user_id_idx" ON "opinion_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "opinion_reactions_opinion_id_user_id_key" ON "opinion_reactions"("opinion_id", "user_id");

-- CreateIndex
CREATE INDEX "moderation_actions_user_id_idx" ON "moderation_actions"("user_id");

-- CreateIndex
CREATE INDEX "moderation_actions_opinion_id_idx" ON "moderation_actions"("opinion_id");

-- CreateIndex
CREATE INDEX "moderation_actions_created_at_idx" ON "moderation_actions"("created_at");

-- CreateIndex
CREATE INDEX "reports_opinion_id_idx" ON "reports"("opinion_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "survey_suggestions_status_idx" ON "survey_suggestions"("status");

-- CreateIndex
CREATE INDEX "survey_suggestions_user_id_idx" ON "survey_suggestions"("user_id");

-- CreateIndex
CREATE INDEX "survey_suggestions_created_at_idx" ON "survey_suggestions"("created_at");

-- CreateIndex
CREATE INDEX "civic_issues_status_idx" ON "civic_issues"("status");

-- CreateIndex
CREATE INDEX "civic_issues_city_idx" ON "civic_issues"("city");

-- CreateIndex
CREATE INDEX "civic_issues_state_idx" ON "civic_issues"("state");

-- CreateIndex
CREATE INDEX "civic_issues_created_at_idx" ON "civic_issues"("created_at");

-- CreateIndex
CREATE INDEX "partner_surveys_is_active_idx" ON "partner_surveys"("is_active");

-- CreateIndex
CREATE INDEX "partner_surveys_is_medical_idx" ON "partner_surveys"("is_medical");

-- CreateIndex
CREATE INDEX "survey_consents_user_id_idx" ON "survey_consents"("user_id");

-- CreateIndex
CREATE INDEX "survey_consents_survey_id_idx" ON "survey_consents"("survey_id");

-- CreateIndex
CREATE INDEX "survey_consents_is_active_idx" ON "survey_consents"("is_active");

-- CreateIndex
CREATE INDEX "user_earnings_user_id_idx" ON "user_earnings"("user_id");

-- CreateIndex
CREATE INDEX "user_earnings_status_idx" ON "user_earnings"("status");

-- CreateIndex
CREATE INDEX "user_earnings_created_at_idx" ON "user_earnings"("created_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "ad_placements_is_active_idx" ON "ad_placements"("is_active");

-- CreateIndex
CREATE INDEX "ad_placements_poll_id_idx" ON "ad_placements"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_digests_date_key" ON "daily_digests"("date");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "user_engagements_user_id_created_at_idx" ON "user_engagements"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_engagements_poll_id_idx" ON "user_engagements"("poll_id");

-- CreateIndex
CREATE INDEX "user_engagements_action_idx" ON "user_engagements"("action");

-- CreateIndex
CREATE UNIQUE INDEX "vote_streaks_user_id_key" ON "vote_streaks"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocker_id_idx" ON "user_blocks"("blocker_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_poll_assignments" ADD CONSTRAINT "user_poll_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_poll_assignments" ADD CONSTRAINT "user_poll_assignments_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_votes" ADD CONSTRAINT "guest_votes_converted_user_id_fkey" FOREIGN KEY ("converted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_votes" ADD CONSTRAINT "guest_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_reactions" ADD CONSTRAINT "opinion_reactions_opinion_id_fkey" FOREIGN KEY ("opinion_id") REFERENCES "opinions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_reactions" ADD CONSTRAINT "opinion_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_moderation_status" ADD CONSTRAINT "user_moderation_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_opinion_id_fkey" FOREIGN KEY ("opinion_id") REFERENCES "opinions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_suggestions" ADD CONSTRAINT "survey_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_consents" ADD CONSTRAINT "survey_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_consents" ADD CONSTRAINT "survey_consents_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "partner_surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_earnings" ADD CONSTRAINT "user_earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_engagements" ADD CONSTRAINT "user_engagements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_engagements" ADD CONSTRAINT "user_engagements_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
