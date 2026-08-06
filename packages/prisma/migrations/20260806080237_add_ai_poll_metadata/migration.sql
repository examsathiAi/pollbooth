/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `polls` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "facebook_caption" TEXT,
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "hashtags" TEXT[],
ADD COLUMN     "instagram_caption" TEXT,
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "meta_description" VARCHAR(160),
ADD COLUMN     "og_description" TEXT,
ADD COLUMN     "og_title" VARCHAR(60),
ADD COLUMN     "seo_title" VARCHAR(60),
ADD COLUMN     "slug" VARCHAR(100),
ADD COLUMN     "whatsapp_share_text" TEXT,
ADD COLUMN     "x_caption" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "polls_slug_key" ON "polls"("slug");
