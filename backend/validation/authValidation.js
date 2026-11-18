import { z } from "zod";

/**
 * Registration request body validation schema
 */
export const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required." })
      .trim()
      .min(2, "Name must be at least 2 characters long.")
      .max(50, "Name cannot exceed 50 characters."),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address."),
    password: z
      .string({ required_error: "Password is required." })
      .min(8, "Password must be at least 8 characters long.")
      .max(100, "Password cannot exceed 100 characters.")
      .regex(/[A-Za-z]/, "Password must contain at least one letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string({ required_error: "Please confirm your password." })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

/**
 * Login request body validation schema
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required.")
});
