import { TRPCError } from "@trpc/server";
import type { AccountRole, SellerApplicationStatus, User } from "../../drizzle/schema";

export type Capability =
  | "account:read"
  | "seller:apply"
  | "seller:dashboard"
  | "seller:review"
  | "staff:manage"
  | "admin:manage";

const capabilitiesByRole: Record<AccountRole, readonly Capability[]> = {
  customer: ["account:read", "seller:apply"],
  seller: ["account:read", "seller:dashboard"],
  staff: ["account:read", "seller:review", "staff:manage"],
  // Admins can also run their own store (seller:dashboard still requires an approved application).
  admin: ["account:read", "seller:dashboard", "seller:review", "staff:manage", "admin:manage"],
};

const sellerApplicationTransitions: Record<SellerApplicationStatus, readonly SellerApplicationStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["suspended"],
  rejected: [],
  suspended: ["approved"],
};

export function canBootstrapInitialAdmin(input: {
  configuredOwnerClerkUserId: string;
  authenticatedClerkUserId: string;
  bootstrapExists: boolean;
  administratorExists: boolean;
  ownerRole: AccountRole | null;
}) {
  return Boolean(input.configuredOwnerClerkUserId)
    && input.configuredOwnerClerkUserId === input.authenticatedClerkUserId
    && !input.bootstrapExists
    && !input.administratorExists
    && input.ownerRole === "customer";
}

export const isAccountRole = (value: unknown): value is AccountRole =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(capabilitiesByRole, value);

export function hasCapability(user: Pick<User, "role">, capability: Capability) {
  const capabilities = isAccountRole(user.role) ? capabilitiesByRole[user.role] : [];
  return capabilities.includes(capability);
}

export function canTransitionSellerApplication(from: SellerApplicationStatus, to: SellerApplicationStatus) {
  return sellerApplicationTransitions[from].includes(to);
}

/** Roles that can own a store: sellers, and admins who opened their own store. */
export const STORE_OWNER_ROLES = ["seller", "admin"] as const satisfies readonly AccountRole[];
export const isStoreOwnerRole = (role: AccountRole | null | undefined) =>
  role === "seller" || role === "admin";

export function canAccessSellerFulfillment(role: AccountRole, applicationStatus: SellerApplicationStatus | null) {
  return role === "seller"
    || (role === "admin" && applicationStatus === "approved")
    || (role === "customer" && applicationStatus === "suspended");
}

export function requireCapability(user: User | null, capability: Capability) {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  if (!hasCapability(user, capability)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this action." });
  }
}

export function requireRole(user: User | null, roles: readonly AccountRole[]) {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  if (!isAccountRole(user.role) || !roles.includes(user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this action." });
  }
}

export function requireOwnership(actorUserId: number, ownerUserId: number) {
  if (actorUserId !== ownerUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission for this resource." });
  }
}
