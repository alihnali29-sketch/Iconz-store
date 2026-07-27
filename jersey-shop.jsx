import React, { useState, useEffect, useRef } from "react";
import { Lock, Unlock, X, Plus, Pencil, Trash2, ChevronLeft, KeyRound, ArrowUp, ArrowDown, Palette, RefreshCw, AlertTriangle } from "lucide-react";

const DEFAULT_PASSWORD = "admin123";
const uid = () => Math.random().toString(36).slice(2, 10);

const FONT_PAIRS = {
  "oswald-inter": { display: "'Oswald', sans-serif", body: "'Inter', sans-serif", label: "Oswald + Inter (athletic)" },
  "playfair-inter": { display: "'Playfair Display', serif", body: "'Inter', sans-serif", label: "Playfair + Inter (editorial)" },
  "bebas-work": { display: "'Bebas Neue', sans-serif", body: "'Work Sans', sans-serif", label: "Bebas Neue + Work Sans (bold)" },
  "spacegrotesk": { display: "'Space Grotesk', sans-serif", body: "'Space Grotesk', sans-serif", label: "Space Grotesk (modern)" },
};
const RADIUS_PX = { sharp: "2px", soft: "8px", rounded: "18px" };

const defaultTheme = () => ({
  bg: "#0E1526",
  panel: "#171D2B",
  accent: "#D4A73A",
  text: "#EDEAE3",
  radius: "soft",
  fontPair: "oswald-inter",
});

const defaultData = () => ({
  siteName: "IRONCLAD JERSEYS",
  tagline: "Built for the pitch. Made for the streets.",
  heroImage: "https://picsum.photos/seed/ironclad-hero/1400/900",
  theme: defaultTheme(),
  categories: [
    {
      id: "new",
      number: "01",
      name: "New Jerseys",
      description: "Fresh drops, straight off the rack.",
      cover: "https://picsum.photos/seed/newjerseys/700/900",
      products: [
        { id: uid(), name: "Aurora Away Kit", price: 64.99, number: "9", image: "https://picsum.photos/seed/prod-aurora/700/900", description: "Lightweight away kit with breathable mesh panels." },
        { id: uid(), name: "Skyline Home Kit", price: 69.99, number: "10", image: "https://picsum.photos/seed/prod-skyline/700/900", description: "This season's home shirt, engineered for match day." },
        { id: uid(), name: "Nightfall Third Kit", price: 59.99, number: "7", image: "https://picsum.photos/seed/prod-nightfall/700/900", description: "Limited third kit in a deep charcoal colorway." },
      ],
    },
    {
      id: "season",
      number: "02",
      name: "Season Jerseys",
      description: "The current lineup, ready to wear.",
      cover: "https://picsum.photos/seed/seasonjerseys/700/900",
      products: [
        { id: uid(), name: "2026 Home Jersey", price: 54.99, number: "23", image: "https://picsum.photos/seed/prod-home26/700/900", description: "Official home jersey for the current season." },
        { id: uid(), name: "2026 Away Jersey", price: 54.99, number: "11", image: "https://picsum.photos/seed/prod-away26/700/900", description: "Official away jersey for the current season." },
        { id: uid(), name: "Training Tee", price: 34.99, number: "4", image: "https://picsum.photos/seed/prod-training/700/900", description: "Everyday training tee in team colors." },
      ],
    },
    {
      id: "classic",
      number: "03",
      name: "Classic Jerseys",
      description: "Retro cuts. Timeless numbers.",
      cover: "https://picsum.photos/seed/classicjerseys/700/900",
      products: [
        { id: uid(), name: "'94 Retro Home", price: 79.99, number: "8", image: "https://picsum.photos/seed/prod-retro94/700/900", description: "Faithful reissue of the 1994 home kit." },
        { id: uid(), name: "'01 Retro Away", price: 79.99, number: "14", image: "https://picsum.photos/seed/prod-retro01/700/900", description: "Faithful reissue of the 2001 away kit." },
        { id: uid(), name: "Legends Jersey", price: 89.99, number: "00", image: "https://picsum.photos/seed/prod-legends/700/900", description: "Tribute jersey honoring the club's legends." },
      ],
    },
  ],
  sections: [{ id: "s-categories", type: "categories", title: "Shop by collection" }],
});

/* ---------- storage helpers: never let a save silently vanish ---------- */

async function saveWithRetry(key, valueStr, maxAttempts = 6) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      if (typeof window === "undefined" || !window.storage) throw new Error("storage unavailable");
      await window.storage.set(key, valueStr, true);
      return true;
    } catch (e) {
      attempt++;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return false;
}

async function loadKey(key) {
  try {
    if (typeof window === "undefined" || !window.storage) return null;
    const res = await window.storage.get(key, true);
    return res && res.value ? res.value : null;
  } catch (e) {
    return null;
  }
}

/* ---------- error boundary so a bug never shows a blank page ---------- */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#0E1526", color: "#EDEAE3", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24, textAlign: "center" }}>
          <div>
            <p style={{ fontSize: 15, marginBottom: 12 }}>Something went wrong loading the shop.</p>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: "#D4A73A", color: "#0E1526", border: "none", borderRadius: 6, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <JerseyShop />
    </ErrorBoundary>
  );
}

function JerseyShop() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState({ type: "home" });
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editingSiteInfo, setEditingSiteInfo] = useState(false);

  const pendingDataRef = useRef(null);
  const savingRef = useRef(false);

  // Loading: guaranteed to finish even if storage misbehaves.
  useEffect(() => {
    let finished = false;
    const fallback = setTimeout(() => {
      if (!finished) {
        setData((prev) => prev || defaultData());
        setLoading(false);
      }
    }, 4000);

    (async () => {
      let loadedData = defaultData();
      let loadedPassword = DEFAULT_PASSWORD;
      const rawData = await loadKey("site-data");
      if (rawData) {
        try {
          const parsed = JSON.parse(rawData);
          loadedData = { ...defaultData(), ...parsed, theme: { ...defaultTheme(), ...(parsed.theme || {}) } };
        } catch (e) {
          loadedData = defaultData();
        }
      }
      const rawPw = await loadKey("site-admin-password");
      if (rawPw) loadedPassword = rawPw;

      finished = true;
      clearTimeout(fallback);
      setData(loadedData);
      setPassword(loadedPassword);
      setLoading(false);
    })();

    return () => clearTimeout(fallback);
  }, []);

  async function flushSave() {
    if (savingRef.current) return;
    if (pendingDataRef.current === null) return;
    savingRef.current = true;
    const toSave = pendingDataRef.current;
    setSaveStatus("saving");
    const ok = await saveWithRetry("site-data", JSON.stringify(toSave));
    savingRef.current = false;
    if (ok) {
      if (pendingDataRef.current === toSave) {
        pendingDataRef.current = null;
        setSaveStatus("saved");
      } else {
        flushSave();
      }
    } else {
      setSaveStatus("error");
    }
  }

  function persist(newData) {
    setData(newData); // optimistic: the admin never waits on the network
    pendingDataRef.current = newData;
    flushSave();
  }

  async function persistPassword(newPass) {
    setPassword(newPass);
    const ok = await saveWithRetry("site-admin-password", newPass);
    if (!ok) {
      // password still works for this session even if sync failed; keep retrying quietly
      setTimeout(() => saveWithRetry("site-admin-password", newPass), 1500);
    }
  }

  if (loading || !data) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingTag}>LOADING SHOP</div>
      </div>
    );
  }

  const theme = { ...defaultTheme(), ...(data.theme || {}) };
  const fp = FONT_PAIRS[theme.fontPair] || FONT_PAIRS["oswald-inter"];
  const rootVars = {
    "--bg": theme.bg,
    "--panel": theme.panel,
    "--accent": theme.accent,
    "--text": theme.text,
    "--text-dim": `color-mix(in srgb, ${theme.text} 65%, transparent)`,
    "--line": `color-mix(in srgb, ${theme.text} 16%, transparent)`,
    "--radius": RADIUS_PX[theme.radius] || "8px",
    "--font-display": fp.display,
    "--font-body": fp.body,
    "--font-mono": "'Space Mono', monospace",
    "--danger": "#B23A3A",
  };

  const currentCategory = view.type === "category" ? data.categories.find((c) => c.id === view.id) : null;
  const dimPct = theme.backgroundDim ?? 70;

  return (
    <div style={{ ...styles.app, ...rootVars, position: "relative" }}>
      <GlobalStyle />

      {theme.backgroundImage && (
        <>
          <div style={{ ...styles.siteBgImage, backgroundImage: `url(${theme.backgroundImage})` }} />
          <div style={{ ...styles.siteBgOverlay, background: `color-mix(in srgb, var(--bg) ${dimPct}%, transparent)` }} />
        </>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
      <Header
        data={data}
        unlocked={unlocked}
        setView={setView}
        saveStatus={saveStatus}
        onRetrySave={() => flushSave()}
        onAdminClick={() => setShowLoginModal(true)}
        onExitAdmin={() => setUnlocked(false)}
        onChangePassword={() => setShowPasswordChange(true)}
        onEditSiteInfo={() => setEditingSiteInfo(true)}
        onOpenTheme={() => setShowTheme(true)}
      />

      {view.type === "home" && (
        <Home
          data={data}
          unlocked={unlocked}
          setView={setView}
          persist={persist}
          openEditCategory={setEditingCategory}
          openEditSection={setEditingSection}
        />
      )}

      {view.type === "category" && currentCategory && (
        <CategoryPage
          category={currentCategory}
          unlocked={unlocked}
          onBack={() => setView({ type: "home" })}
          openEditProduct={setEditingProduct}
          onDeleteProduct={(prodId) => {
            const newData = { ...data };
            const cat = newData.categories.find((c) => c.id === currentCategory.id);
            cat.products = cat.products.filter((p) => p.id !== prodId);
            persist(newData);
          }}
        />
      )}

      <footer style={styles.footer}>
        <span style={styles.footerText}>{data.siteName} — crafted with pride.</span>
      </footer>

      {showLoginModal && (
        <PasswordModal
          onClose={() => setShowLoginModal(false)}
          onSubmit={(pw) => {
            if (pw === password) {
              setUnlocked(true);
              setShowLoginModal(false);
              return true;
            }
            return false;
          }}
        />
      )}

      {showPasswordChange && (
        <ChangePasswordModal
          onClose={() => setShowPasswordChange(false)}
          onSave={(newPw) => {
            persistPassword(newPw);
            setShowPasswordChange(false);
          }}
        />
      )}

      {showTheme && (
        <ThemeModal
          theme={theme}
          onClose={() => setShowTheme(false)}
          onSave={(newTheme) => {
            persist({ ...data, theme: newTheme });
            setShowTheme(false);
          }}
        />
      )}

      {editingSiteInfo && (
        <SiteInfoModal
          data={data}
          onClose={() => setEditingSiteInfo(false)}
          onSave={(siteName, tagline, heroImage) => {
            persist({ ...data, siteName, tagline, heroImage });
            setEditingSiteInfo(false);
          }}
        />
      )}

      {editingCategory && (
        <CategoryModal
          category={editingCategory.isNew ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={(catFields) => {
            const newData = { ...data };
            if (editingCategory.isNew) {
              const nextNum = String(newData.categories.length + 1).padStart(2, "0");
              newData.categories = [...newData.categories, { id: uid(), number: nextNum, products: [], ...catFields }];
            } else {
              newData.categories = newData.categories.map((c) => (c.id === editingCategory.id ? { ...c, ...catFields } : c));
            }
            persist(newData);
            setEditingCategory(null);
          }}
          onDelete={
            editingCategory.isNew
              ? null
              : () => {
                  const newData = { ...data };
                  newData.categories = newData.categories.filter((c) => c.id !== editingCategory.id);
                  persist(newData);
                  setEditingCategory(null);
                  if (view.type === "category" && view.id === editingCategory.id) setView({ type: "home" });
                }
          }
        />
      )}

      {editingSection && (
        <SectionModal
          section={editingSection.isNew ? null : editingSection}
          onClose={() => setEditingSection(null)}
          onSave={(fields) => {
            const newData = { ...data };
            if (editingSection.isNew) {
              newData.sections = [...newData.sections, { id: uid(), type: "text", ...fields }];
            } else {
              newData.sections = newData.sections.map((s) => (s.id === editingSection.id ? { ...s, ...fields } : s));
            }
            persist(newData);
            setEditingSection(null);
          }}
        />
      )}

      {editingProduct && (
        <ProductModal
          product={editingProduct.isNew ? null : editingProduct.product}
          onClose={() => setEditingProduct(null)}
          onSave={(fields) => {
            const newData = { ...data };
            const cat = newData.categories.find((c) => c.id === editingProduct.categoryId);
            if (editingProduct.isNew) {
              cat.products = [...cat.products, { id: uid(), ...fields }];
            } else {
              cat.products = cat.products.map((p) => (p.id === editingProduct.product.id ? { ...p, ...fields } : p));
            }
            persist(newData);
            setEditingProduct(null);
          }}
        />
      )}
      </div>
    </div>
  );
}

/* ---------- Header ---------- */

function Header({ data, unlocked, setView, saveStatus, onRetrySave, onAdminClick, onExitAdmin, onChangePassword, onEditSiteInfo, onOpenTheme }) {
  return (
    <>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brandWrap} onClick={() => setView({ type: "home" })} role="button">
            <span style={styles.brandMark}>IC</span>
            <div>
              <div style={styles.brandName}>{data.siteName}</div>
              <div style={styles.brandTag}>{data.tagline}</div>
            </div>
          </div>

          <div style={styles.headerRight}>
            {unlocked && (
              <button style={styles.editSiteBtn} onClick={onEditSiteInfo}>
                <Pencil size={13} /> Edit site info
              </button>
            )}
            <button
              style={unlocked ? styles.adminBtnActive : styles.adminBtn}
              onClick={unlocked ? undefined : onAdminClick}
              title={unlocked ? "Admin mode is on" : "Admin login"}
            >
              {unlocked ? <Unlock size={15} /> : <Lock size={15} />}
              {unlocked ? "Admin mode: on" : "Admin"}
            </button>
          </div>
        </div>
      </header>

      {unlocked && (
        <div style={styles.adminBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={styles.adminBarText}>Editing mode is on — changes go live for every visitor.</span>
            <SaveIndicator status={saveStatus} onRetry={onRetrySave} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={styles.adminBarBtn} onClick={onOpenTheme}>
              <Palette size={13} /> Customize design
            </button>
            <button style={styles.adminBarBtn} onClick={onChangePassword}>
              <KeyRound size={13} /> Change password
            </button>
            <button style={styles.adminBarBtnGhost} onClick={onExitAdmin}>
              Exit editing
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SaveIndicator({ status, onRetry }) {
  if (status === "saving") return <span style={styles.saveTag}>Saving…</span>;
  if (status === "error")
    return (
      <button style={styles.saveTagError} onClick={onRetry}>
        <AlertTriangle size={12} /> Couldn't sync — retry
      </button>
    );
  return <span style={styles.saveTagOk}>Saved</span>;
}

/* ---------- Home ---------- */

function Home({ data, unlocked, setView, persist, openEditCategory, openEditSection }) {
  function moveSection(index, dir) {
    const newSections = [...data.sections];
    const target = index + dir;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    persist({ ...data, sections: newSections });
  }

  function deleteSection(id) {
    persist({ ...data, sections: data.sections.filter((s) => s.id !== id) });
  }

  return (
    <main>
      <section style={styles.hero}>
        <img src={data.heroImage} alt="" style={styles.heroImg} />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.heroEyebrow}>MATCH READY</div>
          <h1 style={styles.heroTitle}>{data.siteName}</h1>
          <p style={styles.heroSub}>{data.tagline}</p>
        </div>
      </section>

      {data.sections.map((section, idx) => (
        <div key={section.id} style={styles.sectionWrap}>
          {unlocked && (
            <div style={styles.sectionAdminBar}>
              <span style={styles.sectionAdminLabel}>Section</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={styles.iconBtnSmall} onClick={() => moveSection(idx, -1)} title="Move up">
                  <ArrowUp size={13} />
                </button>
                <button style={styles.iconBtnSmall} onClick={() => moveSection(idx, 1)} title="Move down">
                  <ArrowDown size={13} />
                </button>
                {section.type === "text" && (
                  <button style={styles.iconBtnSmall} onClick={() => openEditSection(section)} title="Edit section">
                    <Pencil size={13} />
                  </button>
                )}
                <button style={styles.iconBtnSmallDanger} onClick={() => deleteSection(section.id)} title="Remove section">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}

          {section.type === "categories" && (
            <div style={{ padding: "0 5vw 64px" }}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              <div style={styles.categoryGrid}>
                {data.categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    unlocked={unlocked}
                    onClick={() => setView({ type: "category", id: cat.id })}
                    onEdit={() => openEditCategory(cat)}
                  />
                ))}
                {unlocked && (
                  <button style={styles.addCategoryTile} onClick={() => openEditCategory({ isNew: true })}>
                    <Plus size={22} />
                    <span>Add collection</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {section.type === "text" && (
            <div style={{ padding: "0 5vw 64px" }}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              <p style={styles.sectionBody}>{section.body}</p>
            </div>
          )}
        </div>
      ))}

      {unlocked && (
        <div style={{ padding: "0 5vw 72px", display: "flex", justifyContent: "center" }}>
          <button style={styles.addSectionBtn} onClick={() => openEditSection({ isNew: true })}>
            <Plus size={15} /> Add a text section
          </button>
        </div>
      )}
    </main>
  );
}

function CategoryCard({ category, unlocked, onClick, onEdit }) {
  return (
    <div style={styles.categoryCard}>
      <div onClick={onClick} role="button" style={{ cursor: "pointer" }}>
        <div style={styles.categoryImgWrap}>
          <img src={category.cover} alt={category.name} style={styles.categoryImg} />
          <span style={styles.categoryNumber}>{category.number}</span>
        </div>
        <div style={styles.categoryCardBody}>
          <h3 style={styles.categoryCardName}>{category.name}</h3>
          <p style={styles.categoryCardDesc}>{category.description}</p>
        </div>
      </div>
      {unlocked && (
        <button style={styles.cardEditBtn} onClick={onEdit} title="Edit collection">
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

/* ---------- Category Page ---------- */

function CategoryPage({ category, unlocked, onBack, openEditProduct, onDeleteProduct }) {
  return (
    <main style={{ padding: "40px 5vw 80px" }}>
      <button style={styles.backBtn} onClick={onBack}>
        <ChevronLeft size={16} /> Back to collections
      </button>

      <div style={styles.categoryHeadRow}>
        <span style={styles.categoryHeadNumber}>{category.number}</span>
        <div>
          <h1 style={styles.categoryHeadTitle}>{category.name}</h1>
          <p style={styles.categoryHeadDesc}>{category.description}</p>
        </div>
      </div>

      <div style={styles.productGrid}>
        {category.products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            unlocked={unlocked}
            onEdit={() => openEditProduct({ categoryId: category.id, product: p })}
            onDelete={() => onDeleteProduct(p.id)}
          />
        ))}
        {unlocked && (
          <button style={styles.addCategoryTile} onClick={() => openEditProduct({ categoryId: category.id, isNew: true })}>
            <Plus size={22} />
            <span>Add product</span>
          </button>
        )}
      </div>
    </main>
  );
}

function ProductCard({ product, unlocked, onEdit, onDelete }) {
  return (
    <div style={styles.productCard}>
      <div style={styles.productImgWrap}>
        <img src={product.image} alt={product.name} style={styles.productImg} />
        {product.number && <span style={styles.productNumber}>{product.number}</span>}
      </div>
      <div style={styles.productBody}>
        <h3 style={styles.productName}>{product.name}</h3>
        <p style={styles.productDesc}>{product.description}</p>
        <div style={styles.productPrice}>${Number(product.price).toFixed(2)}</div>
      </div>
      {unlocked && (
        <div style={styles.productAdminRow}>
          <button style={styles.iconBtnSmall} onClick={onEdit} title="Edit product">
            <Pencil size={13} /> Edit
          </button>
          <button style={styles.iconBtnSmallDanger} onClick={onDelete} title="Remove product">
            <Trash2 size={13} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Modals ---------- */

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div style={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modalBox, ...(wide ? { maxWidth: 560 } : {}) }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button style={styles.modalCloseBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordModal({ onClose, onSubmit }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function attemptSubmit() {
    const ok = onSubmit(pw);
    if (!ok) {
      setError(true);
      setPw("");
      inputRef.current?.focus();
    }
  }

  return (
    <ModalShell title="Admin login" onClose={onClose}>
      <div style={styles.formCol}>
        <label style={styles.label}>Password</label>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") attemptSubmit();
          }}
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
          placeholder="Enter admin password"
        />
        {error && <div style={styles.errorText}>Wrong password. Try again.</div>}
        <button type="button" style={styles.primaryBtn} onClick={attemptSubmit}>
          Unlock editing
        </button>
      </div>
    </ModalShell>
  );
}

function ChangePasswordModal({ onClose, onSave }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");

  function attemptSave() {
    if (pw1.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setError("Passwords don't match.");
      return;
    }
    onSave(pw1);
  }

  return (
    <ModalShell title="Change admin password" onClose={onClose}>
      <div style={styles.formCol}>
        <label style={styles.label}>New password</label>
        <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} style={styles.input} placeholder="New password" />
        <label style={styles.label}>Confirm password</label>
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") attemptSave();
          }}
          style={styles.input}
          placeholder="Confirm password"
        />
        {error && <div style={styles.errorText}>{error}</div>}
        <button type="button" style={styles.primaryBtn} onClick={attemptSave}>
          Save password
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------- Image field: upload from device or paste a URL ---------- */

function resizeImageFile(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read that image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function ImageField({ label, value, onChange, aspect }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const dataUrl = await resizeImageFile(file);
      onChange(dataUrl);
    } catch (ex) {
      setErr("Couldn't load that photo. Try a different file.");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      <div style={styles.imageFieldRow}>
        <div style={{ ...styles.imagePreview, aspectRatio: aspect || "4 / 5" }}>
          {value ? <img src={value} alt="" style={styles.imagePreviewImg} /> : <span style={styles.imagePreviewEmpty}>No photo</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 180 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button type="button" style={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Processing…" : "Upload from device"}
          </button>
          <input
            style={styles.input}
            value={value && value.startsWith("data:") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste an image URL"
          />
          {value && (
            <button type="button" style={styles.removeImageBtn} onClick={() => onChange("")}>
              <Trash2 size={12} /> Remove photo
            </button>
          )}
          {err && <div style={styles.errorText}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

function SiteInfoModal({ data, onClose, onSave }) {
  const [siteName, setSiteName] = useState(data.siteName);
  const [tagline, setTagline] = useState(data.tagline);
  const [heroImage, setHeroImage] = useState(data.heroImage);

  return (
    <ModalShell title="Edit site info" onClose={onClose} wide>
      <div style={styles.formCol}>
        <label style={styles.label}>Site name</label>
        <input style={styles.input} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <label style={styles.label}>Tagline</label>
        <input style={styles.input} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <ImageField label="Hero photo" value={heroImage} onChange={setHeroImage} aspect="16 / 9" />
        <button type="button" style={styles.primaryBtn} onClick={() => onSave(siteName, tagline, heroImage)}>
          Save changes
        </button>
      </div>
    </ModalShell>
  );
}

function ThemeModal({ theme, onClose, onSave }) {
  const [bg, setBg] = useState(theme.bg);
  const [panel, setPanel] = useState(theme.panel);
  const [accent, setAccent] = useState(theme.accent);
  const [text, setText] = useState(theme.text);
  const [radius, setRadius] = useState(theme.radius);
  const [fontPair, setFontPair] = useState(theme.fontPair);
  const [backgroundImage, setBackgroundImage] = useState(theme.backgroundImage || "");
  const [backgroundDim, setBackgroundDim] = useState(theme.backgroundDim ?? 70);

  return (
    <ModalShell title="Customize design" onClose={onClose} wide>
      <div style={styles.formCol}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ColorField label="Background" value={bg} onChange={setBg} />
          <ColorField label="Card background" value={panel} onChange={setPanel} />
          <ColorField label="Accent color" value={accent} onChange={setAccent} />
          <ColorField label="Text color" value={text} onChange={setText} />
        </div>

        <label style={styles.label}>Typography</label>
        <select style={styles.input} value={fontPair} onChange={(e) => setFontPair(e.target.value)}>
          {Object.entries(FONT_PAIRS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        <label style={styles.label}>Corner style</label>
        <select style={styles.input} value={radius} onChange={(e) => setRadius(e.target.value)}>
          <option value="sharp">Sharp</option>
          <option value="soft">Soft</option>
          <option value="rounded">Rounded</option>
        </select>

        <ImageField label="Site-wide background photo (optional)" value={backgroundImage} onChange={setBackgroundImage} aspect="16 / 9" />

        <label style={styles.label}>Background darkness ({backgroundDim}%)</label>
        <input
          type="range"
          min="0"
          max="95"
          value={backgroundDim}
          onChange={(e) => setBackgroundDim(Number(e.target.value))}
          style={{ width: "100%" }}
        />

        <button
          type="button"
          style={styles.primaryBtn}
          onClick={() => onSave({ bg, panel, accent, text, radius, fontPair, backgroundImage, backgroundDim })}
        >
          Save design
        </button>
      </div>
    </ModalShell>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorInput} />
    </div>
  );
}

function CategoryModal({ category, onClose, onSave, onDelete }) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [cover, setCover] = useState(category?.cover || "");

  return (
    <ModalShell title={category ? "Edit collection" : "Add collection"} onClose={onClose} wide>
      <div style={styles.formCol}>
        <label style={styles.label}>Collection name</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Season Jerseys" />
        <label style={styles.label}>Description</label>
        <input style={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        <ImageField label="Cover photo" value={cover} onChange={setCover} />
        <div style={styles.modalActions}>
          {onDelete && (
            <button type="button" style={styles.dangerBtn} onClick={onDelete}>
              <Trash2 size={14} /> Delete collection
            </button>
          )}
          <button type="button" style={styles.primaryBtn} onClick={() => name.trim() && onSave({ name, description, cover })}>
            Save collection
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function SectionModal({ section, onClose, onSave }) {
  const [title, setTitle] = useState(section?.title || "");
  const [body, setBody] = useState(section?.body || "");

  return (
    <ModalShell title={section ? "Edit section" : "Add text section"} onClose={onClose} wide>
      <div style={styles.formCol}>
        <label style={styles.label}>Section title</label>
        <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About us" />
        <label style={styles.label}>Section text</label>
        <textarea style={styles.textarea} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the content for this section..." rows={5} />
        <button type="button" style={styles.primaryBtn} onClick={() => title.trim() && onSave({ title, body })}>
          Save section
        </button>
      </div>
    </ModalShell>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [number, setNumber] = useState(product?.number || "");
  const [image, setImage] = useState(product?.image || "");
  const [description, setDescription] = useState(product?.description || "");

  return (
    <ModalShell title={product ? "Edit product" : "Add product"} onClose={onClose} wide>
      <div style={styles.formCol}>
        <label style={styles.label}>Product name</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Skyline Home Kit" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Price (USD)</label>
            <input style={styles.input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="59.99" />
          </div>
          <div style={{ width: 100 }}>
            <label style={styles.label}>Number</label>
            <input style={styles.input} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10" />
          </div>
        </div>
        <ImageField label="Product photo" value={image} onChange={setImage} />
        <label style={styles.label}>Description</label>
        <textarea style={styles.textarea} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short product description" />
        <button
          type="button"
          style={styles.primaryBtn}
          onClick={() => name.trim() && onSave({ name, price: parseFloat(price) || 0, number, image, description })}
        >
          Save product
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------- Styles ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&family=Playfair+Display:wght@500;700&family=Bebas+Neue&family=Work+Sans:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      input:focus, textarea:focus, select:focus, button:focus { outline: 2px solid var(--accent, #D4A73A); outline-offset: 1px; }
    `}</style>
  );
}

const styles = {
  app: { minHeight: "100vh", fontFamily: "var(--font-body)", lineHeight: 1.5, background: "var(--bg)" },
  siteBgImage: { position: "fixed", inset: 0, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", zIndex: 0 },
  siteBgOverlay: { position: "fixed", inset: 0, zIndex: 0 },
  imageFieldRow: { display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" },
  imagePreview: { width: 110, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  imagePreviewImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  imagePreviewEmpty: { color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 10, textAlign: "center", padding: 6 },
  uploadBtn: { background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 4, padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" },
  removeImageBtn: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid var(--danger)", color: "#E8A5A5", borderRadius: 4, padding: "7px 10px", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer", alignSelf: "flex-start" },
  loadingWrap: { background: "#0E1526", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  loadingTag: { fontFamily: "'Space Mono', monospace", color: "#D4A73A", letterSpacing: 2, fontSize: 13 },
  header: { borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(6px)", zIndex: 20 },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 5vw", gap: 16, flexWrap: "wrap" },
  brandWrap: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  brandMark: { fontFamily: "var(--font-display)", background: "var(--accent)", color: "var(--bg)", fontWeight: 700, fontSize: 15, width: 34, height: 34, borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 0.5 },
  brandName: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, letterSpacing: 1, color: "var(--text)" },
  brandTag: { fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  adminBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 14px", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" },
  adminBtnActive: { display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", border: "1px solid var(--accent)", color: "var(--bg)", padding: "8px 14px", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, cursor: "default" },
  editSiteBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" },
  adminBar: { background: "var(--danger)", color: "#fff", padding: "8px 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12 },
  adminBarText: { fontFamily: "var(--font-mono)" },
  saveTag: { fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.9 },
  saveTagOk: { fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.9 },
  saveTagError: { display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 11, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "4px 9px", borderRadius: 4, cursor: "pointer" },
  adminBarBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.35)", color: "#fff", padding: "6px 10px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" },
  adminBarBtnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.35)", color: "#fff", padding: "6px 10px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" },
  hero: { position: "relative", height: "62vh", minHeight: 380, overflow: "hidden", borderBottom: "1px solid var(--line)" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.85)" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(180deg, color-mix(in srgb, var(--bg) 35%, transparent) 0%, color-mix(in srgb, var(--bg) 55%, transparent) 55%, color-mix(in srgb, var(--bg) 95%, transparent) 100%)" },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 5vw 44px" },
  heroEyebrow: { fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 12, letterSpacing: 3, marginBottom: 10 },
  heroTitle: { fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6vw, 64px)", fontWeight: 700, margin: 0, letterSpacing: 1, color: "var(--text)" },
  heroSub: { color: "var(--text-dim)", fontSize: 16, marginTop: 10, maxWidth: 520 },
  sectionWrap: { position: "relative" },
  sectionAdminBar: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "color-mix(in srgb, var(--panel) 85%, var(--text) 8%)", padding: "6px 5vw", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" },
  sectionAdminLabel: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: 1 },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, margin: "48px 0 28px", letterSpacing: 0.5, color: "var(--text)" },
  sectionBody: { color: "var(--text-dim)", fontSize: 15, maxWidth: 680, whiteSpace: "pre-wrap" },
  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22 },
  categoryCard: { position: "relative", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" },
  categoryImgWrap: { position: "relative", height: 260 },
  categoryImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  categoryNumber: { position: "absolute", top: 12, left: 12, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, background: "color-mix(in srgb, var(--bg) 75%, transparent)", color: "var(--accent)", padding: "4px 10px", borderRadius: 3, letterSpacing: 1 },
  categoryCardBody: { padding: "18px 18px 22px" },
  categoryCardName: { fontFamily: "var(--font-display)", fontSize: 19, margin: "0 0 6px", fontWeight: 600, color: "var(--text)" },
  categoryCardDesc: { color: "var(--text-dim)", fontSize: 13.5, margin: 0 },
  cardEditBtn: { position: "absolute", top: 12, right: 12, background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 4, padding: 7, cursor: "pointer", display: "flex" },
  addCategoryTile: { background: "transparent", border: "1px dashed var(--line)", borderRadius: "var(--radius)", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 13, cursor: "pointer" },
  addSectionBtn: { display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid var(--line)", color: "var(--text)", padding: "10px 18px", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", marginBottom: 28, padding: 0 },
  categoryHeadRow: { display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 40 },
  categoryHeadNumber: { fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, color: "var(--accent)", lineHeight: 1 },
  categoryHeadTitle: { fontFamily: "var(--font-display)", fontSize: 34, margin: "0 0 6px", fontWeight: 600, color: "var(--text)" },
  categoryHeadDesc: { color: "var(--text-dim)", fontSize: 15, margin: 0 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 },
  productCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", display: "flex", flexDirection: "column" },
  productImgWrap: { position: "relative", height: 260 },
  productImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  productNumber: { position: "absolute", bottom: 10, right: 10, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text)", background: "color-mix(in srgb, var(--bg) 60%, transparent)", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  productBody: { padding: "16px 16px 6px", flex: 1 },
  productName: { fontFamily: "var(--font-display)", fontSize: 17, margin: "0 0 6px", fontWeight: 600, color: "var(--text)" },
  productDesc: { color: "var(--text-dim)", fontSize: 13, margin: "0 0 10px" },
  productPrice: { fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 15, fontWeight: 700 },
  productAdminRow: { display: "flex", gap: 8, padding: "12px 16px 16px", borderTop: "1px solid var(--line)", marginTop: 10 },
  iconBtnSmall: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid var(--line)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 9px", borderRadius: 4, cursor: "pointer" },
  iconBtnSmallDanger: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid var(--danger)", color: "#E8A5A5", fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 9px", borderRadius: 4, cursor: "pointer" },
  footer: { borderTop: "1px solid var(--line)", padding: "28px 5vw", textAlign: "center" },
  footerText: { color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(4,6,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modalBox: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, width: "100%", maxWidth: 420, padding: 24, maxHeight: "88vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 20, margin: 0, color: "var(--text)", fontWeight: 600 },
  modalCloseBtn: { background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 },
  formCol: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.5, marginTop: 8 },
  input: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4, padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-body)" },
  colorInput: { width: 64, height: 36, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4, padding: 2, cursor: "pointer" },
  inputError: { borderColor: "var(--danger)" },
  textarea: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4, padding: "10px 12px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-body)", resize: "vertical" },
  errorText: { color: "#E8A5A5", fontSize: 12.5, fontFamily: "var(--font-mono)" },
  primaryBtn: { marginTop: 16, background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 4, padding: "11px 16px", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  dangerBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--danger)", color: "#E8A5A5", borderRadius: 4, padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12.5, cursor: "pointer" },
  modalActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 10 },
};
