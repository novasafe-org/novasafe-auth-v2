import { createFileRoute } from "@tanstack/react-router";
import { AuthFlow } from "@/components/novasafe/AuthFlow";

export const Route = createFileRoute("/")({
  component: AuthFlow,
  head: () => ({
    meta: [
      { title: "NovaSafe — Your digital vault" },
      { name: "description", content: "NovaSafe is the AI-powered, zero-knowledge identity vault for the next decade of digital security." },
    ],
  }),
});
