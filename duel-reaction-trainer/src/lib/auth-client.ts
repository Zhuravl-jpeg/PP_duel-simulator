import { createAuthClient } from "better-auth/react";

/**
 * Клиент для Better Auth
 * Использует React-хуки для работы с авторизацией
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;