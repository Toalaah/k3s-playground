-- CreateTable
CREATE TABLE "Count" (
    "id" SERIAL NOT NULL,
    "count" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Count_pkey" PRIMARY KEY ("id")
);
