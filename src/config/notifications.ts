import { brand } from "./brand";

/**
 * Owner-only email notifications (D-43). Nothing here is sent to learners: learner-facing email is
 * still undecided (OA-25).
 */
export const notifications = {
  owner: {
    /**
     * Where the owner's alerts go. It must be the address the Resend account was created with:
     * until a domain is verified in Resend (OA-06), the shared `onboarding@resend.dev` sender can
     * only deliver to the account owner's own mailbox, and any other recipient is refused.
     */
    email: "marcelopisner@gmail.com",
    /** Resend's shared test sender; replace with an address on the verified domain later. */
    from: `${brand.shortName} <onboarding@resend.dev>`,
  },
} as const;
