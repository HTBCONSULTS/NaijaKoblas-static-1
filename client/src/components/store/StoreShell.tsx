import { Link, useLocation } from "wouter";
import { ArrowRight, BadgeCheck, CalendarDays, ChevronDown, Facebook, Footprints, Heart, House, Instagram, LayoutGrid, Linkedin, Lock, Mail, Menu, Search, Shirt, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Truck, UserRound, UsersRound, Wallet, X, Youtube, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, type Product, money } from "@/store";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { trpc } from "@/lib/trpc";

/** The five storefront collections, shared by the header menu, home page and catalog chips. */
export const COLLECTIONS: Array<{ name: string; blurb: string; image: string; position?: string; icon: LucideIcon }> = [
  { name: "Bags", blurb: "Totes, briefcases, weekenders & more", image: "/nk/nk-tote.jpg", icon: ShoppingBag },
  { name: "Shoes", blurb: "Formal, casual and custom pairs", image: "/nk/nk-brogues.jpg", icon: Footprints },
  { name: "Belts", blurb: "Everyday and statement belts", image: "/nk/nk-belt-brown.jpg", icon: BadgeCheck },
  { name: "Jackets", blurb: "Timeless leather outerwear", image: "/nk/nk-jacket.jpg", icon: Shirt },
  { name: "Accessories", blurb: "Small pieces that make a statement", image: "/nk/nk-wallet-set.jpg", icon: Wallet },
];

export function BrandMark({ light = false }: { light?: boolean }) {
  const { theme } = useTheme();
  // original green logo; header and footer share the page theme in the gold redesign
  const logo = theme === "dark" ? "/naija-koblas-logo-white.png" : "/naija-koblas-logo-light.png";
  return <Link href="/" className={`nk-brand ${light ? "nk-brand--footer" : ""}`} aria-label="NaijaKoblas home"><img className="nk-brand-logo" src={logo} alt="Naija Koblas" /></Link>;
}

export function Navbar() {
  const [location, navigate] = useLocation();
  const { cartCount } = useStore();
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    if (!open) return () => document.body.classList.remove("menu-open");

    const focusFrame = window.requestAnimationFrame(() => navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
    const handleMenuKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const navigation = navRef.current;
        const menuLinks = navigation ? Array.from(navigation.querySelectorAll<HTMLAnchorElement>('a[href]')) : [];
        if (menuLinks.length === 0) return;
        const first = menuLinks[0]!;
        const last = menuLinks[menuLinks.length - 1]!;
        const focusIsOutside = !navigation?.contains(document.activeElement);
        if (event.shiftKey && (focusIsOutside || document.activeElement === first)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (focusIsOutside || document.activeElement === last)) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (navRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      const element = target instanceof Element ? target : target.parentElement;
      const clickedFocusable = element?.closest('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      setOpen(false);
      if (!clickedFocusable) {
        window.requestAnimationFrame(() => {
          const menuButton = menuButtonRef.current;
          if (menuButton && menuButton.getClientRects().length > 0) menuButton.focus();
          else navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
        });
      }
    };
    document.addEventListener("keydown", handleMenuKeyboard);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleMenuKeyboard);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.body.classList.remove("menu-open");
    };
  }, [open]);
  const [query, setQuery] = useState("");
  const { wishlist } = useStore();
  const portal = auth.user?.role === "seller" ? ["Seller dashboard", "/seller"] : auth.user?.role === "staff" ? ["Staff portal", "/staff"] : auth.user?.role === "admin" ? ["Admin console", "/admin"] : null;
  const close = () => { if (open) menuButtonRef.current?.focus(); setOpen(false); };
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
    close();
  };
  return <header className={`nk-header ${open ? "nk-header--open" : ""}`}>
    <div className="nk-header-inner container-wide">
      <button ref={menuButtonRef} type="button" className="nk-icon nk-menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      <BrandMark />
      <button type="button" className={`nk-backdrop ${open ? "nk-backdrop--open" : ""}`} aria-label="Close navigation menu" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); menuButtonRef.current?.focus(); }} />
      <nav id="primary-navigation" ref={navRef} className={`nk-nav ${open ? "nk-nav--open" : ""}`} aria-label="Main navigation">
        <form className="nk-search nk-search--drawer" role="search" onSubmit={search}><Search size={16} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search leather goods, makers…" aria-label="Search products" /></form>
        <Link href="/products" className={isActive("/products") ? "active" : ""} onClick={close}>Shop</Link>
        <div className="nk-dropdown">
          <Link href="/products" className="nk-dropdown-trigger" onClick={close}>Collections <ChevronDown size={14} aria-hidden="true" /></Link>
          <div className="nk-dropdown-menu">
            {COLLECTIONS.map(({ name, icon: Icon }) => <Link key={name} href={`/products?category=${name}`} onClick={close}><Icon size={16} aria-hidden="true" /> {name}</Link>)}
            <Link href="/products" onClick={close} className="nk-dropdown-all">View all collections <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </div>
        <Link href="/about" className={isActive("/about") ? "active" : ""} onClick={close}>Our Story</Link>
        <Link href="/vendor" className={isActive("/vendor") ? "active" : ""} onClick={close}>For Makers</Link>
        <Link href="/exhibition" className={isActive("/exhibition") ? "active" : ""} onClick={close}>Exhibition 2027</Link>
        <Link href="/makers" className={`nk-nav-mobile-only ${isActive("/makers") ? "active" : ""}`} onClick={close}>Our Makers</Link>
        <Link href="/contact" className={isActive("/contact") ? "active" : ""} onClick={close}>Contact</Link>
        {portal && <Link href={portal[1]} className="nk-nav-portal" onClick={close}>{portal[0]}</Link>}
        {!auth.loading && !auth.isAuthenticated && <Link href="/login" className="nk-nav-mobile-only" onClick={close}>Sign in</Link>}
      </nav>
      <form className="nk-search nk-search--bar" role="search" onSubmit={search}><Search size={16} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for leather goods, makers, collections…" aria-label="Search products" /></form>
      <div className="nk-actions">
        <Link href="/products?saved=1" className="nk-icon" aria-label={`Saved items (${wishlist.length})`}><Heart size={20} />{wishlist.length > 0 && <b>{wishlist.length}</b>}</Link>
        {auth.isAuthenticated && <span className="nk-bell"><NotificationBell /></span>}
        <Link href="/cart" className="nk-icon" aria-label={`Cart with ${cartCount} items`}><ShoppingCart size={20} />{cartCount > 0 && <b>{cartCount}</b>}</Link>
        <Link href={auth.isAuthenticated ? "/account" : "/login"} className="nk-icon nk-account" aria-label={auth.isAuthenticated ? "Account" : "Sign in"}><UserRound size={20} /></Link>
        <button type="button" className="nk-icon nk-theme" aria-label="Toggle light or dark theme" aria-pressed={theme === "dark"} onClick={() => toggleTheme?.()}><Sparkles size={17} /></button>
      </div>
    </div>
  </header>;
}

export function Footer() {
  const [email, setEmail] = useState("");
  const subscribe = trpc.submissions.subscribe.useMutation();
  const auth = useAuth();
  return <footer className="site-footer">
    <div className="container-wide nk-waitlist">
      <div className="nk-waitlist-title"><Mail size={30} aria-hidden="true" /><h2>Be Part of the Journey</h2></div>
      <p>Get stories, new collections, maker highlights and exhibition updates straight to your inbox.</p>
      <form className="nk-waitlist-form" onSubmit={(event) => { event.preventDefault(); subscribe.mutate({ email, source: "waitlist" }); }}>
        <label className="nk-input"><span aria-hidden="true">✉</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" aria-label="Your email address" /></label>
        <button className="button button--dark" type="submit" disabled={subscribe.isPending}>{subscribe.isSuccess ? "You're on the list" : subscribe.isPending ? "Saving…" : "Join the Waitlist"}<ArrowRight size={17} /></button>
        {subscribe.error && <small className="form-error" role="status">{subscribe.error.message}</small>}
      </form>
    </div>
    <div className="container-wide footer-main">
      <div className="footer-about"><BrandMark light /><p>Connecting Nigerian craftsmanship, culture and creativity with a global audience through authentic, handcrafted leather goods.</p><div className="social-links"><a href="https://youtube.com" aria-label="YouTube"><Youtube size={17} /></a><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://facebook.com" aria-label="Facebook"><Facebook size={17} /></a><a href="https://linkedin.com" aria-label="LinkedIn"><Linkedin size={17} /></a></div></div>
      <div className="footer-column"><h3>Shop</h3>{COLLECTIONS.map(({ name }) => <Link key={name} href={`/products?category=${name}`}>{name}</Link>)}</div>
      <div className="footer-column"><h3>Our Story</h3><Link href="/about#heritage">Our Heritage</Link><Link href="/makers">The Makers</Link><Link href="/#stories">Stories &amp; Insights</Link><Link href="/about#impact">Our Impact</Link></div>
      <div className="footer-column"><h3>Get Involved</h3>{auth.user?.role === "seller" ? <Link href="/seller">Seller Dashboard</Link> : auth.user?.role === "staff" ? <Link href="/staff">Staff Portal</Link> : auth.user?.role === "admin" ? <Link href="/admin">Admin Console</Link> : <Link href="/vendor">For Makers</Link>}<Link href="/exhibition">Exhibition 2027</Link><Link href="/contact">Partnerships</Link><Link href="/contact">Contact Us</Link></div>
      <div className="footer-column"><h3>Support</h3><Link href="/info/help">Help Centre</Link><Link href="/info/shipping">Orders &amp; Delivery</Link><Link href="/info/returns">Returns &amp; Refunds</Link><Link href="/contact#faq">FAQs</Link></div>
    </div>
    <div className="container-wide footer-bottom"><span>© 2026 NaijaKoblas. All rights reserved. <Link href="/info/privacy">Privacy Policy</Link> <Link href="/info/terms">Terms of Service</Link></span><em className="nk-footer-tagline">Built from Culture. Crafted with Pride. Worn with Purpose.</em></div>
  </footer>;
}

export function StoreShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const links: Array<[string, string, LucideIcon]> = [
    ["Home", "/", House],
    ["Collections", "/products", LayoutGrid],
    ["Makers", "/makers", UsersRound],
    ["Exhibition", "/exhibition", CalendarDays],
    ["Account", "/account", UserRound],
  ];
  const active = (href: string) => href === "/" ? location === "/" : location.startsWith(href) || (href === "/makers" && location.startsWith("/store/"));
  return <div className="store-app"><Navbar />{children}<nav className="nk-tabbar" aria-label="Mobile navigation">{links.map(([label, href, Icon]) => <Link key={href} href={href} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></Link>)}</nav><Footer /></div>;
}

export function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <section className="page-intro container-wide"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</section>;
}

export function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action}</div>;
}

export function Pill({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" | "lime" }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const saved = wishlist.includes(product.id);
  return <article className="product-card">
    <div className="product-image-wrap"><Link href={`/products/${product.id}`} className="product-image-link"><img src={product.image} alt={product.name} /></Link><button className={`wishlist-button ${saved ? "saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button></div>
    <div className="nk-card-body">
      <Link href={`/products/${product.id}`} className="product-name">{product.name}</Link>
      <span className="product-maker">{product.category} · {product.storeId ? <Link href={`/store/${product.storeId}`}>{product.maker}</Link> : product.maker}</span>
      <div className="nk-card-foot"><strong>{money(product.price)}</strong><button type="button" className="nk-cart-button" onClick={() => addToCart(product.id)} aria-label={`Add ${product.name} to cart`}><ShoppingCart size={17} /></button></div>
    </div>
  </article>;
}

export function TrustStrip() {
  const items: Array<[LucideIcon, string, string]> = [
    [ShieldCheck, "Verified Makers", "Curated and reviewed leather products"],
    [Lock, "Secure Payment", "Card, transfer or USSD via Paystack"],
    [Truck, "Tracked Delivery", "Follow your order from purchase to delivery"],
  ];
  return <section className="container-wide nk-trust" aria-label="Why shop with NaijaKoblas">{items.map(([Icon, title, copy]) => <div className="nk-trust-item" key={title}><Icon size={28} aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div></div>)}</section>;
}

export function Breadcrumb({ items }: { items: string[] }) {
  return <div className="breadcrumb container-wide">{items.map((item, index) => <span key={item} className={index === items.length - 1 ? "current" : ""}>{item}{index < items.length - 1 && <ChevronDown size={13} />}</span>)}</div>;
}
