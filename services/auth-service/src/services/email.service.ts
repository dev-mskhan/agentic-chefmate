import type { Logger } from "@platform/logger";

export interface WelcomeEmailInput {
  userId: string;
  email: string;
  name: string;
}

export interface EmailService {
  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void>;
}

/**
 * Stub behind an interface: swapping in a real provider (SendGrid, Postmark,
 * SES, ...) later is a one-file change — nothing else in the codebase knows
 * how email is delivered.
 */
export function createEmailService(logger: Logger): EmailService {
  return {
    async sendWelcomeEmail(input) {
      logger.info(
        { userId: input.userId, email: input.email, name: input.name },
        "[stub] welcome email would be sent to user",
      );
    },
  };
}
