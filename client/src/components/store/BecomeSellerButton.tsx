import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import type { AccountRole, SellerApplicationStatus } from "../../../../drizzle/schema";

export function BecomeSellerButton({
  role,
  applicationStatus,
}: {
  role: AccountRole;
  applicationStatus: SellerApplicationStatus | null;
}) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const activation = trpc.account.becomeSeller.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.account.me.invalidate(), utils.auth.me.invalidate()]);
      if (result.status === "requested") return;
      await utils.seller.dashboard.invalidate();
      navigate("/seller");
    },
  });

  if (applicationStatus === "rejected" || applicationStatus === "suspended") {
    return <p className="portal-error" role="status">
      {applicationStatus === "suspended"
        ? "Seller access is paused. Contact NaijaKoblas support to request reinstatement."
        : "Seller access was previously declined. Contact NaijaKoblas support if you believe this is an error."}
    </p>;
  }
  if (role === "seller" && applicationStatus === "approved") {
    return <Link href="/seller" className="button button--dark">Open seller workspace <ArrowRight size={17} /></Link>;
  }
  if (role === "seller" && applicationStatus === null) {
    return <p className="portal-error" role="status">The seller account record is incomplete. Contact NaijaKoblas support before continuing.</p>;
  }
  if (role === "customer" && applicationStatus === "pending") {
    return <p className="portal-note" role="status">Your seller request has been sent. An administrator will review it, and you'll get a notification when it's approved.</p>;
  }
  if (role !== "customer" && !(role === "seller" && applicationStatus === "pending")) {
    return <p className="portal-note">Administrator and staff roles cannot be changed through seller self-service.</p>;
  }

  return <div className="seller-activation-action">
    <button className="button button--dark" type="button" disabled={activation.isPending} onClick={() => activation.mutate()}>
      {activation.isPending ? "Sending request…" : "Request seller access"}<ArrowRight size={17} />
    </button>
    <small>An administrator reviews each request. Once approved, your seller workspace opens and you can add products.</small>
    {activation.error && <p className="portal-error" role="alert">{activation.error.message}</p>}
  </div>;
}
