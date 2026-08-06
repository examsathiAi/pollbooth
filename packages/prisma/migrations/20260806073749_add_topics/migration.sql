-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "parent_category" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PollToTopic" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_slug_idx" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_parent_category_idx" ON "topics"("parent_category");

-- CreateIndex
CREATE UNIQUE INDEX "_PollToTopic_AB_unique" ON "_PollToTopic"("A", "B");

-- CreateIndex
CREATE INDEX "_PollToTopic_B_index" ON "_PollToTopic"("B");

-- AddForeignKey
ALTER TABLE "_PollToTopic" ADD CONSTRAINT "_PollToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PollToTopic" ADD CONSTRAINT "_PollToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
