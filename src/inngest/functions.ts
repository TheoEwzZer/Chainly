import prisma from "@/lib/db";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    // Fetching the video
    await step.sleep("fetching-video", "2s");

    // Transcription
    await step.sleep("transcription", "2s");

    // Sending the transcription to the user
    await step.sleep("sending-transcription", "2s");

    await step.run("create-workflow", async () => {
      return prisma.workflow.create({
        data: { name: "workflow-from-inngest" },
      });
    });
  }
);
