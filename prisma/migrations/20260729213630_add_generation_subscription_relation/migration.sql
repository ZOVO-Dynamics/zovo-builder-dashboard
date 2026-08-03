-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
