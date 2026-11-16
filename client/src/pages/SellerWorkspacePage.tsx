import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Moon,
  Palette,
  PackageCheck,
  Plus,
  Settings,
  ShoppingBag,
  Store,
  Sun,
  Truck,
  Wallet,
} from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { money } from "@/store";
import { NotificationBell } from "@/components/store/NotificationBell";
import { SELLER_CATEGORIES, SellerProductCard, listingStage, stageLabels, type ListingStage, type SellerProduct } from "@/components/store/SellerProductCard";

const DEFAULT_ACCENT = "#22a35a";
export const ACCENT_PRESETS = ["#22a35a", "#c6a461", "#d9663f", "#2f80ed", "#8b5cf6", "#e0457b", "#0f9d8f", "#475569"];

const sections = [
  { label: "Overview", href: "/seller", icon: LayoutDashboard },
  { label: "Products", href: "/seller/products", icon: Boxes },
  { label: "Orders", href: "/seller/orders", icon: Truck },
  { label: "Store settings", href: "/seller/settings", icon: Settings },
] as const;

type Dashboard = inferRouterOutputs<AppRouter>["seller"]["dashboard"];
type OrderLine = Dashboard["orders"][number];

function initialsOf(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]!.toUpperCase()).join("") || "NK";
}

function nextFulfillment(status: string) {
  if (status === "unfulfilled") return { next: "processing" as const, label: "Start processing" };
  if (status === "processing") return { next: "shipped" as const, label: "Mark as shipped" };
  if (status === "shipped") return { next: "fulfilled" as const, label: "Mark delivered" };
  return null;
}

function WorkspaceMessage({ title, copy, href = "/account", action = "Go to my account" }: { title: string; copy: string; href?: string; action?: string }) {
  return <main className="seller-gate"><div className="portal-card portal-empty"><span className="eyebrow">Seller workspace</span><h1>{title}</h1><p>{copy}</p><Link href={href} className="button button--dark">{action} <ArrowRight size={16} /></Link></div></main>;
}

export function SellerWorkspacePage() {
  const [location] = useLocation();
  const seller = trpc.seller.dashboard.useQuery(undefined, { retry: false });
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (seller.isLoading) return <main className="admin-route-loading" role="status">Loading your seller workspace…</main>;
  if (seller.error) {
    return seller.error.data?.code === "FORBIDDEN"
      ? <WorkspaceMessage title="Seller access required" copy="Activate seller access from your account. Rejected or suspended seller accounts need to contact support." />
      : <WorkspaceMessage title="Workspace unavailable" copy="We couldn't load your seller data. Please try again in a moment." />;
  }
  if (!seller.data) return <WorkspaceMessage title="Seller access required" copy="Activate seller access from your account to open this workspace." />;

  // Older API versions don't return settings; fall back to defaults instead of crashing.
  const data = { ...seller.data, settings: seller.data.settings ?? { dashboardName: null, accentColor: DEFAULT_ACCENT, theme: "dark" } };
  const refresh = (message?: string) => { void seller.refetch(); if (message) setNotice(message); };
  const path = location.split("?")[0];
  const active = sections.find(section => section.href === path) ?? sections[0]!;
  const storeName = data.store?.displayName ?? "My store";
  const dashboardName = data.settings.dashboardName || storeName;
  const accent = data.settings.accentColor || DEFAULT_ACCENT;
  const pendingCount = data.products.filter(product => listingStage(product) === "pending").length;
  const style = { "--seller-accent": accent } as CSSProperties;

  let content: ReactNode;
  if (path === "/seller/products") content = <ProductsSection data={data} onChanged={refresh} />;
  else if (path === "/seller/orders") content = <OrdersSection orders={data.orders} onChanged={refresh} />;
  else if (path === "/seller/settings") content = <SettingsSection data={data} onChanged={refresh} />;
  else content = <OverviewSection data={data} />;

  return <div className="admin-workspace seller-workspace" data-theme={data.settings.theme} style={style}>
    <div className="admin-workspace-frame">
      <aside className="admin-sidebar">
        <Link href="/seller" className="admin-sidebar-brand" aria-label={`${dashboardName} overview`}>
          <span className="admin-sidebar-monogram" aria-hidden="true">{initialsOf(dashboardName)}</span>
          <span><strong>{dashboardName}</strong><small>SELLER WORKSPACE</small></span>
        </Link>
        <span className="admin-sidebar-label">MANAGE</span>
        <nav className="admin-workspace-nav" aria-label="Seller workspace sections">
          {sections.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={active.href === href ? "active" : ""} aria-current={active.href === href ? "page" : undefined}>
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
            {href === "/seller/products" && pendingCount > 0 && <b className="admin-nav-count" aria-label={`${pendingCount} awaiting approval`}>{pendingCount}</b>}
          </Link>)}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-sidebar-storefront">View storefront <span aria-hidden="true">↗</span></Link>
          <Link href="/account" className="admin-sidebar-storefront">My customer account <span aria-hidden="true">→</span></Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title"><span>{storeName.toUpperCase()}</span><h1>{active.label}</h1></div>
          <div className="admin-topbar-tools">
            <NotificationBell />
            <div className="admin-topbar-profile" aria-label="Signed-in seller">
              <span className="admin-avatar" aria-hidden="true">{initialsOf(data.user.name ?? data.user.email ?? "S")}</span>
              <span><strong>{data.user.name ?? "Seller"}</strong><small>{data.user.email ?? "Seller account"}</small></span>
            </div>
          </div>
        </header>
        <div className="admin-page-content">
          {!data.store?.isActive && <p className="portal-error" role="alert">Your store is inactive, so new listings can't be submitted. Contact NaijaKoblas support.</p>}
          {notice && <p className="form-success seller-notice" role="status">{notice}</p>}
          {content}
        </div>
      </div>
    </div>
  </div>;
}

function StatCard({ icon, label, value, hint, href }: { icon: ReactNode; label: string; value: ReactNode; hint: string; href?: string }) {
  const body = <><span className="admin-ops-stat-icon">{icon}</span><span>{label}</span><strong>{value}</strong><small>{hint}</small></>;
  return href ? <Link href={href} className="portal-card admin-ops-stat-card seller-stat-link">{body}</Link> : <article className="portal-card admin-ops-stat-card">{body}</article>;
}

function OverviewSection({ data }: { data: Dashboard }) {
  const counts = useMemo(() => {
    const byStage: Record<ListingStage, number> = { live: 0, pending: 0, rejected: 0, draft: 0, archived: 0 };
    for (const product of data.products) byStage[listingStage(product)] += 1;
    return byStage;
  }, [data.products]);
  const openOrders = data.orders.filter(({ item }) => item.fulfillmentStatus !== "fulfilled");
  const revenueKobo = data.orders.reduce((sum, { item }) => sum + item.lineTotalKobo, 0);
  const lowStock = data.products.filter(product => listingStage(product) === "live" && product.inventoryCount <= 2);
  const hasPhotos = data.products.some(product => product.images?.some(image => image.isPrimary));
  const steps = [
    { done: Boolean(data.store?.description), label: "Describe your store", href: "/seller/settings" },
    { done: data.products.length > 0, label: "Create your first listing", href: "/seller/products" },
    { done: hasPhotos, label: "Add a primary product photo", href: "/seller/products" },
    { done: counts.pending + counts.live > 0, label: "Submit a listing for approval", href: "/seller/products" },
    { done: counts.live > 0, label: "Get your first listing approved", href: "/seller/products" },
  ];
  const remaining = steps.filter(step => !step.done);

  return <section className="admin-ops-page">
    <div className="seller-welcome">
      <div><span className="eyebrow">Welcome back</span><h2>{data.settings.dashboardName || data.store?.displayName || "Your store"}</h2><p>{data.store?.city ? `${data.store.city}, Nigeria · ` : ""}Here's what needs your attention today.</p></div>
      <Link href="/seller/products#new" className="button button--dark"><Plus size={16} /> New listing</Link>
    </div>
    <div className="portal-grid admin-ops-stat-grid">
      <StatCard icon={<CheckCircle2 size={16} />} label="Live listings" value={counts.live} hint="Approved and visible to shoppers" href="/seller/products?stage=live" />
      <StatCard icon={<Clock3 size={16} />} label="Awaiting approval" value={counts.pending} hint="Being reviewed by NaijaKoblas" href="/seller/products?stage=pending" />
      <StatCard icon={<Truck size={16} />} label="Orders to fulfil" value={openOrders.length} hint="Paid order lines not yet delivered" href="/seller/orders" />
      <StatCard icon={<Wallet size={16} />} label="Paid sales" value={money(revenueKobo / 100)} hint="Total of your paid order lines" />
    </div>
    <div className="admin-ops-two-column">
      <section className="admin-ops-section">
        <div className="section-heading"><div><span className="eyebrow">Getting started</span><h2>{remaining.length ? `${steps.length - remaining.length} of ${steps.length} done` : "You're all set"}</h2></div></div>
        <ol className="seller-checklist">
          {steps.map(step => <li key={step.label} className={step.done ? "is-done" : ""}>
            <CheckCircle2 size={17} aria-hidden="true" />
            {step.done ? <span>{step.label}</span> : <Link href={step.href}>{step.label} <ArrowRight size={14} /></Link>}
          </li>)}
        </ol>
      </section>
      <section className="admin-ops-section">
        <div className="section-heading"><div><span className="eyebrow">Needs attention</span><h2>Action items</h2></div></div>
        <ul className="seller-attention">
          {counts.rejected > 0 && <li><AlertTriangle size={16} /><Link href="/seller/products?stage=rejected">{counts.rejected} listing{counts.rejected === 1 ? "" : "s"} need{counts.rejected === 1 ? "s" : ""} changes from admin feedback</Link></li>}
          {openOrders.filter(({ item }) => item.fulfillmentStatus === "unfulfilled").length > 0 && <li><ShoppingBag size={16} /><Link href="/seller/orders">{openOrders.filter(({ item }) => item.fulfillmentStatus === "unfulfilled").length} new paid order line(s) to start processing</Link></li>}
          {lowStock.map(product => <li key={product.id}><PackageCheck size={16} /><Link href="/seller/products?stage=live">{product.name}: only {product.inventoryCount} left</Link></li>)}
          {counts.draft > 0 && <li><Boxes size={16} /><Link href="/seller/products?stage=draft">{counts.draft} draft{counts.draft === 1 ? "" : "s"} not yet submitted</Link></li>}
          {!counts.rejected && !openOrders.length && !lowStock.length && !counts.draft && <li className="is-clear"><CheckCircle2 size={16} /> Nothing urgent. Nice work.</li>}
        </ul>
      </section>
    </div>
    <section className="admin-ops-section">
      <div className="section-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent orders</h2></div><Link href="/seller/orders" className="button button--outline">All orders</Link></div>
      {data.orders.length ? <div className="portal-list">{data.orders.slice(0, 5).map(({ order, item }) => <article className="portal-row" key={item.id}>
        <div><span className={`status-label status-label--${item.fulfillmentStatus}`}>{item.fulfillmentStatus.replaceAll("_", " ")}</span><h3>{item.nameSnapshot} × {item.quantity}</h3><p>Order {order.reference} · {order.city}</p></div>
        <strong>{money(item.lineTotalKobo / 100)}</strong>
      </article>)}</div> : <p className="admin-products-empty-copy">No paid orders yet. They'll appear here as soon as a customer's payment is verified.</p>}
    </section>
  </section>;
}

const stageFilters: Array<ListingStage | "all"> = ["all", "live", "pending", "rejected", "draft", "archived"];

function ProductsSection({ data, onChanged }: { data: Dashboard; onChanged: (message?: string) => void }) {
  const [, navigate] = useLocation();
  const initialStage = new URLSearchParams(window.location.search).get("stage");
  const [stage, setStage] = useState<ListingStage | "all">(stageFilters.includes(initialStage as ListingStage) ? initialStage as ListingStage : "all");
  const [showCreate, setShowCreate] = useState(window.location.hash === "#new" || data.products.length === 0);
  const createProduct = trpc.seller.createProduct.useMutation();
  const products = data.products as SellerProduct[];
  const visible = stage === "all" ? products : products.filter(product => listingStage(product) === stage);
  const countFor = (value: ListingStage | "all") => value === "all" ? products.length : products.filter(product => listingStage(product) === value).length;

  const submitProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    createProduct.mutate({
      name: String(values.get("name") ?? "").trim(),
      description: String(values.get("description") ?? "").trim(),
      category: String(values.get("category") ?? "").trim(),
      priceNaira: Number(values.get("priceNaira")),
      sizes: String(values.get("sizes") ?? "").split(",").map(size => size.trim()).filter(Boolean),
      inventoryCount: Number(values.get("inventoryCount")),
    }, {
      onSuccess: () => {
        form.reset();
        setShowCreate(false);
        setStage("draft");
        onChanged("Draft created. Add a photo below, then submit it for approval.");
      },
    });
  };

  return <section className="admin-ops-page">
    <div className="seller-welcome">
      <div><span className="eyebrow">Your catalog</span><h2>Products</h2><p>Every listing is checked by NaijaKoblas before it appears in the shop. Edits to the name, description, price or photos of a live listing send it back for a quick re-check.</p></div>
      <button type="button" className="button button--dark" onClick={() => setShowCreate(value => !value)} aria-expanded={showCreate}><Plus size={16} /> {showCreate ? "Hide form" : "New listing"}</button>
    </div>

    {showCreate && <form className="admin-ops-section seller-create-form" onSubmit={submitProduct} id="new">
      <div className="section-heading"><div><span className="eyebrow">Step 1 of 3</span><h2>Create a draft listing</h2><p>After saving you'll add photos, then submit it for approval.</p></div></div>
      <div className="form-grid">
        <label className="form-field"><span>PRODUCT NAME</span><input name="name" minLength={2} maxLength={180} required placeholder="e.g. Hand-stitched leather tote" /></label>
        <label className="form-field"><span>CATEGORY</span><input name="category" list="seller-category-options" defaultValue="Bags" minLength={2} maxLength={80} required /></label>
        <label className="form-field"><span>PRICE (₦)</span><input name="priceNaira" type="number" min="1" max="21000000" step="1" required placeholder="45000" /></label>
        <label className="form-field"><span>AVAILABLE STOCK</span><input name="inventoryCount" type="number" min="0" max="1000000" step="1" required placeholder="5" /></label>
        <label className="form-field form-field--wide"><span>DESCRIPTION</span><textarea name="description" minLength={20} maxLength={5000} rows={4} required placeholder="Materials, finish, dimensions, care…" /></label>
        <label className="form-field form-field--wide"><span>SIZES / STYLES (comma-separated)</span><input name="sizes" placeholder="One Size, M, L" required /></label>
      </div>
      <div className="seller-form-actions">
        <button className="button button--dark" type="submit" disabled={createProduct.isPending}>{createProduct.isPending ? "Saving…" : "Save draft"} <ArrowRight size={16} /></button>
        {products.length > 0 && <button className="button button--outline" type="button" onClick={() => setShowCreate(false)}>Cancel</button>}
      </div>
      {createProduct.error && <p className="portal-error" role="alert">{createProduct.error.message}</p>}
    </form>}
    <datalist id="seller-category-options">{SELLER_CATEGORIES.map(category => <option key={category} value={category} />)}</datalist>

    <div className="seller-stage-tabs" role="tablist" aria-label="Filter listings by stage">
      {stageFilters.map(value => <button key={value} type="button" role="tab" aria-selected={stage === value} className={stage === value ? "active" : ""} onClick={() => { setStage(value); navigate(value === "all" ? "/seller/products" : `/seller/products?stage=${value}`, { replace: true }); }}>
        {value === "all" ? "All" : stageLabels[value]} <b>{countFor(value)}</b>
      </button>)}
    </div>

    {visible.length ? <div className="seller-product-list">{visible.map(product => <SellerProductCard key={product.id} product={product} storeActive={Boolean(data.store?.isActive)} onChanged={onChanged} />)}</div>
      : <div className="admin-products-state"><PackageCheck size={22} /><h3>{products.length ? "Nothing in this view" : "No listings yet"}</h3><p>{products.length ? "Try another filter above." : "Create your first draft to start selling."}</p></div>}
  </section>;
}

function OrdersSection({ orders, onChanged }: { orders: OrderLine[]; onChanged: (message?: string) => void }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const update = trpc.seller.updateOrderItemFulfillment.useMutation({ onSuccess: () => onChanged("Order updated.") });
  const visible = filter === "open" ? orders.filter(({ item }) => item.fulfillmentStatus !== "fulfilled") : orders;
  return <section className="admin-ops-page">
    <div className="seller-welcome">
      <div><span className="eyebrow">Paid orders only</span><h2>Orders</h2><p>Order lines appear here after the customer's payment is verified. Move each one through processing, shipped and delivered.</p></div>
      <div className="seller-stage-tabs seller-stage-tabs--compact">
        <button type="button" className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>To fulfil <b>{orders.filter(({ item }) => item.fulfillmentStatus !== "fulfilled").length}</b></button>
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <b>{orders.length}</b></button>
      </div>
    </div>
    {visible.length ? <div className="portal-list">{visible.map(({ order, item }) => {
      const step = nextFulfillment(item.fulfillmentStatus);
      return <article className="portal-row seller-order-row" key={item.id}>
        <div>
          <span className={`status-label status-label--${item.fulfillmentStatus}`}>{item.fulfillmentStatus.replaceAll("_", " ")}</span>
          <h3>{item.nameSnapshot} × {item.quantity}</h3>
          <p>Order {order.reference} · Size {item.size} · {order.deliveryMethod} delivery · {money(item.lineTotalKobo / 100)}</p>
          <p>Ship to {order.firstName} {order.lastName}, {order.address}, {order.city} · <a href={`tel:${order.phone}`}>{order.phone}</a></p>
          {item.trackingNumber && <small>{item.carrier ?? "Carrier"}: {item.trackingNumber}</small>}
        </div>
        {step && <form className="portal-row-actions seller-fulfil-form" onSubmit={event => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          update.mutate({ orderItemId: item.id, status: step.next, carrier: String(values.get("carrier") ?? "").trim() || undefined, trackingNumber: String(values.get("trackingNumber") ?? "").trim() || undefined });
        }}>
          {step.next !== "processing" && <>
            <input name="carrier" aria-label="Carrier" placeholder="Carrier (optional)" defaultValue={item.carrier ?? ""} />
            <input name="trackingNumber" aria-label="Tracking number" placeholder="Tracking number" defaultValue={item.trackingNumber ?? ""} />
          </>}
          <button className="button button--dark" type="submit" disabled={update.isPending}>{step.label}</button>
        </form>}
      </article>;
    })}</div> : <div className="admin-products-state"><Truck size={22} /><h3>{filter === "open" ? "All caught up" : "No paid orders yet"}</h3><p>{filter === "open" ? "Every paid order line has been delivered." : "Paid order lines for your products will show up here."}</p></div>}
    {update.error && <p className="portal-error" role="alert">{update.error.message}</p>}
  </section>;
}

function SettingsSection({ data, onChanged }: { data: Dashboard; onChanged: (message?: string) => void }) {
  const [profile, setProfile] = useState({ displayName: data.store?.displayName ?? "", city: data.store?.city ?? "", description: data.store?.description ?? "" });
  const [look, setLook] = useState({ dashboardName: data.settings.dashboardName ?? "", accentColor: data.settings.accentColor || DEFAULT_ACCENT, theme: data.settings.theme === "light" ? "light" as const : "dark" as const });
  const saveProfile = trpc.seller.updateStoreProfile.useMutation({ onSuccess: () => onChanged("Store profile saved.") });
  const saveLook = trpc.seller.updateDashboardSettings.useMutation({ onSuccess: () => onChanged("Dashboard appearance saved.") });

  return <section className="admin-ops-page">
    <div className="admin-ops-two-column">
      <form className="admin-ops-section" onSubmit={event => { event.preventDefault(); saveProfile.mutate(profile); }}>
        <div className="section-heading"><div><span className="eyebrow"><Store size={13} /> Public</span><h2>Store profile</h2><p>Shoppers see this on your public store page and on every product.</p></div>{data.store && <Link href={`/store/${data.store.id}`} className="button button--outline">View public store</Link>}</div>
        <div className="form-grid">
          <label className="form-field"><span>STORE NAME</span><input value={profile.displayName} minLength={2} maxLength={160} required onChange={event => setProfile(current => ({ ...current, displayName: event.target.value }))} /></label>
          <label className="form-field"><span>CITY</span><input value={profile.city} minLength={2} maxLength={100} required onChange={event => setProfile(current => ({ ...current, city: event.target.value }))} /></label>
          <label className="form-field form-field--wide"><span>ABOUT YOUR STORE</span><textarea value={profile.description} maxLength={1000} rows={4} placeholder="Your craft, materials and story" onChange={event => setProfile(current => ({ ...current, description: event.target.value }))} /></label>
        </div>
        <div className="seller-form-actions"><button className="button button--dark" type="submit" disabled={saveProfile.isPending}>{saveProfile.isPending ? "Saving…" : "Save profile"}</button></div>
        {saveProfile.error && <p className="portal-error" role="alert">{saveProfile.error.message}</p>}
      </form>

      <form className="admin-ops-section" onSubmit={event => { event.preventDefault(); saveLook.mutate({ ...look, dashboardName: look.dashboardName.trim() || null }); }}>
        <div className="section-heading"><div><span className="eyebrow"><Palette size={13} /> Your branding</span><h2>Dashboard appearance</h2><p>The name and mode are just for your workspace. Your accent colour also styles your public store page.</p></div></div>
        <label className="form-field"><span>DASHBOARD NAME</span><input value={look.dashboardName} maxLength={60} placeholder={data.store?.displayName ?? "My store"} onChange={event => setLook(current => ({ ...current, dashboardName: event.target.value }))} /></label>
        <fieldset className="seller-swatches">
          <legend>ACCENT COLOUR</legend>
          {ACCENT_PRESETS.map(color => <button key={color} type="button" className={look.accentColor === color ? "selected" : ""} style={{ background: color }} aria-label={`Accent ${color}`} aria-pressed={look.accentColor === color} onClick={() => setLook(current => ({ ...current, accentColor: color }))} />)}
          <label className="seller-swatch-custom" title="Custom colour"><input type="color" value={look.accentColor} aria-label="Custom accent colour" onChange={event => setLook(current => ({ ...current, accentColor: event.target.value.toLowerCase() }))} /></label>
        </fieldset>
        <fieldset className="seller-theme-toggle">
          <legend>MODE</legend>
          <button type="button" className={look.theme === "dark" ? "selected" : ""} aria-pressed={look.theme === "dark"} onClick={() => setLook(current => ({ ...current, theme: "dark" }))}><Moon size={15} /> Dark</button>
          <button type="button" className={look.theme === "light" ? "selected" : ""} aria-pressed={look.theme === "light"} onClick={() => setLook(current => ({ ...current, theme: "light" }))}><Sun size={15} /> Light</button>
        </fieldset>
        <div className="seller-look-preview" data-theme={look.theme} style={{ "--seller-accent": look.accentColor } as CSSProperties} aria-hidden="true">
          <span className="admin-sidebar-monogram">{initialsOf(look.dashboardName || data.store?.displayName || "My store")}</span>
          <div><strong>{look.dashboardName || data.store?.displayName || "My store"}</strong><small>Preview</small></div>
          <i />
        </div>
        <div className="seller-form-actions"><button className="button button--dark" type="submit" disabled={saveLook.isPending}>{saveLook.isPending ? "Saving…" : "Save appearance"}</button></div>
        {saveLook.error && <p className="portal-error" role="alert">{saveLook.error.message}</p>}
      </form>
    </div>
  </section>;
}
