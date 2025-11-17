import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow, publishNodeStatusUpdate } from "@/inngest/functions";
import { checkSchedules } from "@/inngest/functions-schedule";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeWorkflow, checkSchedules, publishNodeStatusUpdate],
});
