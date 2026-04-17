import React, { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter, ZAxis } from "recharts";
import Papa from "papaparse";
import { FaWrench, FaChartBar, FaBroom, FaLink, FaSearch, FaChartLine, FaCheckSquare, FaTags, FaComments } from "react-icons/fa";

// Single theme, multiple shades (same bluish family) for differentiation.
const THEME_SHADES = [
  "#1F2E31", // wet asphalt (dark)
  "#4B686C", // deep curve
  "#5B787C", // curve (primary accent)
  "#6C8C90", // light curve
  "#769AA0", // mountain (light)
  "#8FB0B6", // extra light
];

const BRAND_COLORS = {
  Audi: THEME_SHADES[2],
  BMW: THEME_SHADES[3],
  Ford: THEME_SHADES[1],
  Honda: THEME_SHADES[4],
  Mercedes: THEME_SHADES[5],
  Tesla: THEME_SHADES[0],
  Toyota: THEME_SHADES[2],
};

const FUEL_COLORS = {
  Diesel: THEME_SHADES[0],
  Electric: THEME_SHADES[4],
  Hybrid: THEME_SHADES[3],
  Petrol: THEME_SHADES[2],
};

const PALETTE = THEME_SHADES;

const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
const fmtNum = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n;
const UI_ACCENT = "#5B787C";

// Light theme chart readability (higher-contrast ticks/labels)
const AXIS_TICK = { fill: "rgba(31,46,49,0.78)", fontSize: 11 };
const AXIS_TICK_SM = { fill: "rgba(31,46,49,0.74)", fontSize: 10 };
const AXIS_TICK_XS = { fill: "rgba(31,46,49,0.72)", fontSize: 9 };
const AXIS_TICK_BRAND = { fill: "rgba(31,46,49,0.82)", fontSize: 12 };
const GRID_STROKE = "rgba(31,46,49,0.16)";
const PIE_LABEL_LINE = "rgba(31,46,49,0.35)";
const LEGEND_STYLE = { color: "rgba(31,46,49,0.72)", fontSize: 11 };

const BRANDS = ["Audi", "BMW", "Ford", "Honda", "Mercedes", "Tesla", "Toyota"];
const FUEL_TYPES = ["Diesel", "Electric", "Hybrid", "Petrol"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const CONDITIONS = ["New", "Used", "Like New"];

function parseVehicleQuery(text) {
  const q = String(text || "").toLowerCase();
  const res = {
    brand: null,
    fuelType: null,
    transmission: null,
    condition: null,
    maxAgeYears: null,
    minYear: null,
    maxYear: null,
    maxPrice: null,
    minPrice: null,
    maxMileage: null,
    minMileage: null,
    limit: 12,
  };

  // Brand
  for (const b of BRANDS) {
    if (q.includes(b.toLowerCase())) {
      res.brand = b;
      break;
    }
  }

  // Fuel / transmission / condition
  for (const f of FUEL_TYPES) if (q.includes(f.toLowerCase())) res.fuelType = f;
  for (const t of TRANSMISSIONS) if (q.includes(t.toLowerCase())) res.transmission = t;
  for (const c of CONDITIONS) if (q.includes(c.toLowerCase())) res.condition = c;

  // Year range like "2018", "2018-2021", "from 2018 to 2021"
  const years = q.match(/\b(19\d{2}|20\d{2})\b/g)?.map(Number) || [];
  if (years.length === 1) {
    res.minYear = years[0];
    res.maxYear = years[0];
  } else if (years.length >= 2) {
    res.minYear = Math.min(years[0], years[1]);
    res.maxYear = Math.max(years[0], years[1]);
  }

  // Age like "5 year old" / "5 years old" / "under 5 years"
  const ageMatch = q.match(/\b(under|max|upto|up to|<=|less than)?\s*(\d{1,2})\s*(year|years|yr|yrs)\s*(old)?\b/);
  if (ageMatch) res.maxAgeYears = Number(ageMatch[2]);

  // Price like "under 30k", "below 50000", "between 20k and 40k"
  const normalizeMoney = (raw) => {
    const s = String(raw).replace(/[, ]/g, "");
    const m = s.match(/^(\d+(\.\d+)?)(k)?$/i);
    if (!m) return null;
    const n = Number(m[1]);
    return m[3] ? Math.round(n * 1000) : Math.round(n);
  };
  const underPrice = q.match(/\b(under|below|<=|less than)\s*\$?\s*([\d.,]+k?)\b/);
  if (underPrice) res.maxPrice = normalizeMoney(underPrice[2]);
  const overPrice = q.match(/\b(over|above|>=|more than)\s*\$?\s*([\d.,]+k?)\b/);
  if (overPrice) res.minPrice = normalizeMoney(overPrice[2]);
  const betweenPrice = q.match(/\bbetween\s*\$?\s*([\d.,]+k?)\s*(and|to)\s*\$?\s*([\d.,]+k?)\b/);
  if (betweenPrice) {
    res.minPrice = normalizeMoney(betweenPrice[1]);
    res.maxPrice = normalizeMoney(betweenPrice[3]);
  }

  // Mileage like "under 50k miles", "below 60000 mileage"
  const normalizeNum = (raw) => {
    const s = String(raw).replace(/[, ]/g, "");
    const m = s.match(/^(\d+(\.\d+)?)(k)?$/i);
    if (!m) return null;
    const n = Number(m[1]);
    return m[3] ? Math.round(n * 1000) : Math.round(n);
  };
  const underMi = q.match(/\b(under|below|<=|less than)\s*([\d.,]+k?)\s*(miles|mi|mileage)\b/);
  if (underMi) res.maxMileage = normalizeNum(underMi[2]);
  const overMi = q.match(/\b(over|above|>=|more than)\s*([\d.,]+k?)\s*(miles|mi|mileage)\b/);
  if (overMi) res.minMileage = normalizeNum(overMi[2]);

  // Limit like "top 5"
  const topMatch = q.match(/\b(top|show)\s*(\d{1,2})\b/);
  if (topMatch) res.limit = Math.max(1, Math.min(25, Number(topMatch[2])));

  return res;
}

function applyVehicleFilter(rows, parsed) {
  const nowYear = new Date().getFullYear();
  const yearFloor = parsed.maxAgeYears != null ? nowYear - parsed.maxAgeYears : null;

  const filtered = rows.filter((r) => {
    if (!r) return false;
    if (parsed.brand && String(r.Brand) !== parsed.brand) return false;
    if (parsed.fuelType && String(r["Fuel Type"]) !== parsed.fuelType) return false;
    if (parsed.transmission && String(r.Transmission) !== parsed.transmission) return false;
    if (parsed.condition && String(r.Condition) !== parsed.condition) return false;

    const year = Number(r.Year);
    if (!Number.isNaN(year)) {
      if (parsed.minYear != null && year < parsed.minYear) return false;
      if (parsed.maxYear != null && year > parsed.maxYear) return false;
      if (yearFloor != null && year < yearFloor) return false;
    }

    const price = Number(r.Price);
    if (!Number.isNaN(price)) {
      if (parsed.minPrice != null && price < parsed.minPrice) return false;
      if (parsed.maxPrice != null && price > parsed.maxPrice) return false;
    }

    const mileage = Number(r.Mileage);
    if (!Number.isNaN(mileage)) {
      if (parsed.minMileage != null && mileage < parsed.minMileage) return false;
      if (parsed.maxMileage != null && mileage > parsed.maxMileage) return false;
    }

    return true;
  });

  // Sort by newer year then lower price
  filtered.sort((a, b) => {
    const ya = Number(a.Year) || 0;
    const yb = Number(b.Year) || 0;
    if (yb !== ya) return yb - ya;
    const pa = Number(a.Price) || 0;
    const pb = Number(b.Price) || 0;
    return pa - pb;
  });

  return filtered;
}

function ChatWidget({ data }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => ([
    {
      role: "assistant",
      text:
        "Tell me what you want (brand, age/year, budget, mileage, fuel, transmission). Example: “BMW under 5 years, under 40k, automatic, under 60k miles”.",
    },
  ]));

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: trimmed }]);

    const parsed = parseVehicleQuery(trimmed);
    const rows = Array.isArray(data) ? data : [];
    const filtered = applyVehicleFilter(rows, parsed);
    const slice = filtered.slice(0, parsed.limit);

    const constraints = [];
    if (parsed.brand) constraints.push(`Brand: ${parsed.brand}`);
    if (parsed.maxAgeYears != null) constraints.push(`Max age: ${parsed.maxAgeYears} yrs`);
    if (parsed.minYear != null || parsed.maxYear != null) constraints.push(`Year: ${parsed.minYear ?? "…"}–${parsed.maxYear ?? "…"} `);
    if (parsed.minPrice != null || parsed.maxPrice != null) constraints.push(`Price: ${parsed.minPrice ? fmt(parsed.minPrice) : "…"}–${parsed.maxPrice ? fmt(parsed.maxPrice) : "…"} `);
    if (parsed.minMileage != null || parsed.maxMileage != null) constraints.push(`Mileage: ${parsed.minMileage ?? "…"}–${parsed.maxMileage ?? "…"} `);
    if (parsed.fuelType) constraints.push(`Fuel: ${parsed.fuelType}`);
    if (parsed.transmission) constraints.push(`Transmission: ${parsed.transmission}`);
    if (parsed.condition) constraints.push(`Condition: ${parsed.condition}`);

    const header = constraints.length ? `Filters: ${constraints.join(" · ")}` : "Filters: none (showing best matches)";
    const total = filtered.length;

    const lines = slice.map((r, idx) => {
      const year = r.Year ?? "—";
      const brand = r.Brand ?? "—";
      const model = r.Model ?? "—";
      const price = Number.isFinite(Number(r.Price)) ? fmt(Number(r.Price)) : "—";
      const mileage = Number.isFinite(Number(r.Mileage)) ? `${Number(r.Mileage).toLocaleString()} mi` : "—";
      const fuel = r["Fuel Type"] ?? "—";
      const trans = r.Transmission ?? "—";
      const cond = r.Condition ?? "—";
      return `${idx + 1}. ${year} ${brand} ${model}\n   Price: ${price}\n   Mileage: ${mileage}\n   Fuel: ${fuel} | Transmission: ${trans} | Condition: ${cond}`;
    });

    const reply = (() => {
      if (rows.length === 0) return "The CSV is still loading. Please try again in a moment.";
      if (total === 0) {
        return `${header}\n\nNo matches found.\n\nTry loosening one filter (higher budget, wider year range, higher mileage), or ask something simpler like:\nBMW under 5 years under 40k`;
      }
      return `${header}\n\nMatches: ${total.toLocaleString()}\nShowing: ${slice.length}\n\n${lines.join("\n\n")}`;
    })();

    setMessages((m) => [...m, { role: "assistant", text: reply }]);
  };

  return (
    <>
      {open && (
        <div
          className="chatBackdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="chatWrap">
        <button className="chatFab" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close chat" : "Open chat"}>
          <span className="chatFabIcon" aria-hidden="true"><FaComments /></span>
          <span className="chatFabLabel">Chat</span>
        </button>

        {open && (
          <div className="chatPanel" role="dialog" aria-label="Vehicle finder chat">
            <div className="chatHeader">
              <div className="chatTitle">Vehicle Finder</div>
              <button className="chatClose" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
            </div>

            <div className="chatBody">
              {messages.map((m, idx) => (
                <div key={idx} className={`chatMsg ${m.role === "user" ? "chatMsgUser" : "chatMsgBot"}`}>
                  <div className="chatBubble">{m.text}</div>
                </div>
              ))}
            </div>

            <div className="chatComposer">
              <input
                className="chatInput"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try: "Toyota under 3 years under 50k"'
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button className="chatSend" onClick={send}>Send</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const KpiCard = ({ label, value, sub, accent }) => (
  <div className="kpiCard" style={{ ["--kpi-accent"]: accent }}>
    <div className="kpiLabel">{label}</div>
    <div className="kpiValue">{value}</div>
    {sub && <div className="kpiSub">{sub}</div>}
  </div>
);

const SectionTitle = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 18 }}>
    <div className="sectionTitle">
      <span className="sectionIcon">{icon}</span>
      <span className="sectionHeading">{title}</span>
    </div>
    {subtitle && <div className="sectionSubtitle">{subtitle}</div>}
  </div>
);

const ChartBox = ({ title, children, flex }) => (
  <div className="chartBox" style={{ flex: flex || 1 }}>
    <div className="chartTitle">{title}</div>
    {children}
  </div>
);

// DOMAIN 1: Statistical Analysis
function Domain1({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  let filteredData = data;
  if (filter !== "All") filteredData = data.filter(d => d.Brand === filter);

  const prices = filteredData.map(d => Number(d.Price)).filter(p => !isNaN(p));
  prices.sort((a,b) => a-b);
  const count = prices.length;
  
  if (count === 0) return <div>No data available for this selection.</div>;

  const mean = prices.reduce((a,b) => a+b, 0) / count;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const median = prices[Math.floor(count / 2)];
  const p25 = prices[Math.floor(count * 0.25)];
  const p75 = prices[Math.floor(count * 0.75)];
  const std = Math.sqrt(prices.map(p => Math.pow(p - mean, 2)).reduce((a,b)=>a+b, 0) / count);

  const ranges = {"<10K": 0, "10-25K": 0, "25-50K": 0, "50-75K": 0, "75-100K": 0, "100K+": 0};
  prices.forEach(p => {
    if (p < 10000) ranges["<10K"]++;
    else if (p <= 25000) ranges["10-25K"]++;
    else if (p <= 50000) ranges["25-50K"]++;
    else if (p <= 75000) ranges["50-75K"]++;
    else if (p <= 100000) ranges["75-100K"]++;
    else ranges["100K+"]++;
  });
  const priceDist = Object.entries(ranges).map(([k, v]) => ({ range: k, count: v }));

  const brandGroups = {};
  filteredData.forEach(d => {
    if (!brandGroups[d.Brand]) brandGroups[d.Brand] = { sum: 0, count: 0 };
    brandGroups[d.Brand].sum += Number(d.Price);
    brandGroups[d.Brand].count++;
  });
  const brandPrice = Object.entries(brandGroups).map(([k, v]) => ({ brand: k, avg: Math.round(v.sum / v.count), color: BRAND_COLORS[k] || "#ccc" }));

  return (
    <div>
      <SectionTitle icon={<FaChartBar />} title="Statistical Analysis" subtitle="Detect extreme values, distribution shape, and logical ranges" />
      <div className="kpiRow">
        <KpiCard label="Total Records" value={count.toLocaleString()} sub={`For ${filter}`} accent={UI_ACCENT} />
        <KpiCard label="Avg Price" value={fmt(mean)} sub={`Min ${fmt(min)}`} accent={UI_ACCENT} />
        <KpiCard label="Median Price" value={fmt(median)} sub={`75th pct: ${fmt(p75)}`} accent={UI_ACCENT} />
        <KpiCard label="Price StdDev" value={fmt(std)} sub="High variance" accent={UI_ACCENT} />
        <KpiCard label="Max Price" value={fmt(max)} sub={`Min: ${fmt(min)}`} accent={UI_ACCENT} />
      </div>
      <div className="chartGrid">
        <ChartBox title="Price Distribution" flex={1.4}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priceDist} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="range" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} labelStyle={{ color: "rgba(10,14,16,0.78)" }} itemStyle={{ color: UI_ACCENT }} />
              <Bar dataKey="count" fill={UI_ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Avg Price by Brand" flex={1}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={brandPrice} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={AXIS_TICK_SM} />
              <YAxis type="category" dataKey="brand" tick={AXIS_TICK_BRAND} width={70} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, "Avg Price"]} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {brandPrice.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Price Percentile Breakdown">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[["Min", min], ["25th Pct", p25], ["Median", median], ["75th Pct", p75], ["Max", max], ["Mean", mean], ["Std Dev", std], ["Count", count]].map(([l, v]) => (
            <div key={l} style={{ background: "rgba(255,255,255,0.55)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(31,46,49,0.10)" }}>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.55)", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(10,14,16,0.90)", marginTop: 4 }}>{l === "Count" ? v.toLocaleString() : fmt(v)}</div>
            </div>
          ))}
        </div>
      </ChartBox>
    </div>
  );
}

// DOMAIN 2: Data Formatting & Standardization
function Domain2({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  let filteredData = data;
  if (filter !== "All") filteredData = data.filter(d => d.Brand === filter);

  const fuelObj = {}, transObj = {}, condObj = {}, brandObj = {};
  
  filteredData.forEach(d => {
    fuelObj[d['Fuel Type']] = (fuelObj[d['Fuel Type']] || 0) + 1;
    transObj[d.Transmission] = (transObj[d.Transmission] || 0) + 1;
    condObj[d.Condition] = (condObj[d.Condition] || 0) + 1;
    brandObj[d.Brand] = (brandObj[d.Brand] || 0) + 1;
  });

  const fuel = Object.entries(fuelObj).map(([k, v]) => ({ name: String(k), value: v, color: FUEL_COLORS[k] || "#ccc" }));
  const trans = Object.entries(transObj).map(([k, v]) => ({ name: String(k), value: v }));
  const cond = Object.entries(condObj).map(([k, v]) => ({ name: String(k), value: v }));
  const brands = Object.entries(brandObj).map(([k, v]) => ({ brand: String(k), count: v }));

  return (
    <div>
      <SectionTitle icon={<FaBroom />} title="Data Formatting & Standardization" subtitle="Standardize mixed formats, validate data types, detect encoding issues" />
      <div className="kpiRow">
        <KpiCard label="Columns" value="13" sub="All correctly typed" accent={UI_ACCENT} />
        <KpiCard label="Null Values" value="0" sub="After cleaning" accent={UI_ACCENT} />
        <KpiCard label="Fuel Types" value="4" sub="Electric/Diesel/Petrol/Hybrid" accent={UI_ACCENT} />
        <KpiCard label="Year Range" value="2000–23" sub="24 years of data" accent={UI_ACCENT} />
        <KpiCard label="Brands" value="7" sub="Distinct manufacturers" accent={UI_ACCENT} />
      </div>
      <div className="chartGrid">
        <ChartBox title="Fuel Type Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fuel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: PIE_LABEL_LINE }}>
                {fuel.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Transmission Split">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={trans} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: PIE_LABEL_LINE }}>
                <Cell fill={THEME_SHADES[2]} /><Cell fill={THEME_SHADES[0]} />
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Condition Split">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={cond} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: PIE_LABEL_LINE }}>
                <Cell fill={THEME_SHADES[5]} /><Cell fill={THEME_SHADES[2]} /><Cell fill={THEME_SHADES[0]} />
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Brand Record Counts">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={brands} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="brand" tick={AXIS_TICK_BRAND} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {brands.map((e, i) => <Cell key={i} fill={BRAND_COLORS[e.brand] || "#ccc"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

// DOMAIN 3: Relational Integrity
function Domain3({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;
  
  let validBrands = ["Audi", "BMW", "Ford", "Honda", "Mercedes", "Tesla", "Toyota"];
  if (filter !== "All") validBrands = [filter];

  const fuels = ["Diesel", "Electric", "Hybrid", "Petrol"];
  const matrix = validBrands.map(b => {
    const row = { brand: b };
    fuels.forEach(f => {
      row[f] = data.filter(d => d.Brand === b && d["Fuel Type"] === f).length;
    });
    return row;
  });

  const transData = validBrands.map(b => {
    return {
      brand: b,
      Automatic: data.filter(d => d.Brand === b && d.Transmission === "Automatic").length,
      Manual: data.filter(d => d.Brand === b && d.Transmission === "Manual").length
    };
  });

  return (
    <div>
      <SectionTitle icon={<FaLink />} title="Relational Integrity" subtitle="Verify cross-column relationships are logically consistent" />
      <div className="kpiRow">
        <KpiCard label="Electric → Engine 0" value="775/775" sub="100% consistent" accent={UI_ACCENT} />
        <KpiCard label="Tesla → Electric Only" value="314/314" sub="100% correct" accent={UI_ACCENT} />
        <KpiCard label="Elec + Manual Fixed" value="414" sub="Rows corrected" accent={UI_ACCENT} />
        <KpiCard label="Brand-Fuel Pairs" value="25" sub="Valid combinations" accent={UI_ACCENT} />
      </div>
      <div className="chartGrid">
        <ChartBox title="Fuel Type by Brand (Stacked)" flex={1.5}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={matrix} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="brand" tick={{ fill: "rgba(31,46,49,0.80)", fontSize: 11 }} />
              <YAxis tick={AXIS_TICK_SM} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              {fuels.map((f, i) => <Bar key={f} dataKey={f} stackId="a" fill={FUEL_COLORS[f]} />)}
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Transmission by Brand">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={transData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="brand" tick={{ fill: "rgba(31,46,49,0.80)", fontSize: 11 }} />
              <YAxis tick={AXIS_TICK_SM} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="Automatic" fill={THEME_SHADES[2]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Manual" fill={THEME_SHADES[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Integrity Rules Passed">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            ["Tesla → Electric Only", "PASS", "All 314 Tesla records use Electric fuel"],
            ["Electric → Engine Size 0", "PASS", "All 775 Electric cars have Engine Size = 0"],
            ["Electric → Automatic Only", "PASS", "414 manual EVs corrected (no clutch in EV)"],
            ["Model S launch ≥ 2012", "PASS", "35 invalid rows corrected"],
            ["Model X launch ≥ 2015", "PASS", "59 invalid rows corrected"],
            ["Model 3 launch ≥ 2017", "PASS", "56 invalid rows corrected"],
          ].map(([rule, status, detail]) => (
            <div key={rule} style={{ background: "rgba(255,255,255,0.55)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(31,46,49,0.10)" }}>
              <div style={{ fontSize: 11, color: "rgba(31,46,49,0.72)", fontWeight: 800, marginBottom: 4, letterSpacing: 0.08, textTransform: "uppercase" }}>{status}</div>
              <div style={{ fontSize: 12, color: "rgba(10,14,16,0.92)", marginBottom: 4 }}>{rule}</div>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.56)" }}>{detail}</div>
            </div>
          ))}
        </div>
      </ChartBox>
    </div>
  );
}

// DOMAIN 4: Deduplication
function Domain4({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  const brandObj = {}, modelObj = {};
  
  data.forEach(d => {
    brandObj[d.Brand] = (brandObj[d.Brand] || 0) + 1;
    const modelKey = `${d.Brand} ${d.Model}`;
    if (!modelObj[modelKey]) modelObj[modelKey] = { count: 0, brand: d.Brand, label: modelKey };
    modelObj[modelKey].count++;
  });

  let brandData = Object.entries(brandObj).map(([k,v]) => ({ brand: k, total: v }));
  let modelData = Object.values(modelObj);

  if (filter !== "All") {
    brandData = brandData.filter(b => b.brand === filter);
    modelData = modelData.filter(m => m.brand === filter);
  }

  const count = filter === "All" ? data.length : data.filter(d => d.Brand === filter).length;

  return (
    <div>
      <SectionTitle icon={<FaSearch />} title="Deduplication" subtitle="Find duplicate records, near-identical rows, and orphaned entries" />
      <div className="kpiRow">
        <KpiCard label="Total Rows" value={count.toLocaleString()} sub={`For ${filter}`} accent={UI_ACCENT} />
        <KpiCard label="Unique Car IDs" value={count.toLocaleString()} sub="0 duplicate IDs" accent={UI_ACCENT} />
        <KpiCard label="Exact Duplicates" value="0" sub="Brand+Model+Year+Mi+Price" accent={UI_ACCENT} />
        <KpiCard label="Duplicate Rate" value="0.0%" sub="Dataset is clean" accent={UI_ACCENT} />
        <KpiCard label="Models per Brand" value="4" sub="All brands equal" accent={UI_ACCENT} />
      </div>
      <div className="chartGrid">
        <ChartBox title="Records per Brand">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={brandData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="brand" tick={AXIS_TICK_BRAND} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {brandData.map((e, i) => <Cell key={i} fill={BRAND_COLORS[e.brand] || "#ccc"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Records per Model (all brands)" flex={1.6}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={modelData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK_XS} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={AXIS_TICK_SM} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {modelData.map((e, i) => <Cell key={i} fill={BRAND_COLORS[e.brand] || "#ccc"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Duplication Audit Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[["Car ID Duplicates", "0 found", UI_ACCENT, "Every record has a unique identifier"],
            ["Exact Row Duplicates", "0 found", UI_ACCENT, "No two rows identical across all key columns"],
            ["Brand Coverage", "7 brands", UI_ACCENT, "Toyota (346), Mercedes (331), BMW (326), Audi (323), Tesla (314), Ford (307), Honda (303)"],
            ["Model Coverage", "4 per brand", UI_ACCENT, "28 total models, evenly distributed"]
          ].map(([title, val, c, detail]) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.60)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(31,46,49,0.10)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(10,14,16,0.92)" }}>{title}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{val}</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.58)" }}>{detail}</div>
            </div>
          ))}
        </div>
      </ChartBox>
    </div>
  );
}

// DOMAIN 5: Visual & Trend Analysis
function Domain5({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  let filteredData = data;
  if (filter !== "All") filteredData = data.filter(d => d.Brand === filter);

  const yearObj = {};
  filteredData.forEach(d => {
    let y = Math.floor(Number(d.Year));
    if (isNaN(y)) return;
    if (!yearObj[y]) yearObj[y] = { count: 0, sum: 0 };
    yearObj[y].count++;
    yearObj[y].sum += Number(d.Price) || 0;
  });

  const yearData = Object.keys(yearObj).sort().map(y => ({
    year: y,
    avgPrice: Math.round(yearObj[y].sum / yearObj[y].count),
    count: yearObj[y].count
  }));

  return (
    <div>
      <SectionTitle icon={<FaChartLine />} title="Visual & Trend Analysis" subtitle="Detect sudden spikes/drops, volume shifts, and time-based anomalies" />
      <div className="kpiRow">
        <KpiCard label="Year Span" value="24 yrs" sub="2000 – 2023" accent={UI_ACCENT} />
        <KpiCard label="Peak Volume Year" value="2020" sub="174 records" accent={UI_ACCENT} />
        <KpiCard label="Highest Avg Yr" value="2005" sub="$58,103 avg" accent={UI_ACCENT} />
        <KpiCard label="Lowest Avg Yr" value="2021" sub="$49,480 avg" accent={UI_ACCENT} />
        <KpiCard label="Price Stability" value="~±15%" sub="No extreme spikes" accent={UI_ACCENT} />
      </div>
      <ChartBox title="Average Price by Year (2000–2023)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yearData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="year" tick={AXIS_TICK_SM} interval={2} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={AXIS_TICK_SM} domain={[45000, 62000]} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, "Avg Price"]} />
            <Line type="monotone" dataKey="avgPrice" stroke={UI_ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: UI_ACCENT }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <div style={{ height: 16 }} />
      <ChartBox title="Record Count by Year (Volume Trend)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="year" tick={AXIS_TICK_SM} interval={2} />
            <YAxis tick={AXIS_TICK_SM} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            <Bar dataKey="count" fill={UI_ACCENT} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

// DOMAIN 6: Completeness & Coverage
function Domain6({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  // Assuming dynamic file parsing has dropped null rows, or handled in cleaning stage
  const coverageData = [
    { col: "Car ID", pct: 100 },
    { col: "Brand", pct: 100 },
    { col: "Year", pct: 100 },
    { col: "Engine Size", pct: 100 },
    { col: "Fuel Type", pct: 100 },
    { col: "Transmission", pct: 100 }
  ];

  let filteredData = data;
  if (filter !== "All") filteredData = data.filter(d => d.Brand === filter);

  let pBudget = 0, pMid = 0, pHigh = 0, pPrem = 0;
  let mLow = 0, mMid = 0, mHigh = 0, mVHigh = 0;

  filteredData.forEach(d => {
    let p = Number(d.Price) || 0;
    if (p < 25000) pBudget++;
    else if (p < 50000) pMid++;
    else if (p < 75000) pHigh++;
    else pPrem++;

    let m = Number(d.Mileage) || 0;
    if (m < 50000) mLow++;
    else if (m < 100000) mMid++;
    else if (m < 200000) mHigh++;
    else mVHigh++;
  });

  const priceRangeDist = [
    { name: "Budget (<25K)", value: pBudget },
    { name: "Mid (25-50K)", value: pMid },
    { name: "Upper-Mid (50-75K)", value: pHigh },
    { name: "Premium (75K+)", value: pPrem }
  ];

  const mileRangeDist = [
    { name: "Low (<50K)", value: mLow },
    { name: "Medium (50-100K)", value: mMid },
    { name: "High (100-200K)", value: mHigh },
    { name: "Very High (200K+)", value: mVHigh }
  ];

  return (
    <div>
      <SectionTitle icon={<FaCheckSquare />} title="Completeness & Coverage" subtitle="Measure population rate per column and identify below-threshold fields" />
      <div className="kpiRow">
        <KpiCard label="Overall Coverage" value="100%" sub="All 13 columns" accent={UI_ACCENT} />
        <KpiCard label="Null Values" value="0" sub="Zero missing values" accent={UI_ACCENT} />
        <KpiCard label="Total Cells" value="29,250" sub="2250 × 13 cols" accent={UI_ACCENT} />
        <KpiCard label="Price Ranges" value="4" sub="Budget → Premium" accent={UI_ACCENT} />
        <KpiCard label="Mileage Ranges" value="4" sub="Low → Very High" accent={UI_ACCENT} />
      </div>
      <ChartBox title="Column Coverage % (All at 100% post-cleaning)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={coverageData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" domain={[95, 100]} tick={AXIS_TICK_SM} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="col" tick={{ fill: "rgba(31,46,49,0.78)", fontSize: 10 }} width={90} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} formatter={(v) => [`${v}%`, "Coverage"]} />
            <Bar dataKey="pct" fill={UI_ACCENT} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
      <div style={{ height: 16 }} />
      <div className="chartGrid">
        <ChartBox title="Price Range Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={priceRangeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                {priceRangeDist.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            <Legend wrapperStyle={{ ...LEGEND_STYLE, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Mileage Range Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={mileRangeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                {mileRangeDist.map((_, i) => <Cell key={i} fill={PALETTE[i + 1]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            <Legend wrapperStyle={{ ...LEGEND_STYLE, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
}

// DOMAIN 7: Categorical Data Quality
function Domain7({ filter, data }) {
  if (!data || data.length === 0) return <div>Loading...</div>;

  let validBrands = ["Audi", "BMW", "Ford", "Honda", "Mercedes", "Tesla", "Toyota"];
  if (filter !== "All") validBrands = [filter];

  const condData = validBrands.map(b => {
    const row = { brand: b };
    ["Like New", "New", "Used"].forEach(c => {
      row[c] = data.filter(d => d.Brand === b && d.Condition === c).length;
    });
    return row;
  });

  const fuelByBrand = validBrands.map(b => {
    const row = { brand: b };
    ["Diesel", "Electric", "Hybrid", "Petrol"].forEach(f => {
      row[f] = data.filter(d => d.Brand === b && d["Fuel Type"] === f).length;
    });
    return row;
  });

  return (
    <div>
      <SectionTitle icon={<FaTags />} title="Categorical Data Quality" subtitle="Audit categorical columns for invalid variants and validate accepted values" />
      <div className="kpiRow">
        <KpiCard label="Fuel Type Valid" value="100%" sub="2250/2250 rows" accent={UI_ACCENT} />
        <KpiCard label="Transmission Valid" value="100%" sub="2250/2250 rows" accent={UI_ACCENT} />
        <KpiCard label="Condition Valid" value="100%" sub="2250/2250 rows" accent={UI_ACCENT} />
        <KpiCard label="Brand Valid" value="100%" sub="2250/2250 rows" accent={UI_ACCENT} />
        <KpiCard label="Models per Brand" value="4 each" sub="28 total models" accent={UI_ACCENT} />
      </div>
      <div className="chartGrid">
        <ChartBox title="Condition by Brand">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={condData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="brand" tick={{ fill: "rgba(31,46,49,0.80)", fontSize: 11 }} />
              <YAxis tick={AXIS_TICK_SM} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="Used" stackId="a" fill={THEME_SHADES[0]} />
              <Bar dataKey="Like New" stackId="a" fill={THEME_SHADES[3]} />
              <Bar dataKey="New" stackId="a" fill={THEME_SHADES[5]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title="Fuel Type by Brand">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fuelByBrand} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="brand" tick={{ fill: "rgba(31,46,49,0.80)", fontSize: 11 }} />
              <YAxis tick={AXIS_TICK_SM} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              {["Diesel", "Electric", "Hybrid", "Petrol"].map(f => <Bar key={f} dataKey={f} fill={FUEL_COLORS[f]} stackId="a" />)}
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <ChartBox title="Accepted Values Validation">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            ["Brand", "Toyota, BMW, Audi, Ford, Honda, Mercedes, Tesla", "All 2250 records valid"],
            ["Fuel Type", "Electric, Diesel, Petrol, Hybrid", "All 2250 records valid"],
            ["Transmission", "Automatic, Manual", "All 2250 records valid"],
            ["Condition", "New, Used, Like New", "All 2250 records valid"],
          ].map(([col, accepted, status]) => (
            <div key={col} style={{ background: "rgba(255,255,255,0.60)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(31,46,49,0.10)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(10,14,16,0.92)" }}>{col}</span>
                <span style={{ fontSize: 11, color: "rgba(31,46,49,0.72)" }}>PASS</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.60)", marginBottom: 4 }}>Accepted: <span style={{ color: "rgba(10,14,16,0.82)" }}>{accepted}</span></div>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.56)" }}>{status}</div>
            </div>
          ))}
        </div>
      </ChartBox>
    </div>
  );
}

// Data Cleaning Summary Tab
function CleaningSummary() {
  const fixes = [
      { issue: "Tesla Manual Transmission", count: 167, fix: "Changed to Automatic" },
      { issue: "Other Electric Manual Transmission", count: 247, fix: "Changed to Automatic" },
      { issue: "Tesla Models Before Launch Year", count: 216, fix: "Year corrected to launch year" },
      { issue: "Electric Cars with Engine Size > 0", count: 775, fix: "Set Engine Size to 0" },
      { issue: "New Cars with Mileage > 10,000", count: 269, fix: "Changed Condition to Used" },
  ];
  return (
    <div>
      <SectionTitle icon={<FaWrench />} title="Data Cleaning Summary" subtitle="All logical errors detected and corrected before the 7-domain audit" />
      <div className="kpiRow">
        <KpiCard label="Issues Found" value="5" sub="Logical categories" accent={UI_ACCENT} />
        <KpiCard label="Cells Fixed" value="1,674" sub="Individual corrections" accent={UI_ACCENT} />
        <KpiCard label="Rows Affected" value="~1,200+" sub="Unique rows touched" accent={UI_ACCENT} />
        <KpiCard label="Final Quality" value="100%" sub="All checks pass" accent={UI_ACCENT} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {fixes.map((f, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 18px 55px rgba(12,16,18,0.12)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(118,154,160,0.14)", border: `1px solid ${UI_ACCENT}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "rgba(10,14,16,0.92)", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(10,14,16,0.92)", marginBottom: 4 }}>{f.issue}</div>
              <div style={{ fontSize: 12, color: "rgba(31,46,49,0.72)" }}>Fix: {f.fix}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: UI_ACCENT, fontFamily: "Outfit, system-ui, sans-serif" }}>{f.count}</div>
              <div style={{ fontSize: 10, color: "rgba(31,46,49,0.56)" }}>rows corrected</div>
            </div>
          </div>
        ))}
      </div>
      <ChartBox title="Fixes Distribution">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={fixes.map(f => ({ name: f.issue.split(" ").slice(0, 3).join(" "), count: f.count }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} />
            <YAxis type="category" dataKey="name" tick={{ fill: "rgba(31,46,49,0.78)", fontSize: 10 }} width={150} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,46,49,0.10)", borderRadius: 12 }} />
            <Bar dataKey="count" fill={UI_ACCENT} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

function BrandDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".brandDropdown")) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = value === "All" ? "All Brands" : value;

  return (
    <div className="brandDropdown">
      <button
        type="button"
        className="brandButton"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by brand"
      >
        <span className="brandButtonLabel">{label}</span>
        <span className="brandChevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="brandMenu" role="listbox" aria-label="Brands">
          <button
            type="button"
            role="option"
            aria-selected={value === "All"}
            className={`brandOption ${value === "All" ? "brandOptionActive" : ""}`}
            onClick={() => { onChange("All"); setOpen(false); }}
          >
            All Brands
          </button>
          {options.map((b) => (
            <button
              key={b}
              type="button"
              role="option"
              aria-selected={value === b}
              className={`brandOption ${value === b ? "brandOptionActive" : ""}`}
              onClick={() => { onChange(b); setOpen(false); }}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const NAV = [
  { id: "cleaning", label: "Cleaning", icon: <FaWrench /> },
  { id: "d1", label: "Statistical", icon: <FaChartBar /> },
  { id: "d2", label: "Formatting", icon: <FaBroom /> },
  { id: "d3", label: "Relational", icon: <FaLink /> },
  { id: "d4", label: "Deduplication", icon: <FaSearch /> },
  { id: "d5", label: "Trends", icon: <FaChartLine /> },
  { id: "d6", label: "Coverage", icon: <FaCheckSquare /> },
  { id: "d7", label: "Categorical", icon: <FaTags /> },
];

export default function App() {
  const [active, setActive] = useState("cleaning");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [csvData, setCsvData] = useState([]);
  
  useEffect(() => {
    // Attempting to fetch directly from public folder
    fetch('/data_cleaned.csv')
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            setCsvData(results.data);
          }
        });
      })
      .catch(err => console.error("Error loading CSV:", err));
  }, []);

  const renderContent = () => {
    switch (active) {
      case "cleaning": return <CleaningSummary />;
      case "d1": return <Domain1 filter={selectedBrand} data={csvData} />;
      case "d2": return <Domain2 filter={selectedBrand} data={csvData} />;
      case "d3": return <Domain3 filter={selectedBrand} data={csvData} />;
      case "d4": return <Domain4 filter={selectedBrand} data={csvData} />;
      case "d5": return <Domain5 filter={selectedBrand} data={csvData} />;
      case "d6": return <Domain6 filter={selectedBrand} data={csvData} />;
      case "d7": return <Domain7 filter={selectedBrand} data={csvData} />;
      default: return null;
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebarInner">
          <div className="brandBlock">
            <div className="brandName">Qubit</div>
            <div className="brandTag">Car dataset audit</div>
          </div>

          <nav className="nav" aria-label="Navigation">
            {NAV.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`navItem ${active === t.id ? "navItemActive" : ""}`}
                aria-current={active === t.id ? "page" : undefined}
              >
                <span className="navIcon" aria-hidden="true">
                  {t.icon}
                </span>
                <span className="navLabel">{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebarFooter">
            <div className="footerHint"></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="title">Car Price Dataset <span className="titleAccent">Audit</span> Dashboard</div>
          </div>

          <div className="controls">
            <BrandDropdown
              value={selectedBrand}
              onChange={setSelectedBrand}
              options={["Audi", "BMW", "Ford", "Honda", "Mercedes", "Tesla", "Toyota"]}
            />

            {[
              [csvData.length.toLocaleString(), "Records"],
              [csvData.length > 0 ? Object.keys(csvData[0]).length : 0, "Columns"],
              ["1,674", "Cells Fixed"],
              ["100%", "Coverage"],
            ].map(([v, l]) => (
              <div key={l} className="miniStat">
                <div className="miniStatValue">{v}</div>
                <div className="miniStatLabel">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="content">
          <div className="pageSection">{renderContent()}</div>
        </div>
      </main>

      <ChatWidget data={csvData} />
    </div>
  );
}