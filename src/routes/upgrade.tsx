import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { buildProUrl } from "@/config";

/**
 * Legacy `/upgrade` URL — redirects to `/pro` preserving query parameters.
 */

const upgradeSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

export const Route = createFileRoute("/upgrade")({
  validateSearch: (search) => upgradeSearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      href: buildProUrl({ next: search.next, ref: search.ref }),
      replace: true,
    });
  },
});
