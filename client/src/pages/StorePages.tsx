import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowDownRight, ArrowLeft, ArrowRight, Award, BadgeCheck, BookOpen, CalendarDays, Check, ChevronDown, Clock3, Globe, Handshake, Heart, Instagram, Landmark, Lightbulb, Mail, MapPin, Minus, PackageCheck, PlayCircle, Plus, Scissors, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Truck, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import { useSearch } from "wouter";
import { Breadcrumb, COLLECTIONS, PageIntro, Pill, ProductCard, SectionHeading, TrustStrip } from "@/components/store/StoreShell";
import { BecomeSellerButton } from "@/components/store/BecomeSellerButton";
import { money, products, useStore, type Product } from "@/store";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { clearCheckoutIdempotencyKeys, getCheckoutIdempotencyKey } from "@/lib/checkout-idempotency";
import { useAuth } from "@/_core/hooks/useAuth";
import { safeHostedCheckoutUrl } from "@/lib/checkout-url";

const heroImage = "/naijakoblas-hero.jpg";

function sellerCtaFor(role?: string) {
  return role === "seller" ? ["Seller Dashboard", "/seller"] : role === "staff" ? ["Staff Portal", "/staff"] : role === "admin" ? ["Admin Console", "/admin"] : ["Become a Maker", "/vendor"];
}

export function CollectionCards() {
  return <div className="nk-collections">{COLLECTIONS.map(({ name, blurb, image, position, icon: Icon }) => <Link key={name} href={`/products?category=${name}`} className="nk-collection-card">
    <img src={image} alt="" loading="lazy" style={position ? { objectPosition: position } : undefined} />
    <div><Icon size={20} aria-hidden="true" /><strong>{name}</strong><span>{blurb}</span></div>
    <span className="nk-round-arrow" aria-hidden="true"><ArrowRight size={14} /></span>
  </Link>)}</div>;
}

export function MakersExhibitionPanels() {
  return <section className="container-wide nk-panels">
    <article className="nk-panel nk-panel--makers">
      <img src="/nk/nk-craftsman.jpg" alt="Nigerian leather craftsman at work" loading="lazy" />
      <div><span className="eyebrow">Meet the makers</span><h2>The People Behind the Craft</h2><p>A growing community of Nigerian artisans preserving tradition, creating jobs and shaping the future of African leather.</p><Link href="/makers" className="button button--outline">Meet Our Makers <ArrowRight size={16} /></Link></div>
    </article>
    <article className="nk-panel nk-panel--exhibition">
      <div><span className="nk-tag"><CalendarDays size={14} aria-hidden="true" /> Proposed for April 2027</span><h2>NaijaKoblas Exhibition 2027</h2><p>A gathering that celebrates Nigerian leather craftsmanship, unites makers, brands and partners, and showcases the best of our creativity to the world.</p><Link href="/exhibition" className="button button--dark">Register Your Interest <ArrowRight size={16} /></Link></div>
      <img src="/nk/nk-hands-to-world.jpg" alt="" loading="lazy" />
    </article>
  </section>;
}

export function HomePage() {
  const { catalogProducts, catalogLoading, catalogError } = useStore();
  const auth = useAuth();
  const sellerCta = sellerCtaFor(auth.user?.role);
  return <main className="nk-home">
    <section className="nk-story-hero">
      <div className="nk-ankara" aria-hidden="true" />
      <div className="container-wide nk-story-hero-inner">
        <div className="nk-story-hero-copy">
          <span className="nk-kicker">The Nigerian leather marketplace</span>
          <h1>More Than Leather. <em>A Story of Nigerian Craftsmanship.</em></h1>
          <p>Every piece has a story. Behind every stitch is a maker, a skill and a tradition worth celebrating.</p>
          <p>Discover leather goods crafted by Nigerian hands, inspired by our heritage and made to be appreciated around the world.</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/products">Explore the Collection <ArrowRight size={17} /></Link>
            <Link className="button button--outline nk-gold-outline" href="/about"><PlayCircle size={17} /> Discover Our Story</Link>
          </div>
        </div>
        <HeroGallery main={{ src: "/nk/nk-tote.jpg", alt: "NaijaKoblas leather tote with tassel" }} side={[["/nk/nk-jacket.jpg", "Black leather jacket"], ["/nk/nk-belt-brown.jpg", "Brown leather belt"], ["/nk/nk-belt-black.jpg", "Black leather belt"]]} />
      </div>
      <div className="container-wide nk-pillars">
        <Link href="/about#heritage" className="nk-pillar"><BookOpen size={30} aria-hidden="true" /><div><h3>Our Heritage</h3><p>Explore the history and cultural influences of Nigerian leather craft.</p></div></Link>
        <Link href="/makers" className="nk-pillar"><UsersRound size={30} aria-hidden="true" /><div><h3>Our Makers</h3><p>Meet the people behind the craft and the stories they bring to life.</p></div></Link>
        <Link href="/about#impact" className="nk-pillar"><Globe size={30} aria-hidden="true" /><div><h3>Our Vision</h3><p>Taking Nigerian creativity and craftsmanship to the world.</p></div></Link>
      </div>
      <TrustStrip />
    </section>
    <section className="nk-cream">
      <div className="container-wide">
        <SectionHeading eyebrow="Shop by collection" title="Explore Nigerian Leather" action={<Link href="/products" className="nk-text-link">View All Collections <ArrowRight size={15} /></Link>} />
        <p className="nk-section-sub">A curated collection of authentic, handcrafted leather goods.</p>
        <CollectionCards />
      </div>
    </section>
    <section className="container-wide nk-arrivals">
      <SectionHeading eyebrow="Fresh from the workshop" title="New Arrivals" action={<Link href="/products" className="nk-text-link">Shop all <ArrowRight size={15} /></Link>} />
      {catalogLoading ? <p className="catalog-status">Loading products…</p> : catalogError ? <p className="portal-error">The live catalog is temporarily unavailable. Please try again shortly.</p> : catalogProducts.length ? <div className="product-grid product-grid--featured">{catalogProducts.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>Our collection is getting ready.</h3><p>Approved products from our makers will appear here soon.</p><Link className="button button--outline" href={sellerCta[1]}>{sellerCta[0]}</Link></div>}
    </section>
    <section className="container-wide nk-stories" id="stories">
      <div className="nk-stories-intro"><span className="nk-kicker">Stories & insights</span><h2>From the Workshop</h2><p>Stories, ideas and updates from Nigerian leather makers, designers and the NaijaKoblas community.</p></div>
      <div className="nk-story-cards">
        {([["/nk/nk-story-maker.jpg", "Maker story", "From Ideas to Leather: A Maker's Journey"], ["/nk/nk-story-heritage.jpg", "Heritage", "The Nigerian Leather Craft: Past, Present and Future"], ["/nk/nk-story-care.jpg", "Guide", "Caring for Your Leather Goods: Simple, Practical Tips"]] as const).map(([image, tag, title]) => <article className="nk-story-card nk-patterned" key={title}><img src={image} alt="" loading="lazy" /><div><span className="nk-badge">{tag}</span><h3>{title}</h3><small>Coming soon</small></div></article>)}
      </div>
    </section>
    <MakersExhibitionPanels />
  </main>;
}

function HeroGallery({ main, side }: { main: { src: string; alt: string }; side: Array<[string, string]> }) {
  return <div className="nk-gallery">
    <img className="nk-gallery-main" src={main.src} alt={main.alt} />
    <div className="nk-gallery-side">{side.map(([src, alt]) => <img key={src} src={src} alt={alt} />)}</div>
  </div>;
}

export function MakersPage() {
  const { catalogProducts, catalogLoading } = useStore();
  const auth = useAuth();
  const sellerCta = sellerCtaFor(auth.user?.role);
  const makers = useMemo(() => {
    const byStore = new Map<number, { id: number; name: string; city: string; image: string; count: number; categories: Set<string> }>();
    for (const product of catalogProducts) {
      if (!product.storeId) continue;
      const entry = byStore.get(product.storeId) ?? { id: product.storeId, name: product.maker, city: product.experience?.replace(", Nigeria", "") ?? "Nigeria", image: product.image, count: 0, categories: new Set<string>() };
      entry.count += 1;
      entry.categories.add(product.category);
      byStore.set(product.storeId, entry);
    }
    return [...byStore.values()].sort((a, b) => b.count - a.count);
  }, [catalogProducts]);
  return <main className="nk-page">
    <section className="container-wide nk-page-head"><span className="nk-kicker">Makers & exhibition</span><h1>Meet the <em>Makers</em></h1><p>The independent Nigerian artisans behind every NaijaKoblas piece. Visit a store to see their story and full collection.</p></section>
    <section className="container-wide">
      {catalogLoading ? <p className="catalog-status">Loading makers…</p> : makers.length ? <div className="nk-makers">{makers.map(maker => <Link key={maker.id} href={`/store/${maker.id}`} className="nk-maker-card">
        <img src={maker.image} alt="" loading="lazy" />
        <div><strong>{maker.name}</strong><span><MapPin size={13} aria-hidden="true" /> {maker.city}</span><small>{maker.count} {maker.count === 1 ? "product" : "products"} · {[...maker.categories].slice(0, 3).join(", ")}</small></div>
        <span className="nk-round-arrow" aria-hidden="true"><ArrowRight size={14} /></span>
      </Link>)}</div> : <div className="empty-state"><h3>Our first makers are getting ready.</h3><p>Stores appear here once their products are approved.</p></div>}
    </section>
    <MakersExhibitionPanels />
    <section className="container-wide nk-maker-band"><BadgeCheck size={28} aria-hidden="true" /><div><h2>Are You a Maker?</h2><p>Join NaijaKoblas and showcase your leather products to a wider audience.</p></div><Link href={sellerCta[1]} className="button button--dark">{sellerCta[0] === "Become a Maker" ? "Register Your Interest" : sellerCta[0]} <ArrowRight size={16} /></Link></section>
  </main>;
}

export function ExhibitionPage() {
  const [email, setEmail] = useState("");
  const subscribe = trpc.submissions.subscribe.useMutation();
  const auth = useAuth();
  const sellerCta = sellerCtaFor(auth.user?.role);
  const points: Array<[LucideIcon, string, string]> = [
    [Scissors, "See the Craft", "Experience the creativity, skill and detail behind Nigerian-made leather goods."],
    [UsersRound, "Meet the Hands Behind It", "Discover the journeys of artisans, designers and brands shaping the work."],
    [Handshake, "Connect Beyond the Exhibition", "Build meaningful relationships with makers, buyers, partners and supporters."],
  ];
  return <main className="nk-page nk-exhibition">
    <section className="container-wide nk-story-hero-inner nk-exhibition-top">
      <div className="nk-story-hero-copy">
        <span className="nk-tag"><CalendarDays size={14} aria-hidden="true" /> Proposed for April 2027</span>
        <h1>NaijaKoblas <em>Exhibition 2027</em></h1>
        <p className="nk-tagline">Every Stitch Has a Story. Every Maker Has a Journey.</p>
        <span className="nk-rule" aria-hidden="true" />
        <p>A gathering being planned to celebrate Nigeria's leather craftsmanship, creativity and heritage. Come to discover the makers, the stories behind the products and the possibilities that connect Naija to the world. Dates and venue are not yet confirmed. Register your interest and we'll share updates as plans take shape.</p>
        <form className="nk-waitlist-form" onSubmit={event => { event.preventDefault(); subscribe.mutate({ email, source: "exhibition" }); }}>
          <label className="nk-input"><Mail size={16} aria-hidden="true" /><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email address" aria-label="Your email address" /></label>
          <button className="button button--dark" type="submit" disabled={subscribe.isPending}>{subscribe.isSuccess ? "Interest registered" : subscribe.isPending ? "Saving…" : "Register Interest"} <ArrowRight size={16} /></button>
          {subscribe.error && <small className="form-error" role="status">{subscribe.error.message}</small>}
          {subscribe.isSuccess && <small className="form-success" role="status">Thanks! We'll email you when there's news about the exhibition.</small>}
        </form>
      </div>
      <HeroGallery main={{ src: "/nk/nk-exhibition-bag.jpg", alt: "NaijaKoblas leather briefcase" }} side={[["/nk/nk-hands-stitch.jpg", "Hands stitching leather"], ["/nk/nk-leather-rolls.jpg", "Rolls of tanned leather"], ["/nk/nk-brogues.jpg", "Leather brogues"]]} />
    </section>
    <section className="container-wide nk-exhibition-points">{points.map(([Icon, title, copy]) => <article className="nk-patterned" key={title}><Icon size={40} aria-hidden="true" /><div><h2>{title}</h2><p>{copy}</p></div></article>)}</section>
    <section className="container-wide"><div className="nk-exhibit-band">
      <div className="nk-ankara-edge" aria-hidden="true" />
      <div className="nk-exhibit-copy"><h2>Want to Exhibit?</h2><span className="nk-rule" aria-hidden="true" /><p>Are you a Nigerian leather artisan, designer or brand owner? Be among the first to hear about exhibitor opportunities as NaijaKoblas Exhibition 2027 takes shape.</p></div>
      <Link href={sellerCta[1]} className="button button--dark">{sellerCta[0] === "Become a Maker" ? "Register Exhibitor Interest" : sellerCta[0]} <ArrowRight size={16} /></Link>
    </div></section>
  </main>;
}

function ArrowUpRight() { return <ArrowRight className="arrow-up-right" size={21} />; }

function ProductGallery({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(images[0] ?? product.image);
  useEffect(() => setActiveImage(images[0] ?? product.image), [product.id, product.image, images[0]]);
  return <div className="detail-gallery">
    <div className="detail-image"><img src={activeImage} alt={product.name} /></div>
    {images.length > 1 && <div className="detail-thumbnails" aria-label={`${images.length} product photos`}>
      {images.map((image, index) => <button key={`${image}-${index}`} type="button" className={activeImage === image ? "selected" : ""} aria-label={`Show product photo ${index + 1}`} aria-pressed={activeImage === image} onClick={() => setActiveImage(image)}><img src={image} alt="" loading="lazy" /></button>)}
    </div>}
  </div>;
}

export function ProductsPage() {
  const [, navigate] = useLocation();
  const { catalogProducts, catalogLoading, catalogError, wishlist } = useStore();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const savedOnly = params.get("saved") === "1";
  const [category, setCategory] = useState(params.get("category") ?? "All");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  // Header search and collection links change the URL while this page stays mounted.
  useEffect(() => {
    const next = new URLSearchParams(searchString);
    setCategory(next.get("category") ?? "All");
    setSearch(next.get("q") ?? "");
  }, [searchString]);
  const [showFilters, setShowFilters] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterCloseRef = useRef<HTMLButtonElement | null>(null);
  const filterSidebarRef = useRef<HTMLElement | null>(null);
  const [priceFloor, setPriceFloor] = useState(0);
  const catalogMaxPrice = Math.max(0, ...catalogProducts.map(product => product.price));
  const [priceCeiling, setPriceCeiling] = useState<number | null>(null);
  const effectivePriceCeiling = priceCeiling ?? catalogMaxPrice;
  const categories = ["All", ...new Set([...COLLECTIONS.map(item => item.name), ...catalogProducts.map(product => product.category)])];
  const visible = useMemo(() => {
    const list = catalogProducts
      .filter((product) => !savedOnly || wishlist.includes(product.id))
      .filter((product) => category === "All" || product.category === category)
      .filter((product) => `${product.name} ${product.maker} ${product.category}`.toLowerCase().includes(search.toLowerCase()))
      .filter((product) => product.price >= priceFloor && product.price <= effectivePriceCeiling);
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [catalogProducts, savedOnly, wishlist, category, search, priceFloor, effectivePriceCeiling, sort]);
  const selectCategory = (value: string) => {
    setCategory(value);
    navigate(value === "All" ? "/products" : `/products?category=${value}`);
  };
  const clearFilters = () => {
    setCategory("All"); setSearch(""); setPriceFloor(0); setPriceCeiling(null); navigate("/products");
  };
  const closeFilters = () => {
    setShowFilters(false);
    window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
  };
  useEffect(() => {
    if (!showFilters) return;
    const sidebar = filterSidebarRef.current;
    if (!sidebar) return;
    document.body.classList.add("filter-drawer-open");
    const focusFrame = window.requestAnimationFrame(() => filterCloseRef.current?.focus());
    const close = () => {
      setShowFilters(false);
      window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const focusIsOutside = !sidebar.contains(document.activeElement);
      if (event.shiftKey && (focusIsOutside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focusIsOutside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth <= 640) return;
      setShowFilters(false);
      window.requestAnimationFrame(() => sidebar.querySelector<HTMLElement>("input")?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("filter-drawer-open");
    };
  }, [showFilters]);
  return <main className="catalog-page">
    <section className="catalog-page-head container-wide nk-page-head"><h1>{savedOnly ? <>Saved <em>Items</em></> : <>Shop <em>Collections</em></>}</h1><p>{savedOnly ? "The pieces you've hearted. Saved on this device." : "Explore authentic, handcrafted leather goods from Nigerian makers."}</p>
      <div className="nk-chips" role="toolbar" aria-label="Filter by collection">{["All", ...COLLECTIONS.map(item => item.name)].map(item => { const Icon = COLLECTIONS.find(entry => entry.name === item)?.icon; return <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => selectCategory(item)}>{Icon && <Icon size={15} aria-hidden="true" />}{item}</button>; })}</div>
    </section>
    <section className="catalog-layout container-wide">
      <aside id="product-filter-panel" ref={filterSidebarRef} className={`filter-sidebar ${showFilters ? "filter-sidebar--open" : ""}`} role={showFilters ? "dialog" : "region"} aria-labelledby="filter-drawer-title" aria-modal={showFilters ? "true" : undefined} onClick={event => { if (event.target === event.currentTarget && showFilters) closeFilters(); }}>
        <div className="filter-mobile-heading"><strong id="filter-drawer-title">Filters</strong><button ref={filterCloseRef} type="button" aria-label="Close filters" onClick={closeFilters}><X size={20} /></button></div>
        <label className="sidebar-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." /></label>
        <div className="sidebar-section"><span>Category</span>{categories.map((item) => <button key={item} className={`sidebar-category ${category === item ? "active" : ""}`} onClick={() => selectCategory(item)}><i>{category === item ? "✓" : ""}</i>{item === "All" ? "All Products" : item === "Bags" ? "Bags & Totes" : item}</button>)}</div>
        <div className="sidebar-section"><span>Price Range</span><div className="sidebar-price"><input aria-label="Minimum price" type="number" min="0" value={priceFloor || ""} placeholder="Min" onChange={(event) => setPriceFloor(Math.min(Number(event.target.value) || 0, effectivePriceCeiling))} /><b>—</b><input aria-label="Maximum price" type="number" min="0" value={priceCeiling ?? ""} placeholder={`Max (${Math.round(catalogMaxPrice).toLocaleString()})`} onChange={(event) => setPriceCeiling(Math.max(Number(event.target.value) || catalogMaxPrice, priceFloor))} /></div></div>
        <button className="apply-filter-button" onClick={closeFilters}>Apply Filters</button>
        <button className="sidebar-clear" onClick={clearFilters}>Clear Filters</button>
      </aside>
      <div className="catalog-results"><div className="catalog-results-heading"><span><b>{visible.length}</b> {visible.length === 1 ? "Product" : "Products"}</span><label className="nk-sort">Sort: <select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label><button ref={filterTriggerRef} type="button" className="catalog-filter-trigger" aria-expanded={showFilters} aria-controls="product-filter-panel" onClick={() => setShowFilters(true)}><SlidersHorizontal size={17} /> Filters</button></div>{catalogLoading ? <p className="catalog-status">Loading published artisan products…</p> : catalogError ? <p className="portal-error">The live catalog is temporarily unavailable. Please try again shortly.</p> : <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>}{!catalogLoading && !catalogError && visible.length === 0 && <div className="empty-state"><Search size={26} /><h3>No published pieces found</h3><p>Try a different search or browse all available products.</p><button className="button button--dark" onClick={clearFilters}>View all products</button></div>}</div>
    </section>
  </main>;
}

export function ProductDetailPage() {
  const [, params] = useRoute("/products/:id");
  const { addToCart, wishlist, toggleWishlist, catalogProducts, catalogLoading, catalogError } = useStore();
  const product = catalogProducts.find((item) => item.id === params?.id);
  const [size, setSize] = useState(product?.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => { setSize(product?.sizes[0] ?? ""); setQuantity(1); setAdded(false); }, [product?.id]);
  if (catalogLoading) return <main><PageIntro eyebrow="Product" title="Loading this artisan piece…" /></main>;
  if (catalogError) return <main><PageIntro eyebrow="Catalog unavailable" title="We can’t load this piece right now." copy="Please try again shortly." /><div className="empty-state container-wide"><Link className="button button--dark" href="/products">Browse Products <ArrowRight size={17} /></Link></div></main>;
  if (!product) return <main><PageIntro eyebrow="Not found" title="This piece has moved on." copy="The product is unavailable, out of stock, or no longer published by its seller." /><div className="empty-state container-wide"><Link className="button button--dark" href="/products">Browse Products <ArrowRight size={17} /></Link></div></main>;
  const saved = wishlist.includes(product.id);
  return <main><Breadcrumb items={["Home", "Products", product.name]} /><section className="product-detail container-wide"><ProductGallery product={product} /><div className="detail-copy"><span className="eyebrow">{product.category}</span><h1>{product.name}</h1><div className="detail-maker">by {product.storeId ? <Link href={`/store/${product.storeId}`}>{product.maker}</Link> : product.maker} <span className="verified"><span>✓</span> Reviewed listing</span></div><strong className="spotlight-price">{money(product.price)}</strong><p className="detail-description">{product.description}</p><div className="detail-rule" /><div className="selector-block"><div className="selector-label"><span>Size / style</span></div><div className="size-options">{product.sizes.map((item) => <button key={item} className={item === size ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div></div><div className="detail-actions"><div className="detail-quantity"><span className="quantity-label">QUANTITY</span><div className="quantity-control"><button onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={15} /></button><span>{quantity}</span><button disabled={quantity >= Math.min(product.inventoryCount ?? 20, 20)} onClick={() => setQuantity(value => Math.min(value + 1, product.inventoryCount ?? 20, 20))}><Plus size={15} /></button></div></div><button className="button button--dark button--wide" disabled={!size || !product.inventoryCount || quantity > product.inventoryCount} onClick={() => { for (let i = 0; i < quantity; i++) addToCart(product.id, size); setAdded(true); }}>{added ? "Added to Cart" : "Add to Cart"}<ShoppingBag size={17} /></button><button className={`wishlist-detail ${saved ? "saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label="Wishlist"><Heart size={20} fill={saved ? "currentColor" : "none"} /></button></div><div className="stock-note"><Check size={16} /> {product.inventoryCount} available · seller-fulfilled delivery</div><div className="shipping-note"><Truck size={17} /><span>Shipping is calculated by the server at checkout.<br /><small>{product.experience ?? "Made by a NaijaKoblas seller"}</small></span></div>{product.storeId ? <Link href={`/store/${product.storeId}`} className="maker-card maker-card--link" aria-label={`Visit ${product.maker}'s store`}><div className="maker-avatar">{product.maker.slice(0, 2).toUpperCase()}</div><div><strong>{product.maker}</strong><span>{product.experience ?? "NaijaKoblas seller"}</span><p>Visit the store to see more from this maker.</p></div><ArrowRight size={18} /></Link> : <div className="maker-card"><div className="maker-avatar">{product.maker.slice(0, 2).toUpperCase()}</div><div><strong>{product.maker}</strong><span>{product.experience ?? "NaijaKoblas seller"}</span><p>Sold by a NaijaKoblas marketplace seller.</p></div></div>}</div></section><section className="section section--tint detail-story"><div className="container-wide"><SectionHeading eyebrow="The Details" title="Crafted to go the distance." /><div className="detail-values"><div><ShieldCheck size={24} /><h3>Reviewed before listing</h3><p>Our team checks photos, descriptions and prices before a product goes live.</p></div><div><Sparkles size={24} /><h3>Made by people</h3><p>Every piece comes from an independent Nigerian maker.</p></div><div><Truck size={24} /><h3>Ready to travel</h3><p>Fulfilment starts after verified payment.</p></div></div></div></section></main>;
}

export function CartPage() {
  const [, navigate] = useLocation();
  const { cart, catalogProducts, catalogLoading, subtotal, shipping, total, updateQuantity, removeFromCart } = useStore();
  const unavailable = cart.some(line => !catalogProducts.some(product => product.id === line.productId));
  if (!cart.length) return <main><section className="empty-cart-reference container-wide"><ShoppingBag size={32} /><h1>Your cart is empty</h1><p>Add an available artisan listing to get started.</p><Link className="button button--dark" href="/products">Browse Products <ArrowRight size={17} /></Link></section></main>;
  return <main><PageIntro eyebrow="Your selection" title="Shopping Cart" copy={`${cart.reduce((sum, line) => sum + line.quantity, 0)} items in your cart`} /><section className="cart-layout container-wide"><div className="cart-lines">{cart.map((line) => {
    const product = catalogProducts.find(item => item.id === line.productId);
    return <article className="cart-line" key={`${line.productId}-${line.size}`}>
      {product ? <Link href={`/products/${product.id}`} className="cart-line-image"><img src={product.image} alt={product.name} /></Link> : <div className="cart-line-image"><PackageCheck size={24} /></div>}
      <div className="cart-line-copy"><div>{product ? <Link href={`/products/${product.id}`}><h3>{product.name}</h3></Link> : <h3>Listing no longer available</h3>}<p>{product ? `by ${product.maker}` : "Remove this item before checkout."}</p><span>Size: {line.size}</span></div><strong>{product ? money(product.price * line.quantity) : "Unavailable"}</strong><div className="cart-line-controls">{product && <div className="quantity-control"><button onClick={() => updateQuantity(line.productId, line.size, line.quantity - 1)}><Minus size={14} /></button><span>{line.quantity}</span><button disabled={line.quantity >= Math.min(product.inventoryCount ?? 20, 20)} onClick={() => updateQuantity(line.productId, line.size, line.quantity + 1)}><Plus size={14} /></button></div>}<button className="remove-button" onClick={() => removeFromCart(line.productId, line.size)}><X size={15} /> Remove</button></div>
    </div></article>;
  })}</div><aside className="summary-card"><h2>Order Summary</h2><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Shipping estimate</span><strong>{shipping === 0 ? "Free" : money(shipping)}</strong></div><div className="summary-total"><span>Estimated total</span><strong>{money(total)}</strong></div>{unavailable && <p className="portal-error">Remove unavailable items to continue.</p>}{catalogLoading && <p className="catalog-status">Refreshing prices and availability…</p>}<button className="button button--dark button--full" disabled={unavailable || catalogLoading || subtotal <= 0} onClick={() => navigate("/checkout")}>Proceed to Checkout <ArrowRight size={17} /></button><div className="summary-assurance"><ShieldCheck size={18} /><span>Secure hosted checkout<br /><small>The server recalculates prices, stock and delivery before redirect.</small></span></div></aside></section></main>;
}

export function CheckoutPage() {
  const { cart, catalogProducts, catalogLoading, subtotal, shipping } = useStore();
  const auth = trpc.auth.me.useQuery(undefined, { retry: false });
  const account = trpc.account.me.useQuery(undefined, { enabled: Boolean(auth.data), retry: false });
  const checkout = trpc.orders.createCheckout.useMutation();
  const [delivery, setDelivery] = useState<"standard" | "express">(() => new URLSearchParams(window.location.search).get("delivery") === "express" ? "express" : "standard");
  const [error, setError] = useState<string | null>(null);
  const cancelledCheckout = new URLSearchParams(window.location.search).get("cancelled") === "true";
  const deliveryCharge = delivery === "express" ? 7500 : shipping;
  const checkoutTotal = subtotal + deliveryCharge;
  const missingLine = cart.some(line => !catalogProducts.some(product => product.id === line.productId));
  if (catalogLoading || auth.isLoading || (auth.data && account.isLoading)) return <main><PageIntro eyebrow="Checkout" title="Preparing secure checkout…" /></main>;
  if (!auth.data) return <main><PageIntro eyebrow="Secure checkout" title="Sign in to place an order." copy="Your order and payment status will be tied to your authenticated customer account." /><div className="empty-state container-wide"><button className="button button--dark" onClick={() => startLogin()}>Sign in securely <ArrowRight size={17} /></button></div></main>;
  if (account.error) return <main><PageIntro eyebrow="Account unavailable" title="We could not load your saved checkout details." copy="Refresh the page or sign in again." /></main>;
  if (!cart.length) return <main><PageIntro eyebrow="Checkout" title="Nothing to check out yet." /><div className="empty-state container-wide"><Link className="button button--dark" href="/products">Continue Shopping</Link></div></main>;
  const profile = account.data?.profile;
  const submitCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (missingLine || cart.length > 30 || cart.some(line => line.quantity > 20)) {
      setError("Please review your cart. It contains an unavailable listing or exceeds checkout limits.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const customer = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
    };
    try {
      const idempotencyKey = await getCheckoutIdempotencyKey({
        ...customer,
        deliveryMethod: delivery,
        items: cart,
      });
      const result = await checkout.mutateAsync({
        ...customer,
        idempotencyKey,
        deliveryMethod: delivery,
        items: cart,
      });
      const checkoutUrl = safeHostedCheckoutUrl(result.authorizationUrl);
      if (!checkoutUrl) {
        throw new Error("The payment provider returned an untrusted checkout URL.");
      }
      window.location.assign(checkoutUrl);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Checkout could not be started. Please try again.";
      if (/expired|already paid|finished/i.test(message)) clearCheckoutIdempotencyKeys();
      setError(message);
    }
  };
  return <main><div className="checkout-steps container-wide"><span className="done">Cart</span><span className="active">Checkout</span><span>Payment confirmation</span></div><section className="checkout-layout container-wide"><div className="checkout-form"><span className="eyebrow">Secure checkout</span><h1>Shipping information</h1>{cancelledCheckout && <p className="payment-provider-note">You returned from the payment page without completing payment. Your pending checkout remains reserved; use the same details to reopen it, or contact support if the payment status is unclear.</p>}<form onSubmit={submitCheckout}><div className="form-grid"><Field name="firstName" label="FIRST NAME" placeholder="John" defaultValue={profile?.firstName ?? ""} required /><Field name="lastName" label="LAST NAME" placeholder="Doe" defaultValue={profile?.lastName ?? ""} required /><Field name="email" label="EMAIL" placeholder="john@example.com" type="email" defaultValue={profile?.email ?? auth.data.email ?? ""} required /><Field name="address" label="ADDRESS" placeholder="Street address" wide defaultValue={profile?.address ?? ""} required /><Field name="city" label="CITY" placeholder="Lagos" defaultValue={profile?.city ?? ""} required /><Field name="phone" label="PHONE" placeholder="+234" defaultValue={profile?.phone ?? ""} required /></div><div className="form-section"><h2>Delivery method</h2><Choice label="Standard Delivery" sub={shipping === 0 ? "Standard delivery · Free estimate" : `Standard delivery · ${money(shipping)} estimate`} checked={delivery === "standard"} onChange={() => setDelivery("standard")} /><Choice label="Express Delivery" sub="Express delivery · ₦7,500 estimate" checked={delivery === "express"} onChange={() => setDelivery("express")} /></div><p className="payment-provider-note"><ShieldCheck size={16} /> Payment is completed on a secure hosted page (Stripe Checkout). Card details are never entered on this site.</p>{error && <p className="portal-error" role="alert">{error}</p>}{missingLine && <p className="portal-error">Your cart contains an item that is no longer available.</p>}<button className="button button--dark button--full" type="submit" disabled={checkout.isPending || missingLine || cart.length > 30}>{checkout.isPending ? "Opening secure checkout…" : "Continue to Secure Payment"}<ArrowRight size={17} /></button></form></div><aside className="summary-card checkout-summary"><h2>Order Estimate</h2>{cart.map((line) => { const product = catalogProducts.find(item => item.id === line.productId); return product ? <div className="mini-line" key={`${line.productId}-${line.size}`}><img src={product.image} alt={product.name} /><div><strong>{product.name}</strong><span>Qty: {line.quantity} · {line.size}</span></div><b>{money(product.price * line.quantity)}</b></div> : null; })}<div className="summary-divider" /><div><span>Subtotal estimate</span><strong>{money(subtotal)}</strong></div><div><span>Delivery estimate</span><strong>{deliveryCharge === 0 ? "Free" : money(deliveryCharge)}</strong></div><div className="summary-total"><span>Estimate</span><strong>{money(checkoutTotal)}</strong></div><small>The server recalculates the final price and stock before creating the order.</small></aside></section></main>;
}

function Field({ name, label, placeholder, type = "text", wide = false, required = false, defaultValue }: { name?: string; label: string; placeholder: string; type?: string; wide?: boolean; required?: boolean; defaultValue?: string }) { return <label className={`form-field ${wide ? "form-field--wide" : ""}`}><span>{label}</span><input name={name} required={required} type={type} placeholder={placeholder} defaultValue={defaultValue} /></label>; }
function Choice({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: () => void }) { return <button type="button" className={`choice-row ${checked ? "selected" : ""}`} onClick={onChange}><span className="choice-radio" /> <span><strong>{label}</strong><small>{sub}</small></span><Truck size={17} /></button>; }

export function OrderConfirmationPage() {
  const paymentReference = new URLSearchParams(window.location.search).get("reference");
  const { clearCart } = useStore();
  const started = useRef(false);
  const cleared = useRef(false);
  const orders = trpc.orders.mine.useQuery(undefined, { enabled: Boolean(paymentReference), retry: false });
  const verify = trpc.orders.verifyMyPayment.useMutation({ onSuccess: () => { void orders.refetch(); } });
  useEffect(() => {
    if (paymentReference && !started.current) {
      started.current = true;
      verify.mutate({ reference: paymentReference });
    }
  }, [paymentReference, verify.mutate]);
  useEffect(() => {
    if (verify.data?.status === "paid" && !cleared.current) {
      cleared.current = true;
      clearCart();
      clearCheckoutIdempotencyKeys();
    }
    if (verify.data?.status === "failed") clearCheckoutIdempotencyKeys();
  }, [verify.data?.status, clearCart]);
  const order = orders.data?.find(item => item.reference === verify.data?.orderReference);
  const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  if (!paymentReference) return <main><PageIntro eyebrow="Payment status" title="No payment reference was supplied." copy="Open your order history to review existing purchases or return to the storefront." /><div className="empty-state container-wide"><Link className="button button--dark" href="/account">My account <ArrowRight size={17} /></Link></div></main>;
  const status = verify.data?.status;
  const heading = status === "paid" ? "Payment confirmed" : status === "failed" ? "Payment not completed" : "Confirming your payment";
  const message = status === "paid"
    ? "The payment provider and the NaijaKoblas order record confirm this payment. Your seller fulfillment status will update in your account."
    : status === "failed"
      ? "The payment provider reports this transaction failed or expired. Your cart remains saved so you can review availability and try again."
      : "Returning from the payment page is not by itself proof of payment. We are checking the transaction status against your order.";
  return <main><section className="confirmation-hero"><div className="confirmation-check">{status === "paid" ? <Check size={32} /> : <Clock3 size={28} />}</div><span className="eyebrow">Secure Checkout</span><h1>{heading}</h1><p>{message}</p>{verify.data?.orderReference && <span className="order-number">Order reference: <strong>{verify.data.orderReference}</strong></span>}</section>
    {order && status === "paid" && <section className="confirmation-layout container-wide"><div className="confirmation-card"><div className="confirmation-card-heading"><h2>Order Items</h2><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span></div>{order.items.map(line => <div className="confirmed-line" key={line.id}><div><strong>{line.nameSnapshot}</strong><span>Qty: {line.quantity} · Size: {line.size}</span></div><b>{money(line.lineTotalKobo / 100)}</b></div>)}<div className="confirmation-card-heading"><h2>Shipping Information</h2></div><div className="shipping-address"><strong>{order.firstName} {order.lastName}</strong><span>{order.address}</span><span>{order.city}, Nigeria</span><span>{order.deliveryMethod === "express" ? "Express delivery" : "Standard delivery"}</span></div></div><aside className="summary-card confirmation-total"><h2>Order Total</h2><div><span>Subtotal</span><strong>{money(order.subtotalKobo / 100)}</strong></div><div><span>Shipping</span><strong>{order.shippingKobo === 0 ? "Free" : money(order.shippingKobo / 100)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(order.totalKobo / 100)}</strong></div><p>Status: {order.status.replaceAll("_", " ")}</p></aside></section>}
    {verify.error && <p className="portal-error container-wide" role="alert">{verify.error.message} You can retry this check from your account order history.</p>}
    {status === "paid" && !order && <p className="catalog-status container-wide">Payment is confirmed. Loading your private order details…</p>}
    <section className="next-steps section section--tint"><div className="container-wide"><SectionHeading eyebrow="Next steps" title={status === "failed" ? "Try another checkout." : "Your orders stay in your account."} /><p className="confirmation-preview-note">Orders and fulfillment updates are available only after secure sign-in. Payment is confirmed server-side; returning to this page does not create a second charge.</p><div className="confirmation-actions"><Link className="button button--dark" href={status === "failed" ? "/checkout" : "/account"}>{status === "failed" ? "Review Cart" : "View My Account"} <ArrowRight size={17} /></Link><Link className="button button--outline" href="/products">Continue Shopping</Link></div></div></section>
  </main>;
}
function TimelineItem({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) { return <div className="timeline-item"><div className="timeline-icon">{icon}</div><strong>{title}</strong><p>{copy}</p></div>; }

export function AboutPage() {
  const auth = useAuth();
  const sellerCta = sellerCtaFor(auth.user?.role);
  const values: Array<[LucideIcon, string, string]> = [
    [Handshake, "Authenticity", "Celebrating the people behind the products."],
    [Landmark, "Heritage and Identity", "Honouring where the craft comes from."],
    [Lightbulb, "Creativity and Innovation", "Recognising the ideas shaping tomorrow."],
    [UsersRound, "Community and Opportunity", "Connecting makers, customers and supporters."],
    [Award, "Quality and Craftsmanship", "Appreciating the work behind every piece."],
    [Globe, "Cultural Pride and Global Discovery", "From Naija to the world."],
  ];
  return <main className="nk-about">
    <section className="nk-story-hero">
      <div className="nk-ankara" aria-hidden="true" />
      <div className="container-wide nk-story-hero-inner">
        <div className="nk-story-hero-copy">
          <span className="nk-kicker">Our story</span>
          <h1>Why NaijaKoblas? <em>More Than Leather. A Story Worth Telling.</em></h1>
          <p>A marketplace born from Nigerian creativity, skilled leather artisans and a rich cultural heritage. NaijaKoblas exists to celebrate the craft, connect makers with a wider audience, and help the world discover the people and stories behind every piece.</p>
          <div className="hero-actions">
            <Link className="button button--dark" href="/products">Explore the Collection <ArrowRight size={17} /></Link>
            <Link className="button button--outline nk-gold-outline" href={sellerCta[1]}><PlayCircle size={17} /> {sellerCta[0]}</Link>
          </div>
        </div>
        <HeroGallery main={{ src: "/nk/nk-tote.jpg", alt: "NaijaKoblas leather tote with tassel" }} side={[["/nk/nk-jacket.jpg", "Black leather jacket"], ["/nk/nk-belt-brown.jpg", "Brown leather belt"], ["/nk/nk-wallet-set.jpg", "Leather wallet, key holder and pouch"]]} />
      </div>
    </section>
    <section className="nk-cream" id="heritage">
      <div className="container-wide nk-mission">
        <div><span className="nk-kicker">Our mission</span><h2>Preserving Heritage <em>Through Storytelling and Commerce</em></h2></div>
        <p>NaijaKoblas celebrates Nigerian leather craftsmanship, connects makers with customers at home and abroad, and helps the stories behind the products travel further; turning individual craft into a shared Nigerian story.</p>
        <img src="/nk/nk-stitching.jpg" alt="Hands stitching a leather piece" loading="lazy" />
      </div>
    </section>
    <section className="container-wide nk-values">
      <span className="nk-kicker">What we stand for</span><h2>Our Core Values</h2>
      <div className="nk-values-grid">{values.map(([Icon, title, copy], index) => <article key={title}><span className="nk-value-icon"><Icon size={26} aria-hidden="true" /></span><div><h3><b>0{index + 1}</b> {title}</h3><p>{copy}</p></div></article>)}</div>
    </section>
    <section className="nk-cream">
      <div className="container-wide nk-people">
        <img src="/nk/nk-craftsman.jpg" alt="Nigerian leather craftsman at work" loading="lazy" />
        <div><h2>The People Behind the Craft</h2><p>At the heart of NaijaKoblas are Nigerian makers; skilled artisans with unique journeys, bold creativity and a deep commitment to quality. They turn raw leather into expression, livelihood and legacy, one piece at a time.</p><Link href="/makers" className="button button--dark">Meet the Makers <ArrowRight size={16} /></Link></div>
        <aside className="nk-month"><span className="nk-badge">Coming soon</span><h3>Craftsman of the Month</h3><p>A future spotlight celebrating the maker, story and skill behind one standout creation.</p></aside>
      </div>
      <div className="container-wide nk-duo" id="impact">
        <article className="nk-duo-world"><div><h2>From Nigerian Hands to the World</h2><p>Preserving and celebrating our heritage while creating global visibility for Nigerian leather craftsmanship; sharing our creativity, quality and cultural identity with a wider world.</p></div><img src="/nk/nk-hands-to-world.jpg" alt="NK monogram on leather beside Ankara fabric" loading="lazy" /></article>
        <article className="nk-duo-exhibition"><div><span className="nk-tag">Proposed for April 2027</span><h2>NaijaKoblas Exhibition 2027</h2><p>A landmark gathering to showcase Nigerian leather talent, stories, innovation and craftsmanship to a global audience.</p><Link href="/exhibition" className="button button--dark">Register Your Interest <ArrowRight size={16} /></Link></div><img src="/nk/nk-exhibition-tag.jpg" alt="" loading="lazy" /></article>
      </div>
    </section>
  </main>;
}

const faqs: Array<[string, string]> = [
  ["How do I track my order?", "Sign in and open My Account. Each paid order shows its status, and sellers add carrier and tracking details when they ship."],
  ["What's your return policy?", "Contact us with your order reference before sending anything back. Eligibility depends on the item and the seller, and we'll guide you through the next step."],
  ["How do sellers join?", "Create an account, then click Become a Seller. You can list products straight away; each listing is reviewed by our team before it appears in the shop."],
  ["Do you ship internationally?", "Not yet. We currently deliver within Nigeria, with standard and express options shown at checkout."],
  ["How do I pay?", "Checkout runs on Stripe's secure hosted page. Card details are never entered on NaijaKoblas."],
];

export function ContactPage() { const contact = trpc.submissions.contact.useMutation(); return <main><PageIntro eyebrow="Say hello" title="Contact Us" copy="Send a message to the NaijaKoblas support inbox. We store it for review; this form does not claim that an email has been sent." /><section className="contact-layout container-wide"><div className="contact-form-card"><h2>Send us a Message</h2><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); contact.mutate({ firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""), email: String(form.get("email") ?? ""), subject: String(form.get("subject") ?? ""), message: String(form.get("message") ?? "") }); }}><div className="form-grid"><Field name="firstName" label="FIRST NAME" placeholder="John" required /><Field name="lastName" label="LAST NAME" placeholder="Doe" required /><Field name="email" label="EMAIL" placeholder="john@example.com" type="email" required /><Field name="subject" label="SUBJECT" placeholder="How can we help?" wide required /><label className="form-field form-field--wide"><span>MESSAGE</span><textarea name="message" required minLength={10} placeholder="Tell us more..." rows={5} /></label></div><button className="button button--dark" type="submit" disabled={contact.isPending}>{contact.isSuccess ? "Stored in Support Inbox" : contact.isPending ? "Saving…" : "Send Message"}<ArrowRight size={17} /></button></form>{(contact.error || contact.isSuccess) && <p className={contact.error ? "form-error" : "form-success"} role="status">{contact.error?.message ?? "Thanks — your message is stored for support review."}</p>}</div><div className="contact-details"><span className="eyebrow">Find us here</span><ContactDetail href="mailto:hello@naijakoblas.com" icon={<Mail />} title="Email" copy="hello@naijakoblas.com" sub="For direct support enquiries" /><ContactDetail icon={<Clock3 />} title="Support hours" copy="Monday–Friday" sub="Local support availability may vary" /><ContactDetail icon={<MapPin />} title="Based in" copy="Lagos" sub="Nigeria" /></div></section><section className="faq-section section section--tint" id="faq"><div className="container-wide"><SectionHeading eyebrow="Need to know" title="Frequently Asked Questions" /><div className="faq-grid">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p>{answer}</p></details>)}</div></div></section></main>; }
function ContactDetail({ href, icon, title, copy, sub }: { href?: string; icon: React.ReactNode; title: string; copy: string; sub: string }) { const content = <><div className="contact-icon">{icon}</div><div><span>{title}</span><strong>{copy}</strong><small>{sub}</small></div></>; return href ? <a className="contact-detail" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{content}</a> : <div className="contact-detail">{content}</div>; }

export function VendorPage() {
  const benefits = [
    ["Simple request", "Request seller access from your NaijaKoblas account; an admin approves new sellers."],
    ["Optional store profile", "Choose your store name, city and description later from the seller workspace."],
    ["Reviewed listings", "Submit a listing and our team checks it, usually quickly. Approved listings go straight to the shop."],
    ["Paid-order visibility", "See your own order lines only after customer payment is verified."],
    ["Per-item fulfillment", "Move each paid line through processing, shipped and delivered states."],
    ["Your own dashboard", "Name your workspace, pick your colours and track listings, orders and sales in one place."],
  ];
  const steps = [["Request", "Sign in and request seller access; an admin approves it"], ["List", "Add photos, price, sizes and stock"], ["Get approved", "Our team reviews each listing before it goes live"], ["Sell & ship", "Fulfil paid orders and add tracking"]];
  return <main>
    <section className="vendor-hero container-wide"><div><Pill tone="lime">For Nigerian Artisans</Pill><h1>Start Selling.<br /><em>With Confidence.</em></h1><p>Request seller access after signing in. Once an admin approves you, list your products. Each listing is also reviewed before it goes live, so shoppers can buy with confidence.</p><div className="hero-actions"><a className="button button--dark" href="#apply">Become a Seller <ArrowRight size={17} /></a><a className="button button--outline" href="#process">How It Works <ArrowDownRight size={17} /></a></div></div><div className="vendor-illustration"><div className="vendor-stat"><strong>Seller workspace</strong><span>Listings · Stock · Fulfillment</span></div><img src={products[2].image} alt="Leather artisan product" /></div></section>
    <section className="vendor-stats"><div className="container-wide vendor-stats-grid"><div><strong>01</strong><span>Request and get approved</span></div><div><strong>02</strong><span>Listings reviewed for quality</span></div><div><strong>03</strong><span>Manage orders and sales</span></div></div></section>
    <section className="section container-wide" id="process"><SectionHeading eyebrow="Seller tools" title="A clear marketplace workflow" /><div className="benefits-grid">{benefits.map(([title, copy], index) => <div className="benefit-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></section>
    <section className="section section--dark" id="requirements"><div className="container-wide"><SectionHeading eyebrow="After activation" title="From your workspace to fulfillment" /><div className="process-grid">{steps.map(([title, copy], index) => <div className="process-item" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></div></section>
    <VendorRequirements /><SellerActivationPanel />
  </main>;
}

function VendorRequirements() {
  const requirements = [
    ["Verified account", "Sign in with your verified NaijaKoblas account"],
    ["Approved sellers", "Every new seller is approved by an admin before their workspace opens"],
    ["Optional profile", "Store name, city and description can be added later"],
    ["Listing approval", "Each listing needs a clear photo, accurate details and admin approval before it is visible"],
    ["Store controls", "Staff can still pause accounts for marketplace safety"],
    ["Payouts", "Customer payments are collected by NaijaKoblas through our payment provider; contact us about settlement"],
  ];
  return <section className="section vendor-requirements"><div className="container-wide"><SectionHeading eyebrow="What you need" title="Simple to start, built on trust" /><div className="benefits-grid">{requirements.map(([title, copy], index) => <div className="benefit-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></div></section>;
}

function SellerActivationPanel() {
  const auth = trpc.auth.me.useQuery(undefined, { retry: false });
  const account = trpc.account.me.useQuery(undefined, { enabled: Boolean(auth.data), retry: false });

  if (auth.isLoading || (auth.data && account.isLoading)) {
    return <section className="vendor-application section" id="apply"><div className="container-wide vendor-application-grid"><div><span className="eyebrow">Seller access</span><h2>Preparing your<br /><em>workspace.</em></h2></div></div></section>;
  }
  if (!auth.data) {
    return <section className="vendor-application section" id="apply"><div className="container-wide vendor-application-grid"><div><span className="eyebrow">Ready when you are</span><h2>Request your<br /><em>seller space.</em></h2><p>Sign in or create a NaijaKoblas account first, then send a seller request. You'll be notified when an admin approves it.</p></div><div className="vendor-auth-cta"><ShieldCheck size={24} /><strong>One account. More ways to participate.</strong><p>The same branded sign-in works for shopping, selling, staff and admin. Permissions remain server-controlled.</p><button className="button button--dark" type="button" onClick={() => startLogin("/vendor#apply")}>Sign in or create an account <ArrowRight size={17} /></button></div></div></section>;
  }
  if (account.error || !account.data) {
    return <section className="vendor-application section" id="apply"><div className="container-wide"><p className="portal-error">We could not confirm your account. Please refresh or sign in again.</p></div></section>;
  }

  const { user, sellerApplication } = account.data;
  const isTrustedStaff = user.role === "staff" || user.role === "admin";
  const sellerModerationBlocked = sellerApplication?.status === "rejected" || sellerApplication?.status === "suspended";
  const isActiveSeller = user.role === "seller" && !sellerModerationBlocked && sellerApplication?.status === "approved";
  const sellerRecordNeedsSupport = user.role === "seller" && !isActiveSeller && !sellerModerationBlocked && sellerApplication?.status !== "pending";
  const portalHref = user.role === "admin" ? "/admin" : "/staff";
  const portalName = user.role === "admin" ? "Administrator workspace" : "Staff workspace";
  const blockedStatusCopy = sellerApplication?.status === "suspended"
    ? "Seller access is paused. Contact NaijaKoblas support to request reinstatement."
    : "Seller access was previously declined. Contact NaijaKoblas support if you believe this is an error.";
  return <section className="vendor-application section" id="apply">
    <div className="container-wide vendor-application-grid">
      <div>
        <span className="eyebrow">{isTrustedStaff ? "Trusted account" : sellerModerationBlocked ? "Seller access restricted" : sellerRecordNeedsSupport ? "Seller record incomplete" : isActiveSeller ? "Seller access active" : sellerApplication?.status === "pending" ? "Request pending" : "Seller request"}</span>
        <h2>{isTrustedStaff
          ? <>Your trusted role<br /><em>is already active.</em></>
          : sellerModerationBlocked
            ? <>Seller access<br /><em>is restricted.</em></>
            : sellerRecordNeedsSupport
              ? <>Seller account<br /><em>needs support.</em></>
              : isActiveSeller
                ? <>Your seller space<br /><em>is ready.</em></>
                : <>Start selling.<br /><em>On your terms.</em></>}</h2>
        <p>{isTrustedStaff
          ? "Staff and administrators use their protected operations workspace; their privileged roles are never replaced by seller self-service."
          : sellerModerationBlocked
            ? blockedStatusCopy
            : sellerRecordNeedsSupport
              ? "The seller account record is incomplete. Contact NaijaKoblas support before continuing."
              : isActiveSeller
                ? "Your seller workspace is active. Continue to manage listings, stock and paid-order fulfillment."
                : sellerApplication?.status === "pending" ? "Your request is waiting for an administrator. You'll get a notification when it's reviewed." : "Send a request to become a seller. Once an admin approves it, your seller workspace opens and you can start listing products."}</p>
      </div>
      <div className="vendor-auth-cta">
        <BadgeCheck size={24} />
        <strong>{isTrustedStaff ? portalName : sellerModerationBlocked || sellerRecordNeedsSupport ? "Seller access needs support" : isActiveSeller ? "Seller workspace" : "Ready to become a seller"}</strong>
        {isTrustedStaff
          ? <Link href={portalHref} className="button button--dark">Open portal <ArrowRight size={17} /></Link>
          : <BecomeSellerButton role={user.role} applicationStatus={sellerApplication?.status ?? null} />}
        <Link href="/account" className="text-link">View your account <ArrowRight size={15} /></Link>
      </div>
    </div>
  </section>;
}

export function SellerStorePage() {
  const [, params] = useRoute("/store/:id");
  const storeId = Number(params?.id);
  const valid = Number.isInteger(storeId) && storeId > 0;
  const store = trpc.catalog.store.useQuery({ storeId }, { enabled: valid, retry: false });
  const { catalogProducts, catalogLoading } = useStore();
  const items = catalogProducts.filter(product => product.storeId === storeId);
  if (valid && store.isLoading) return <main><PageIntro eyebrow="Store" title="Loading this store…" /></main>;
  if (!valid || store.error || !store.data) return <main><PageIntro eyebrow="Store" title="This store isn't available." copy="It may have been paused or the link is wrong." /><div className="empty-state container-wide"><Link className="button button--dark" href="/products">Browse all products <ArrowRight size={17} /></Link></div></main>;
  const info = store.data;
  const since = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(new Date(info.createdAt));
  return <main className="seller-store-page" style={{ "--store-accent": info.accentColor } as React.CSSProperties}>
    <section className="seller-store-hero">
      <div className="container-wide seller-store-hero-inner">
        <div className="seller-store-avatar" aria-hidden="true">{info.displayName.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</div>
        <div>
          <span className="eyebrow">NaijaKoblas seller</span>
          <h1>{info.displayName}</h1>
          <p className="seller-store-meta"><MapPin size={15} /> {info.city}, Nigeria · Selling since {since} · {items.length} {items.length === 1 ? "product" : "products"}</p>
        </div>
      </div>
    </section>
    <section className="container-wide seller-store-body">
      {info.description && <div className="seller-store-about"><h2>About the store</h2><p>{info.description}</p></div>}
      <SectionHeading eyebrow="From this maker" title="Products" />
      {catalogLoading ? <p className="catalog-status">Loading products…</p> : items.length ? <div className="product-grid">{items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>No products available right now</h3><p>Check back soon. New listings appear once they're approved.</p></div>}
    </section>
  </main>;
}

export function InfoPage() { const [, params] = useRoute("/info/:topic"); const pages: Record<string, { eyebrow: string; title: string; intro: string; sections: [string, string][] }> = { help: { eyebrow: "Support", title: "Help Center", intro: "Practical answers for shopping with NaijaKoblas.", sections: [["Orders", "Use your order confirmation email to review your purchase and follow delivery updates."], ["Product care", "Each product page lists material details and care guidance so your leather goods grow more beautiful with time."], ["Need a hand?", "Our team is available Monday to Friday, 9am–6pm WAT at hello@naijakoblas.com."]] }, shipping: { eyebrow: "Support", title: "Shipping Information", intro: "We deliver authentic craft across Nigeria with care.", sections: [["Standard Delivery", "Delivery availability and estimates are shown during checkout after the server confirms the order details."], ["Express Delivery", "Where an express option is available, its current estimate and price are shown during checkout."], ["Tracking", "Paid orders and seller fulfilment updates remain available in your account; email delivery is not assumed."]] }, returns: { eyebrow: "Support", title: "Returns", intro: "We want you to feel confident in every piece you choose.", sections: [["14-day returns", "Return eligibility depends on the product, seller and the applicable support decision; contact us before sending anything back."], ["Start a return", "Contact support with your order number and our team will guide you through the next step."], ["Your refund", "Any approved payment correction follows the applicable provider and marketplace review process; this site does not promise an automatic refund."]] }, privacy: { eyebrow: "Legal", title: "Privacy Policy", intro: "Your data is treated with the same care as the craft we champion.", sections: [["What we collect", "We use the contact and delivery details you provide to fulfil orders and support your experience."], ["How we use it", "We never sell personal information. We use it only to operate NaijaKoblas and communicate about your order or opted-in updates."], ["Your choices", "You can contact us to update your details or unsubscribe from marketing messages at any time."]] }, terms: { eyebrow: "Legal", title: "Terms of Service", intro: "A clear agreement for a considered marketplace.", sections: [["Marketplace role", "NaijaKoblas connects shoppers with Nigerian artisans and their work."], ["Orders", "Placing an order confirms your selected product, delivery details and checkout total."], ["Support", "For questions about an order or these terms, contact hello@naijakoblas.com."]] } }; const page = pages[params?.topic ?? "help"] ?? pages.help; return <main><PageIntro eyebrow={page.eyebrow} title={page.title} copy={page.intro} /><section className="info-page container-wide">{page.sections.map(([heading, copy], index) => <article key={heading}><span>0{index + 1}</span><div><h2>{heading}</h2><p>{copy}</p></div></article>)}<Link href="/contact" className="button button--dark">Contact Support <ArrowRight size={17} /></Link></section></main>; }

export function WaitlistPage() { const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); return <main className="waitlist-page"><section className="waitlist-hero"><div className="waitlist-nav container-wide"><Link href="/" className="brand-mark"><span>NK</span><strong>NaijaKoblas</strong></Link><span className="eyebrow">Coming Soon</span></div><div className="waitlist-copy container-wide"><span className="eyebrow">Built from</span><h1>culture.</h1><span className="eyebrow">Worn with</span><h1><em>purpose.</em></h1><p>NaijaKoblas is creating a platform that brings Nigerian craftsmanship closer to the world.</p><small>Our full platform is currently in development</small><form onSubmit={(event) => { event.preventDefault(); if (email) setSent(true); }}><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" /><button className="button button--lime">{sent ? "You're on the list" : "Join Early Access"}<ArrowRight size={17} /></button></form><span className="waitlist-note">No spam. No noise. Just first access when we go live.</span></div><div className="waitlist-scroll"><span>Scroll</span><ArrowDownRight size={18} /></div></section><section className="waitlist-features container-wide"><WaitFeature title="Handcrafted Sneakers" copy="Authentic Nigerian-made" image={products[0].image} /><WaitFeature title="Premium Belts" copy="Nigerian-made craft" image={products[2].image} /><WaitFeature title="Artisan Boots" copy="Made with heritage" image={products[8].image} /></section><section className="waitlist-story section container-wide"><span className="eyebrow">What to expect</span><h2>A marketplace unlike<br /><em>anything before it.</em></h2><div className="waitlist-story-grid"><p>From handmade leather shoes to premium artisan products, we're building a space where quality craftsmanship gets the attention it deserves.</p><div><strong>Join those already on the list</strong><span>Free to join. First access when we launch.</span><Link href="/products" className="text-link">Explore the collection <ArrowRight size={16} /></Link></div></div></section><section className="waitlist-social section section--dark"><div className="container-wide"><span className="eyebrow eyebrow--light">Stay connected</span><h2>Follow the journey<br /><em>as we build.</em></h2><p>Get behind-the-scenes updates, artisan stories, and more.</p><div className="social-links"><a href="https://instagram.com"><Instagram size={18} /> Instagram</a><a href="https://linkedin.com"><span>in</span> LinkedIn</a><a href="https://wa.me"><span>WA</span> WhatsApp</a></div></div></section></main>; }
function WaitFeature({ title, copy, image }: { title: string; copy: string; image: string }) { return <div className="wait-feature"><img src={image} alt="" /><div><span>{copy}</span><h3>{title}</h3></div></div>; }
