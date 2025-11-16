-- CreateTable
CREATE TABLE "execution_step" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT,
    "nodeName" TEXT NOT NULL,
    "nodeType" "NodeType" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "order" INTEGER NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "errorStack" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "execution_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "execution_step_executionId_idx" ON "execution_step"("executionId");

-- CreateIndex
CREATE INDEX "execution_step_nodeId_idx" ON "execution_step"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "executionId_order" ON "execution_step"("executionId", "order");

-- AddForeignKey
ALTER TABLE "execution_step" ADD CONSTRAINT "execution_step_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_step" ADD CONSTRAINT "execution_step_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

