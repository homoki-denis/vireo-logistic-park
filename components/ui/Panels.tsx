"use client";
import {
  AlertTriangle,
  Boxes,
  Building2,
  Car,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  Forklift,
  Layers,
  MapPin,
  Minus,
  Package,
  Languages,
  Phone,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Truck,
  UserCheck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  COMPANY,
  DEPOTS,
  DEPOT_BY_BUILDING,
  DEPOT_BY_CODE,
  EMPLOYEES,
  EMPLOYEE_BY_ID,
  PRODUCTS,
  PRODUCT_BY_CODE,
  SHIFT_HOURS,
  fullName,
  initials,
  type Depot,
  type Employee,
  type Product,
} from "@/lib/catalog";
import { ENTITY_BY_ID } from "@/lib/entities";
import { useT, type UiKey } from "@/lib/i18n";
import { presentIn, type FeedItem, type PresenceStatus } from "@/lib/sim";
import { PARK } from "@/lib/sites";
import { useStore, type SideTab } from "@/lib/store";
import { useIsMobile } from "@/lib/useIsMobile";

const CODE_BY_BUILDING = new Map(PARK.buildings.filter((b) => b.code).map((b) => [b.id, b.code!]));

type Tone = "ok" | "warn" | "busy" | "idle" | "info" | "off";
const Chip = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`chip chip--${tone}`}>{children}</span>;
const statusTone: Record<PresenceStatus, Tone> = { Prezent: "ok", Pauză: "warn", Absent: "off", Concediu: "idle" };

function Bar({ value, tone = "info" }: { value: number; tone?: Tone }) {
  return (
    <div className="bar">
      <i className={`bar__fill bar--${tone}`} style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  );
}

function CodeBadge({ code, big }: { code: string; big?: boolean }) {
  const d = DEPOT_BY_CODE.get(code);
  return (
    <span className={`code-badge ${big ? "code-badge--big" : ""}`} style={{ background: d?.accent ?? "#5b6b85" }}>
      {code}
    </span>
  );
}

function Avatar({ e, big }: { e: Employee; big?: boolean }) {
  return (
    <span className={`avatar ${big ? "avatar--big" : ""}`} style={{ background: e.avatar }}>
      {initials(e)}
    </span>
  );
}

// =================================================================== header + search
export function Header() {
  const { t } = useT();
  return (
    <header className="header">
      <div className="brand">
        <div className="brand__logo">V</div>
        <div>
          <b>{COMPANY.name}</b>
          <small>{t("subtitle")}</small>
        </div>
      </div>
      <SearchBox />
      <div className="header__right">
        <span className="demo-badge">{t("demo")}</span>
        <LangSwitch />
        <LiveClock />
      </div>
    </header>
  );
}

function LangSwitch() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const { t } = useT();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang")}>
      <Languages size={14} />
      {(["ro", "en"] as const).map((l) => (
        <button key={l} className={lang === l ? "is-active" : ""} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function LiveClock() {
  const { t, locale } = useT();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live">
      <i className="live__dot" /> {t("live")} {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

interface Hit {
  id: string;
  kind: "product" | "person" | "depot";
  title: string;
  sub: string;
  code?: string;
  person?: Employee;
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function searchAll(q: string, d: (s: string) => string = (x) => x): Hit[] {
  const t = norm(q.trim());
  if (!t) return [];
  const hits: Hit[] = [];
  for (const dp of DEPOTS)
    if (norm(`${dp.code} ${dp.name} ${dp.category} ${d(dp.name)} ${d(dp.category)}`).includes(t)) hits.push({ id: dp.buildingId, kind: "depot", title: d(dp.name), sub: d(dp.category), code: dp.code });
  // exact code first, then prefix / name matches
  const prods = PRODUCTS.filter((p) => norm(`${p.code} ${p.name} ${d(p.name)}`).includes(t)).sort((a, b) => (norm(a.code) === t ? -1 : norm(b.code) === t ? 1 : 0));
  for (const p of prods.slice(0, 8)) hits.push({ id: `p:${p.code}`, kind: "product", title: d(p.name), sub: `${p.code} · ${d(p.location)}`, code: p.code });
  for (const e of EMPLOYEES.filter((x) => norm(`${fullName(x)} ${x.id} ${x.role} ${d(x.role)}`).includes(t)).slice(0, 6))
    hits.push({ id: `e:${e.id}`, kind: "person", title: fullName(e), sub: `${e.id} · ${d(e.role)}`, person: e });
  return hits.slice(0, 14);
}

function SearchBox() {
  const { t, d, lang } = useT();
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const select = useStore((s) => s.select);
  const ref = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hits = useMemo(() => searchAll(q, d), [q, lang]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== ref.current) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const pick = (h: Hit) => {
    select(h.id);
    setQ("");
    ref.current?.blur();
  };
  return (
    <div className="search">
      <Search size={16} />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) pick(hits[0]);
          if (e.key === "Escape") ref.current?.blur();
        }}
        placeholder={mobile ? t("searchPhShort") : t("searchPh")}
      />
      <kbd>/</kbd>
      {focus && q && (
        <div className="dropdown dropdown--search">
          {hits.length === 0 && <div className="dropdown__empty">{t("nothingFor", { q })}</div>}
          {hits.map((h) => (
            <button key={h.id} className="dropdown__item" onMouseDown={() => pick(h)}>
              {h.kind === "person" && h.person ? <Avatar e={h.person} /> : <CodeBadge code={h.kind === "depot" ? h.code! : h.code!.slice(0, 3)} />}
              <span>
                <b>{h.title}</b>
                <small>{h.sub}</small>
              </span>
              <em className="dropdown__kind">{h.kind === "product" ? t("kindProduct") : h.kind === "person" ? t("kindPerson") : t("kindDepot")}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =================================================================== KPIs
export function KpiBar() {
  const { t } = useT();
  const live = useStore((s) => s.live);
  const present = EMPLOYEES.filter((e) => live.presence[e.id].status === "Prezent").length;
  const onBreak = EMPLOYEES.filter((e) => live.presence[e.id].status === "Pauză").length;
  const low = PRODUCTS.filter((p) => live.stock[p.code] < p.min).length;
  return (
    <div className="kpis">
      <Kpi icon={<UserCheck size={18} />} label={t("kpiPresent")} value={`${present}`} sub={t("kpiPresentSub", { b: onBreak, n: EMPLOYEES.length })} />
      <Kpi icon={<Warehouse size={18} />} label={t("kpiDepots")} value={String(DEPOTS.filter((d) => d.hasStock).length)} sub={t("kpiDepotsSub")} />
      <Kpi icon={<Package size={18} />} label={t("kpiCodes")} value={String(PRODUCTS.length)} sub={t("kpiCodesSub")} />
      <Kpi icon={<AlertTriangle size={18} />} label={t("kpiLow")} value={String(low)} sub={t("kpiLowSub")} warn={low > 0} />
    </div>
  );
}

function Kpi({ icon, label, value, sub, warn }: { icon: ReactNode; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`card kpi ${warn ? "kpi--warn" : ""}`}>
      <div className="kpi__icon">{icon}</div>
      <div>
        <small>{label}</small>
        <div className="kpi__value">{value}</div>
        <small className="muted">{sub}</small>
      </div>
    </div>
  );
}

// =================================================================== toolbar
export function Toolbar() {
  const { t } = useT();
  const resetView = useStore((s) => s.resetView);
  const showNeighbours = useStore((s) => s.showNeighbours);
  const showLabels = useStore((s) => s.showLabels);
  const toggleNeighbours = useStore((s) => s.toggleNeighbours);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const zoom = (f: number) => window.dispatchEvent(new CustomEvent("yard-zoom", { detail: f }));
  return (
    <div className="toolbar card">
      <button title={t("zoomIn")} onClick={() => zoom(0.75)}>
        <Plus size={16} />
      </button>
      <button title={t("zoomOut")} onClick={() => zoom(1.33)}>
        <Minus size={16} />
      </button>
      <hr />
      <button title={t("reset")} onClick={resetView}>
        <RotateCcw size={16} />
      </button>
      <button title={showLabels ? t("hideLabels") : t("showLabels")} onClick={toggleLabels} className={showLabels ? "is-on" : ""}>
        {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button title={showNeighbours ? t("hideAround") : t("showAround")} onClick={toggleNeighbours} className={showNeighbours ? "is-on" : ""}>
        <Layers size={16} />
      </button>
    </div>
  );
}

// =================================================================== sidebar (tabs)
export function Sidebar() {
  const { t } = useT();
  const mobile = useIsMobile();
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const sheetOpen = useStore((s) => s.sheetOpen);
  const setSheetOpen = useStore((s) => s.setSheetOpen);
  const select = useStore((s) => s.select);
  const live = useStore((s) => s.live);
  const present = EMPLOYEES.filter((e) => live.presence[e.id].status !== "Absent" && live.presence[e.id].status !== "Concediu").length;
  const tabs: [SideTab, string, ReactNode, number][] = [
    ["depots", t("tabDepots"), <Warehouse key="d" size={14} />, DEPOTS.length],
    ["products", t("tabProducts"), <Boxes key="p" size={14} />, PRODUCTS.length],
    ["people", t("tabPeople"), <Users key="u" size={14} />, present],
  ];
  // on phones the live feed lives in its own tab
  if (mobile) tabs.push(["activity", t("tabActivity"), <Clock key="a" size={14} />, -1]);
  const current = !mobile && tab === "activity" ? "depots" : tab;
  const onTab = (id: SideTab) => {
    if (!mobile) return setTab(id);
    if (id === current && sheetOpen) return setSheetOpen(false);
    setTab(id);
    setSheetOpen(true);
    select(null);
  };
  return (
    <aside className={`card sidebar ${sheetOpen ? "sidebar--open" : ""}`}>
      {mobile && <button className="sheet-handle" aria-label="toggle" onClick={() => setSheetOpen(!sheetOpen)} />}
      <div className="tabs">
        {tabs.map(([id, label, icon, n]) => (
          <button key={id} className={current === id && (!mobile || sheetOpen) ? "is-active" : ""} onClick={() => onTab(id)}>
            {icon} <em>{label}</em> {n >= 0 && <span>{n}</span>}
          </button>
        ))}
      </div>
      <div className="sidebar__body">
        {current === "depots" && <DepotList />}
        {current === "products" && <ProductList />}
        {current === "people" && <PeopleList />}
        {current === "activity" && <FeedList limit={30} />}
      </div>
    </aside>
  );
}

function DepotList() {
  const { t, d: tr } = useT();
  const live = useStore((s) => s.live);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  return (
    <ul className="depot-list">
      {DEPOTS.map((d) => {
        const n = presentIn(live, d.code).length;
        const items = PRODUCTS.filter((p) => p.depot === d.code);
        const low = items.filter((p) => live.stock[p.code] < p.min).length;
        return (
          <li key={d.code} className={selectedId === d.buildingId ? "is-selected" : ""} onClick={() => select(d.buildingId)} style={{ ["--accent" as string]: d.accent }}>
            <CodeBadge code={d.code} big />
            <div className="depot-list__main">
              <b>{tr(d.name)}</b>
              <small>{tr(d.category)}</small>
              {d.capacity > 0 && <Bar value={live.occupancy[d.code]} tone={live.occupancy[d.code] > 0.9 ? "warn" : "info"} />}
            </div>
            <div className="depot-list__meta">
              <span title={t("presentNow")}>
                <Users size={12} /> {n}
              </span>
              {items.length > 0 && (
                <span title={t("productCodes")} className={low ? "is-warn" : ""}>
                  <Package size={12} /> {items.length}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DepotFilter() {
  const { t } = useT();
  const depotFilter = useStore((s) => s.depotFilter);
  const setDepotFilter = useStore((s) => s.setDepotFilter);
  return (
    <div className="filter-chips">
      <button className={!depotFilter ? "is-active" : ""} onClick={() => setDepotFilter(null)}>
        {t("all")}
      </button>
      {DEPOTS.map((d) => (
        <button key={d.code} className={depotFilter === d.code ? "is-active" : ""} style={{ ["--accent" as string]: d.accent }} onClick={() => setDepotFilter(depotFilter === d.code ? null : d.code)}>
          {d.code}
        </button>
      ))}
    </div>
  );
}

function ProductList() {
  const { t, d, nf } = useT();
  const [q, setQ] = useState("");
  const live = useStore((s) => s.live);
  const depotFilter = useStore((s) => s.depotFilter);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const list = PRODUCTS.filter((p) => (!depotFilter || p.depot === depotFilter) && norm(`${p.code} ${p.name} ${d(p.name)}`).includes(norm(q.trim())));
  return (
    <>
      <div className="mini-search">
        <ScanLine size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("codeOrName")} />
        {q && (
          <button onClick={() => setQ("")} aria-label={t("clear")}>
            <X size={12} />
          </button>
        )}
      </div>
      <DepotFilter />
      <ul className="rows-list">
        {list.map((p) => {
          const qty = live.stock[p.code];
          return (
            <li key={p.code} className={selectedId === `p:${p.code}` ? "is-selected" : ""} onClick={() => select(`p:${p.code}`)}>
              <span className="mono-code" style={{ color: DEPOT_BY_CODE.get(p.depot)!.accent }}>
                {p.code}
              </span>
              <span className="rows-list__main">
                <b>{d(p.name)}</b>
                <small>{d(p.location)}</small>
              </span>
              <span className={`qty ${qty < p.min ? "qty--low" : ""}`}>
                {nf(qty)}
                <small>{d(p.unit)}</small>
              </span>
            </li>
          );
        })}
        {list.length === 0 && <li className="empty">{t("noProducts")}</li>}
      </ul>
    </>
  );
}

function PeopleList() {
  const { t, d } = useT();
  const live = useStore((s) => s.live);
  const depotFilter = useStore((s) => s.depotFilter);
  const peopleFilter = useStore((s) => s.peopleFilter);
  const setPeopleFilter = useStore((s) => s.setPeopleFilter);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);
  const groups = DEPOTS.filter((d) => !depotFilter || d.code === depotFilter).map((d) => {
    const people =
      peopleFilter === "present"
        ? presentIn(live, d.code)
        : EMPLOYEES.filter((e) => (live.presence[e.id].status === "Prezent" || live.presence[e.id].status === "Pauză" ? live.presence[e.id].location : e.depot) === d.code);
    return { d, people };
  });
  return (
    <>
      <div className="segmented">
        <button className={peopleFilter === "present" ? "is-active" : ""} onClick={() => setPeopleFilter("present")}>
          {t("presentNow")}
        </button>
        <button className={peopleFilter === "all" ? "is-active" : ""} onClick={() => setPeopleFilter("all")}>
          {t("allEmployees")}
        </button>
      </div>
      <DepotFilter />
      <div className="people-groups">
        {groups.map(({ d: dp, people }) => (
          <section key={dp.code}>
            <h4>
              <CodeBadge code={dp.code} /> {d(dp.name)}
              <small>{peopleFilter === "present" ? t("nPresent", { n: people.length }) : t("nPeople", { n: people.length })}</small>
            </h4>
            <ul className="rows-list">
              {people.map((e) => {
                const p = live.presence[e.id];
                return (
                  <li key={e.id} className={selectedId === `e:${e.id}` ? "is-selected" : ""} onClick={() => select(`e:${e.id}`)}>
                    <Avatar e={e} />
                    <span className="rows-list__main">
                      <b>{fullName(e)}</b>
                      <small>
                        {d(e.role)}
                        {p.location !== e.depot && (p.status === "Prezent" || p.status === "Pauză") ? ` · ${t("fromDepot", { d: e.depot })}` : ""}
                      </small>
                    </span>
                    <span className="presence">
                      <Chip tone={statusTone[p.status]}>{d(p.status)}</Chip>
                      {p.clockIn && <small>{p.clockIn}</small>}
                    </span>
                  </li>
                );
              })}
              {people.length === 0 && <li className="empty">{t("nobody")}</li>}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

// =================================================================== detail panel
export function DetailPanel() {
  const { t } = useT();
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  if (!selectedId) return null;
  let body: ReactNode = null;
  if (selectedId.startsWith("p:")) {
    const p = PRODUCT_BY_CODE.get(selectedId.slice(2));
    if (p) body = <ProductDetail p={p} />;
  } else if (selectedId.startsWith("e:")) {
    const e = EMPLOYEE_BY_ID.get(selectedId.slice(2));
    if (e) body = <EmployeeDetail e={e} />;
  } else {
    const code = CODE_BY_BUILDING.get(selectedId);
    const ent = ENTITY_BY_ID.get(selectedId);
    if (code) body = <DepotDetail d={DEPOT_BY_CODE.get(code)!} />;
    else if (ent?.type === "forklift") body = <ForkliftDetail id={selectedId} name={ent.name} />;
    else if (ent?.type === "truck" || ent?.type === "van") body = <VehicleDetail id={selectedId} name={ent.name} kind={ent.subtitle} />;
    else if (ent?.type === "parking") body = <ParkingDetail id={selectedId} name={ent.name} />;
    else if (ent) body = <SimpleDetail id={selectedId} />;
  }
  if (!body) return null;
  return (
    <aside className="card detail" key={selectedId}>
      <button className="detail__close" onClick={() => select(null)} aria-label={t("close")}>
        <X size={16} />
      </button>
      {body}
    </aside>
  );
}

function Head({ badge, kicker, title, sub, chip }: { badge: ReactNode; kicker: string; title: string; sub?: string; chip?: ReactNode }) {
  return (
    <div className="detail__head">
      {badge}
      <div>
        <small className="kicker">{kicker}</small>
        <h3>{title}</h3>
        {sub && <small className="muted detail__sub">{sub}</small>}
        {chip && <div className="detail__chip">{chip}</div>}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="rows">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function DepotDetail({ d }: { d: Depot }) {
  const { t, d: tr, nf } = useT();
  const live = useStore((s) => s.live);
  const select = useStore((s) => s.select);
  const people = presentIn(live, d.code);
  const items = PRODUCTS.filter((p) => p.depot === d.code);
  const low = items.filter((p) => live.stock[p.code] < p.min);
  const b = PARK.buildings.find((x) => x.id === d.buildingId)!;
  return (
    <>
      <Head badge={<CodeBadge code={d.code} big />} kicker={tr(d.category)} title={tr(d.name)} sub={b.info?.desc ? tr(b.info.desc) : undefined} />
      <div className="stat-grid">
        <div>
          <small>{t("presentNow")}</small>
          <b>{people.length}</b>
        </div>
        {d.capacity > 0 ? (
          <div>
            <small>{t("occupancy")}</small>
            <b>
              {Math.round(live.occupancy[d.code] * 100)}% <span className="muted">{t("ofPlaces", { n: nf(d.capacity) })}</span>
            </b>
            <Bar value={live.occupancy[d.code]} tone={live.occupancy[d.code] > 0.9 ? "warn" : "info"} />
          </div>
        ) : (
          <div>
            <small>{t("area")}</small>
            <b>{nf(Math.round(b.w * b.d))} m²</b>
          </div>
        )}
        {items.length > 0 && (
          <>
            <div>
              <small>{t("productCodes")}</small>
              <b>{items.length}</b>
            </div>
            <div>
              <small>{t("belowMin")}</small>
              <b className={low.length ? "text-warn" : ""}>{low.length}</b>
            </div>
          </>
        )}
      </div>

      <div className="section-title">
        <span>{t("whoIn", { code: d.code })}</span>
        <small className="muted">{t("attendance")}</small>
      </div>
      <ul className="rows-list rows-list--compact">
        {people.map((e) => {
          const p = live.presence[e.id];
          return (
            <li key={e.id} onClick={() => select(`e:${e.id}`)}>
              <Avatar e={e} />
              <span className="rows-list__main">
                <b>{fullName(e)}</b>
                <small>{tr(e.role)}</small>
              </span>
              <span className="presence">
                <Chip tone={statusTone[p.status]}>{tr(p.status)}</Chip>
                <small>{t("since", { t: p.clockIn ?? "—" })}</small>
              </span>
            </li>
          );
        })}
        {people.length === 0 && <li className="empty">{t("nobodyNow")}</li>}
      </ul>

      {items.length > 0 && (
        <>
          <div className="section-title">
            <span>{t("productsN", { n: items.length })}</span>
            <small className="muted">{t("stock")}</small>
          </div>
          <ul className="rows-list rows-list--compact">
            {items.map((p) => (
              <li key={p.code} onClick={() => select(`p:${p.code}`)}>
                <span className="mono-code" style={{ color: d.accent }}>
                  {p.code}
                </span>
                <span className="rows-list__main">
                  <b>{tr(p.name)}</b>
                </span>
                <span className={`qty ${live.stock[p.code] < p.min ? "qty--low" : ""}`}>
                  {nf(live.stock[p.code])}
                  <small>{tr(p.unit)}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ProductDetail({ p }: { p: Product }) {
  const { t, d: tr, nf } = useT();
  const live = useStore((s) => s.live);
  const select = useStore((s) => s.select);
  const d = DEPOT_BY_CODE.get(p.depot)!;
  const qty = live.stock[p.code];
  const ratio = qty / (p.min * 4);
  const scans = live.feed.filter((f) => f.code === p.code).slice(0, 4);
  const handlers = EMPLOYEES.filter((e) => live.presence[e.id].lastScan?.code === p.code);
  return (
    <>
      <Head
        badge={<span className="product-icon" style={{ background: d.accent }}><Package size={20} /></span>}
        kicker={`${t("product")} · ${tr(p.category)}`}
        title={tr(p.name)}
        chip={<span className="mono-code mono-code--big" style={{ color: d.accent }}>{p.code}</span>}
      />
      <div className="stat-grid">
        <div>
          <small>{t("inStock")}</small>
          <b className={qty < p.min ? "text-warn" : ""}>
            {nf(qty)} <span className="muted">{tr(p.unit)}</span>
          </b>
          <Bar value={ratio} tone={qty < p.min ? "warn" : "ok"} />
        </div>
        <div>
          <small>{t("minStock")}</small>
          <b>
            {nf(p.min)} <span className="muted">{tr(p.unit)}</span>
          </b>
          {qty < p.min ? <Chip tone="warn">{t("reorder")}</Chip> : <Chip tone="ok">{t("ok")}</Chip>}
        </div>
      </div>
      <Rows
        rows={[
          [
            t("depot"),
            <button key="d" className="link" onClick={() => select(d.buildingId)}>
              {tr(d.name)}
            </button>,
          ],
          [t("location"), tr(p.location)],
          [t("codePrefix"), `${p.depot} = ${tr(d.category).toLowerCase()}`],
        ]}
      />
      <div className="where">
        <MapPin size={14} />
        <span>
          {t("goTo")} <b>{tr(d.name)}</b>, {tr(p.location).toLowerCase()}.
        </span>
      </div>
      {(scans.length > 0 || handlers.length > 0) && (
        <>
          <div className="section-title">
            <span>{t("recent")}</span>
          </div>
          <ul className="feed feed--inline">
            {scans.map((f) => (
              <li key={f.id}>
                <time>{f.time}</time> <FeedText f={f} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function EmployeeDetail({ e }: { e: Employee }) {
  const { t, d: tr } = useT();
  const live = useStore((s) => s.live);
  const select = useStore((s) => s.select);
  const p = live.presence[e.id];
  const loc = DEPOT_BY_CODE.get(p.location)!;
  const home = DEPOT_BY_CODE.get(e.depot)!;
  const here = p.status === "Prezent" || p.status === "Pauză";
  return (
    <>
      <Head badge={<Avatar e={e} big />} kicker={`${e.id} · ${tr(e.role)}`} title={fullName(e)} sub={t("fictionalPerson")} chip={<Chip tone={statusTone[p.status]}>{tr(p.status)}</Chip>} />
      <div className="stat-grid">
        <div>
          <small>{t("whereNow")}</small>
          <b>{here ? tr(loc.name) : "—"}</b>
        </div>
        <div>
          <small>{t("clockedIn")}</small>
          <b>{p.clockIn ?? "—"}</b>
        </div>
        <div>
          <small>{t("tasksToday")}</small>
          <b>{p.tasks}</b>
        </div>
        <div>
          <small>{t("shift")}</small>
          <b>
            {tr(e.shift)} <span className="muted">{SHIFT_HOURS[e.shift]}</span>
          </b>
        </div>
      </div>
      <Rows
        rows={[
          [
            t("homeDepot"),
            <button key="h" className="link" onClick={() => select(home.buildingId)}>
              {tr(home.name)}
            </button>,
          ],
          [t("badge"), e.id],
          [
            t("ext"),
            <span key="i" className="inline-icon">
              <Phone size={12} /> {e.ext}
            </span>,
          ],
          [t("employedSince"), String(e.since)],
          [
            t("lastScan"),
            p.lastScan ? (
              <button key="s" className="link" onClick={() => select(`p:${p.lastScan!.code}`)}>
                {t("atTime", { code: p.lastScan.code, t: p.lastScan.time })}
              </button>
            ) : (
              "—"
            ),
          ],
        ]}
      />
      {e.skills.length > 0 && (
        <div className="skills">
          {e.skills.map((s) => (
            <span key={s}>{tr(s)}</span>
          ))}
        </div>
      )}
    </>
  );
}

function ForkliftDetail({ id, name }: { id: string; name: string }) {
  const { t, d: tr } = useT();
  const f = useStore((s) => s.live.forklifts[id]);
  const follow = useStore((s) => s.follow);
  const setFollow = useStore((s) => s.setFollow);
  return (
    <>
      <Head badge={<span className="product-icon"><Forklift size={20} /></span>} kicker={t("forklift")} title={name} chip={<Chip tone={f.speedKmh ? "info" : "busy"}>{tr(f.status)}</Chip>} />
      <div className="stat-grid">
        <div>
          <small>{t("battery")}</small>
          <b>{Math.round(f.battery)}%</b>
          <Bar value={f.battery / 100} tone={f.battery < 25 ? "warn" : "ok"} />
        </div>
        <div>
          <small>{t("speed")}</small>
          <b>{f.speedKmh.toFixed(1)} km/h</b>
        </div>
      </div>
      <button className={`btn ${follow ? "btn--on" : ""}`} onClick={() => setFollow(!follow)}>
        <Crosshair size={14} /> {follow ? t("following") : t("follow")}
      </button>
    </>
  );
}

function VehicleDetail({ id, name, kind }: { id: string; name: string; kind: string }) {
  const { t, d: tr } = useT();
  const v = useStore((s) => s.live.vehicles[id]);
  const follow = useStore((s) => s.follow);
  const setFollow = useStore((s) => s.setFollow);
  return (
    <>
      <Head badge={<span className="product-icon"><Truck size={20} /></span>} kicker={tr(kind)} title={tr(name)} chip={<Chip tone={v.speedKmh ? "info" : "busy"}>{tr(v.status)}</Chip>} />
      <Rows rows={[[t("speed"), `${v.speedKmh} km/h`]]} />
      <button className={`btn ${follow ? "btn--on" : ""}`} onClick={() => setFollow(!follow)}>
        <Crosshair size={14} /> {follow ? t("following") : t("follow")}
      </button>
    </>
  );
}

function ParkingDetail({ id, name }: { id: string; name: string }) {
  const { t, d: tr } = useT();
  const p = useStore((s) => s.live.parkings[id]);
  return (
    <>
      <Head badge={<span className="product-icon"><Car size={20} /></span>} kicker={t("parking")} title={tr(name)} />
      <div className="stat-grid">
        <div>
          <small>{t("occupied")}</small>
          <b>
            {p.occupied} <span className="muted">/ {p.total}</span>
          </b>
          <Bar value={p.occupied / Math.max(1, p.total)} />
        </div>
        <div>
          <small>{t("free")}</small>
          <b>{p.total - p.occupied}</b>
        </div>
      </div>
    </>
  );
}

function SimpleDetail({ id }: { id: string }) {
  const { d: tr } = useT();
  const b = PARK.buildings.find((x) => x.id === id);
  const ent = ENTITY_BY_ID.get(id);
  return <Head badge={<span className="product-icon"><Building2 size={20} /></span>} kicker={tr(b?.info?.type ?? ent?.subtitle ?? "")} title={tr(b?.name ?? ent?.name ?? id)} sub={b?.info?.desc ? tr(b.info.desc) : undefined} />;
}

// =================================================================== activity feed
const FEED_KEY: Record<FeedItem["kind"], UiKey> = { clockIn: "fClockIn", breakOut: "fBreakOut", breakBack: "fBreakBack", scan: "fScan", move: "fMove" };

function FeedText({ f }: { f: FeedItem }) {
  const { t, d } = useT();
  return (
    <>
      {t(FEED_KEY[f.kind], {
        name: f.name,
        depot: f.depot ?? "",
        code: f.code ?? "",
        delta: f.delta !== undefined ? `${f.delta > 0 ? "+" : ""}${f.delta}` : "",
        unit: f.unit ? d(f.unit) : "",
      })}
    </>
  );
}

export function ActivityFeed() {
  const { t } = useT();
  return (
    <div className="card feed-card">
      <div className="feed-card__title">
        <Clock size={14} /> {t("activity")}
      </div>
      <FeedList limit={7} />
    </div>
  );
}

function FeedList({ limit }: { limit: number }) {
  const feed = useStore((s) => s.live.feed);
  const select = useStore((s) => s.select);
  return (
      <ul className="feed">
        {feed.slice(0, limit).map((f) => {
          return (
            <li key={f.id} className={`feed--${f.tone}`} onClick={() => f.code && select(`p:${f.code}`)}>
              <time>{f.time}</time>
              <span>
                <FeedText f={f} />
              </span>
            </li>
          );
        })}
      </ul>
  );
}

// tiny helper used by the canvas to know which depot a building belongs to
export const depotOfBuilding = (id: string) => DEPOT_BY_BUILDING.get(id);
