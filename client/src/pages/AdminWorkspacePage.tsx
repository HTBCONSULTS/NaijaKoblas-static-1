import { lazy, Suspense, useState, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Store,
  X,
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
  ShieldCheck,
  Tags,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { money } from "@/store";

const AdminProductManagementPage = lazy(() => import("./admin/ProductManagementPage").then(module => ({ default: module.AdminProductManagementPage })));
const AdminOverviewPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminOverviewPage })));
const AdminOrdersPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminOrdersPage })));
const AdminCustomersPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminCustomersPage })));
const AdminCategoriesPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminCategoriesPage })));
const AdminAnalyticsPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminAnalyticsPage })));
const AdminSettingsPage = lazy(() => import("./admin/OperationsPages").then(module => ({ default: module.AdminSettingsPage })));
const AdminDashboardPage = lazy(() => import("./AccountPages").then(module => ({ default: module.AdminDashboardPage })));

const sections = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Orders", href: "/admin/orders", icon: CreditCard },
  { label: "Sellers", href: "/admin/sellers", icon: Store },
  { label: "Customers", href: "/admin/customers", icon: UsersRound },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Audit log", href: "/admin/audit", icon: Activity },
  { label: "Contact inbox", href: "/admin/contact", icon: Mail },
  { label: "Access & payments", href: "/admin/operations", icon: ShieldCheck },
] as const;

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function AdminSectionShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const account = trpc.auth.me.useQuery(undefined, { retry: false });
  const active = sections.find(item => location === item.href
    || (item.href === "/admin/products" && (location.startsWith("/admin/catalog") || location.startsWith("/admin/products")))) ?? sections[0]!;
  const initials = (account.data?.name ?? account.data?.email ?? "Admin").trim().slice(0, 2).toUpperCase();
  const pendingApprovals = trpc.admin.listingReviews.pendingCount.useQuery(undefined, { retry: false, refetchInterval: 60_000 });

  return <div className="admin-workspace">
    <div className="admin-workspace-frame">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar-brand" aria-label="NaijaKoblas admin overview">
          <span className="admin-sidebar-monogram" aria-hidden="true">NK</span>
          <span><strong>NAIJA KOBLAS</strong><small>ADMIN CONSOLE</small></span>
        </Link>
        <span className="admin-sidebar-label">WORKSPACE</span>
        <nav className="admin-workspace-nav" aria-label="Administration sections">
          {sections.map(({ label, href, icon: Icon }) => {
            const selected = location === href || (href === "/admin/products" && (location.startsWith("/admin/catalog") || location.startsWith("/admin/products")));
            return <Link key={href} href={href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
              {href === "/admin/approvals" && Boolean(pendingApprovals.data) && <b className="admin-nav-count" aria-label={`${pendingApprovals.data} waiting`}>{pendingApprovals.data}</b>}
            </Link>;
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-sidebar-storefront">View storefront <span aria-hidden="true">↗</span></Link>
          <small>Protected marketplace operations</small>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title"><span>PRIVATE OPERATIONS</span><h1>{active.label}</h1></div>
          <div className="admin-topbar-profile" aria-label="Signed-in administrator">
            <span className="admin-avatar" aria-hidden="true">{initials}</span>
            <span><strong>{account.data?.name ?? "Administrator"}</strong><small>{account.data?.email ?? "Verified admin account"}</small></span>
          </div>
        </header>
        <div className="admin-page-content">
          <Suspense fallback={<div className="admin-section-loading" role="status">Loading secure workspace…</div>}>{children}</Suspense>
        </div>
      </div>
    </div>
  </div>;
}

function AdminEmpty({ title, copy }: { title: string; copy: string }) {
  return <div className="portal-card portal-empty"><Activity size={24} /><h2>{title}</h2><p>{copy}</p></div>;
}

function AdminAuditPage() {
  const audit = trpc.admin.audit.useQuery({ limit: 75 }, { retry: false });
  return <section className="admin-workspace-section"><div className="section-heading"><div><span className="eyebrow">Append-only activity</span><h2>Audit log</h2><p>Protected business events recorded by the server, with actor and target references where available.</p></div><button className="button button--outline" type="button" onClick={() => void audit.refetch()} disabled={audit.isFetching}>Refresh</button></div>{audit.isLoading ? <p className="portal-loading-copy">Loading audit events…</p> : audit.error ? <p className="portal-error">Audit events are temporarily unavailable.</p> : audit.data?.items.length ? <div className="admin-audit-list">{audit.data.items.map(event => <article className="admin-audit-row" key={event.id}><div className="admin-audit-marker"><Activity size={15} /></div><div><strong>{event.eventType.replaceAll("_", " ")}</strong><p>{event.actorName ?? event.actorEmail ?? (event.actorUserId ? `Account #${event.actorUserId}` : "System event")} {event.targetUserId ? `· target account #${event.targetUserId}` : ""}</p><small>{formatDate(event.createdAt)} · Event #{event.id}</small></div><details><summary>Metadata</summary><pre>{JSON.stringify(event.metadata ?? {}, null, 2)}</pre></details></article>)}</div> : <AdminEmpty title="No audit events yet" copy="Marketplace actions will appear here as the service records them." />}</section>;
}

function AdminContactInboxPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "in_progress" | "resolved">("new");
  const [offset, setOffset] = useState(0);
  const query = trpc.admin.submissions.contactMessages.useQuery({ search: search || undefined, status: status === "all" ? undefined : status, limit: 25, offset }, { retry: false });
  const update = trpc.admin.submissions.updateContactStatus.useMutation({ onSuccess: () => void query.refetch() });
  return <section className="admin-workspace-section"><div className="section-heading"><div><span className="eyebrow">Stored public submissions</span><h2>Contact inbox</h2><p>Messages are stored for review. This workspace does not claim that an email was sent or that a response-time promise exists.</p></div><button className="button button--outline" type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh</button></div><div className="admin-filter-bar"><label>Search<input value={search} onChange={event => { setSearch(event.target.value); setOffset(0); }} placeholder="Email, subject or message" /></label><label>Status<select value={status} onChange={event => { setStatus(event.target.value as typeof status); setOffset(0); }}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="all">All statuses</option></select></label></div>{query.isLoading ? <p className="portal-loading-copy">Loading stored messages…</p> : query.error ? <p className="portal-error">The contact inbox is temporarily unavailable.</p> : query.data?.items.length ? <div className="admin-contact-list">{query.data.items.map(message => <article className="admin-contact-card" key={message.id}><div><span className={`status-label status-label--${message.status}`}>{message.status.replaceAll("_", " ")}</span><h3>{message.subject}</h3><p>{message.firstName} {message.lastName} · <a href={`mailto:${message.email}`}>{message.email}</a></p><small>{formatDate(message.createdAt)}</small></div><p className="admin-contact-message">{message.message}</p><div className="admin-contact-actions"><label>Update status<select value={message.status} disabled={update.isPending} onChange={event => update.mutate({ id: message.id, status: event.target.value as "new" | "in_progress" | "resolved" })}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div></article>)}</div> : <AdminEmpty title="No stored messages" copy="New contact submissions will appear here after validation and abuse checks." />} {query.data && <div className="admin-products-pagination"><span>Showing {query.data.items.length} of {query.data.total}</span><div><button type="button" className="button button--outline" disabled={offset === 0 || query.isFetching} onClick={() => setOffset(value => Math.max(0, value - 25))}>Previous</button><button type="button" className="button button--outline" disabled={offset + query.data.items.length >= query.data.total || query.isFetching} onClick={() => setOffset(value => value + 25)}>Next</button></div></div>}{update.error && <p className="portal-error" role="alert">{update.error.message}</p>}</section>;
}

function AdminApprovalsPage() {
  const utils = trpc.useUtils();
  const queue = trpc.admin.listingReviews.queue.useQuery(undefined, { retry: false });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const decide = trpc.admin.listingReviews.decide.useMutation({
    onSuccess: result => {
      setMessage(result.status === "approved" ? "Listing approved. It is now live in the shop." : "Listing rejected. The seller has been notified with your feedback.");
      setRejecting(null);
      void queue.refetch();
      void utils.admin.listingReviews.pendingCount.invalidate();
    },
  });
  return <section className="admin-workspace-section">
    <div className="section-heading"><div><span className="eyebrow">Marketplace quality</span><h2>Listing approvals</h2><p>New seller listings, and edits to live listings, wait here until you approve them. Nothing appears in the shop or can be bought before approval.</p></div><button className="button button--outline" type="button" onClick={() => void queue.refetch()} disabled={queue.isFetching}>Refresh</button></div>
    {message && <p className="admin-products-success" role="status"><Check size={14} /> {message}</p>}
    {decide.error && <p className="admin-products-error" role="alert">{decide.error.message}</p>}
    {queue.isLoading ? <p className="portal-loading-copy">Loading the approval queue…</p>
      : queue.error ? <p className="portal-error">The approval queue is temporarily unavailable.</p>
      : queue.data?.length ? <div className="admin-approval-list">{queue.data.map(item => {
        const primary = item.images.find(image => image.isPrimary) ?? item.images[0];
        return <article className="admin-approval-card" key={item.id}>
          <div className="admin-approval-media">
            {primary ? <img src={primary.url} alt={item.name} /> : <span>No photo</span>}
            {item.images.length > 1 && <div className="admin-approval-thumbs">{item.images.filter(image => image !== primary).slice(0, 4).map(image => <img key={image.id} src={image.url} alt="" loading="lazy" />)}</div>}
          </div>
          <div className="admin-approval-body">
            <span className="status-label status-label--pending">Awaiting approval</span>
            <h3>{item.name}</h3>
            <p className="admin-approval-meta"><strong>{money(item.priceNaira)}</strong> · {item.category} · {item.inventoryCount} in stock · Sizes: {item.sizes.join(", ")}</p>
            <p className="admin-approval-description">{item.description}</p>
            <small>{item.store?.displayName ?? "Store"}{item.store?.city ? `, ${item.store.city}` : ""} · {item.seller.email ?? item.seller.name ?? `Seller #${item.seller.id}`} · Submitted {formatDate(item.submittedAt)}</small>
          </div>
          <div className="admin-approval-actions">
            {rejecting === item.id ? <form onSubmit={event => { event.preventDefault(); decide.mutate({ productId: item.id, decision: "reject", note: notes[item.id] ?? "" }); }}>
              <label>Feedback for the seller<textarea required minLength={5} maxLength={1000} rows={4} autoFocus value={notes[item.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} placeholder="e.g. Please use a clearer main photo on a plain background." /></label>
              <div><button className="button button--dark" type="submit" disabled={decide.isPending}>Send rejection</button><button className="button button--outline" type="button" onClick={() => setRejecting(null)}>Cancel</button></div>
            </form> : <>
              <button className="button button--dark" type="button" disabled={decide.isPending} onClick={() => decide.mutate({ productId: item.id, decision: "approve" })}><Check size={15} /> Approve</button>
              <button className="button button--outline" type="button" disabled={decide.isPending} onClick={() => setRejecting(item.id)}><X size={15} /> Reject…</button>
            </>}
          </div>
        </article>;
      })}</div>
      : <AdminEmpty title="Queue is clear" copy="New and edited seller listings will appear here for review." />}
  </section>;
}

function AdminSellersPage() {
  const [status, setStatus] = useState<"approved" | "suspended" | "pending" | "rejected" | "all">("approved");
  const sellers = trpc.staff.sellerApplications.useQuery(status === "all" ? undefined : { status }, { retry: false });
  const review = trpc.staff.reviewSellerApplication.useMutation({ onSuccess: () => void sellers.refetch() });
  const act = (applicationId: number, next: "approved" | "rejected" | "suspended", verb: string) => {
    if (!window.confirm(`${verb} this seller?`)) return;
    review.mutate({ applicationId, status: next, reviewNote: `${verb} from the admin console.` });
  };
  return <section className="admin-workspace-section">
    <div className="section-heading"><div><span className="eyebrow">Seller oversight</span><h2>Sellers</h2><p>Suspend a seller to hide their listings and pause their tools, and reinstate them once resolved. Suspended sellers can still fulfil orders that were already paid.</p></div></div>
    <div className="admin-filter-bar"><label>Status<select value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="approved">Active</option><option value="suspended">Suspended</option><option value="pending">Pending (legacy)</option><option value="rejected">Rejected</option><option value="all">All</option></select></label></div>
    {review.error && <p className="admin-products-error" role="alert">{review.error.message}</p>}
    {sellers.isLoading ? <p className="portal-loading-copy">Loading sellers…</p>
      : sellers.error ? <p className="portal-error">Seller records are temporarily unavailable.</p>
      : sellers.data?.length ? <div className="portal-list">{sellers.data.map(({ application, applicant }) => <article className="portal-row" key={application.id}>
        <div><span className={`status-label status-label--${application.status}`}>{application.status === "approved" ? "active" : application.status}</span><h3>{application.businessName}</h3><p>{applicant.email ?? application.email} · {application.city}</p>{application.reviewNote && <small>{application.reviewNote}</small>}</div>
        <div className="portal-row-actions">
          {application.status === "pending" && <><button className="button button--dark" disabled={review.isPending} onClick={() => act(application.id, "approved", "Approve")}><BadgeCheck size={15} /> Approve</button><button className="button button--outline" disabled={review.isPending} onClick={() => act(application.id, "rejected", "Decline")}>Decline</button></>}
          {application.status === "approved" && <button className="button button--outline admin-products-danger" disabled={review.isPending} onClick={() => act(application.id, "suspended", "Suspend")}>Suspend</button>}
          {application.status === "suspended" && <button className="button button--dark" disabled={review.isPending} onClick={() => act(application.id, "approved", "Reinstate")}>Reinstate</button>}
        </div>
      </article>)}</div>
      : <AdminEmpty title="No sellers in this view" copy="Sellers appear here once customers activate seller access." />}
  </section>;
}

export function AdminWorkspacePage() {
  const [location] = useLocation();
  const path = location.split("?")[0];
  let section: ReactNode;
  if (path === "/admin/products" || path === "/admin/catalog") section = <AdminProductManagementPage />;
  else if (path === "/admin/approvals") section = <AdminApprovalsPage />;
  else if (path === "/admin/sellers") section = <AdminSellersPage />;
  else if (path === "/admin/orders") section = <AdminOrdersPage />;
  else if (path === "/admin/customers") section = <AdminCustomersPage />;
  else if (path === "/admin/categories") section = <AdminCategoriesPage />;
  else if (path === "/admin/analytics") section = <AdminAnalyticsPage />;
  else if (path === "/admin/settings") section = <AdminSettingsPage />;
  else if (path === "/admin/audit") section = <AdminAuditPage />;
  else if (path === "/admin/contact") section = <AdminContactInboxPage />;
  else if (path === "/admin/operations") section = <AdminDashboardPage />;
  else section = <AdminOverviewPage />;
  return <AdminSectionShell>{section}</AdminSectionShell>;
}
