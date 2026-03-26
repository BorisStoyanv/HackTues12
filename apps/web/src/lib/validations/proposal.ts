import * as z from "zod";

export const proposalSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters.")
    .max(100, "Title cannot exceed 100 characters.")
    .regex(/^[a-zA-Z0-9\s\-_.,?!:]+$/, "Title contains invalid characters."),
  short_description: z
    .string()
    .min(20, "Please provide a slightly longer summary (min 20 chars).")
    .max(200, "Summary cannot exceed 200 characters."),
  category: z.string().min(1, "Please select a category."),
  
  location: z.object({
    city: z.string().min(1, "City is required."),
    country: z.string().min(1, "Country is required."),
    address: z.string().min(1, "Specific address or region is required."),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  
  data_pack: z.object({
    problem_statement: z.string().min(50, "Problem statement must be at least 50 characters."),
    proposed_solution: z.string().min(50, "Proposed solution must be at least 50 characters."),
    success_metrics: z.string().min(20, "Please define clear success metrics (min 20 chars)."),
  }),
  
  funding_goal: z.number().min(1000, "Minimum funding goal is $1,000.").max(100000000, "Funding goal exceeds maximum limit."),
  estimated_duration_months: z.number().min(1, "Duration must be at least 1 month.").max(120, "Duration cannot exceed 120 months (10 years)."),
}).refine(
  (data) => {
    // If funding goal is > $1M, duration should probably be at least 6 months
    if (data.funding_goal > 1000000 && data.estimated_duration_months < 6) {
      return false;
    }
    return true;
  },
  {
    message: "A project requiring over $1,000,000 typically needs a duration of at least 6 months.",
    path: ["estimated_duration_months"],
  }
);

export type ProposalFormValues = z.infer<typeof proposalSchema>;
