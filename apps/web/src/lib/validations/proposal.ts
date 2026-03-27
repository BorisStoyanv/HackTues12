import * as z from "zod";

export const proposalSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(100, "Title cannot exceed 100 characters.")
    .regex(/^[a-zA-Z0-9\s\-_.,?!:]+$/, "Title contains invalid characters."),
  description: z
    .string()
    .min(20, "Please provide a slightly longer summary (min 20 chars).")
    .max(1000, "Description cannot exceed 1000 characters."),
  region_tag: z.string().min(1, "Region tag is required."),
  category: z.enum([
    "Infrastructure",
    "Marketing",
    "Events",
    "Conservation",
    "Education",
    "Technology",
    "Other"
  ]),
  budget_amount: z.number().min(1, "Budget must be greater than 0."),
  budget_currency: z.string().min(1, "Currency is required."),
  budget_breakdown: z.string().min(10, "Please provide a budget breakdown."),
  executor_name: z.string().min(2, "Executor name is required."),
  execution_plan: z.string().min(20, "Execution plan must be detailed (min 20 chars)."),
  timeline: z.string().min(1, "Timeline is required."),
  expected_impact: z.string().min(20, "Expected impact must be detailed (min 20 chars)."),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    formatted_address: z.string(),
    lat: z.number(),
    lng: z.number()
  }).optional(),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
