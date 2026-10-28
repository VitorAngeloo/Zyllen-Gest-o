-- Preserve the first confirmed date before rescheduling. Existing history is not guessed.
ALTER TABLE "ProjectService" ADD COLUMN "originalScheduledStartAt" TIMESTAMP(3);
