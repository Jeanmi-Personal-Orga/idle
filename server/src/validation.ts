import { z } from 'zod';

// La longueur du mot de passe est le signal qui compte ; imposer des règles
// de complexité (majuscule/chiffre/symbole obligatoires) n'améliore pas
// vraiment la sécurité et complique l'expérience pour rien.
export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -."),
  email: z.string().email().max(255),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
