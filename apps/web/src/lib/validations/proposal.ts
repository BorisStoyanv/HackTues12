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
  
  problem_statement: z.string().min(50, "Problem statement must be at least 50 characters."),
  success_metric: z.string().min(20, "Please define clear success metrics (min 20 chars)."),
  
  location: z.object({
    city: z.string().min(1, "City is required."),
    country: z.string().min(1, "Country is required."),
    formatted_address: z.string().min(1, "Address is required."),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  
  funding_goal: z.number().min(1000, "Minimum funding goal is $1,000.").max(100000000, "Funding goal exceeds maximum limit."),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
