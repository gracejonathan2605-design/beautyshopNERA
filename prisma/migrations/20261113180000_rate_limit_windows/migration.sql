CREATE TABLE "RateLimitWindow" (
    "key" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitWindow_windowStartedAt_idx"
ON "RateLimitWindow"("windowStartedAt");
