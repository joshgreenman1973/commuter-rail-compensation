import React, { useState, useEffect } from 'react';

// ============================================================
// SOURCING TIER DEFINITIONS
// A = Disclosed individual payroll record (state transparency database)
// B = Agency official statement / budget / press release
// C = Union public statement
// D = News reporting citing primary source
// X = Not available
// ============================================================

const TIERS = {
  A: { color: '#1b5e20', label: 'A', desc: 'Disclosed individual payroll record' },
  B: { color: '#1565c0', label: 'B', desc: 'Agency official statement or budget document' },
  C: { color: '#6a1b9a', label: 'C', desc: 'Union public statement or filing' },
  D: { color: '#ef6c00', label: 'D', desc: 'News reporting citing primary source' },
  X: { color: '#999',    label: '—', desc: 'Not available in public records' },
};

// ============================================================
// BEA Regional Price Parities, 2024 (All Items, Metro Area)
// Source: U.S. Bureau of Economic Analysis via FRED
// Index: 100 = U.S. national average
// ============================================================
const RPP = {
  'New York-Newark-Jersey City, NY-NJ-PA': 112.563,
  'Boston-Cambridge-Newton, MA-NH': 108.266,
  'Chicago-Naperville-Elgin, IL-IN-WI': 103.595,
  'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD': 102.554,
  'Baltimore-Columbia-Towson, MD': 105.0, // approx; state-level MD RPP 2024
  'Washington-Arlington-Alexandria, DC-VA-MD-WV': 112.0, // approx for DC metro
  'San Francisco-Oakland-Hayward, CA': 119.0, // approx, for Caltrain context
  'National average': 100.0,
};

// ============================================================
// DATA — all from primary sources
// ============================================================

const rows = [
  {
    system: 'LIRR',
    region: 'New York',
    metroLabel: 'NY metro',
    metro: 'New York-Newark-Jersey City, NY-NJ-PA',
    operator: 'MTA (public)',
    workforce: { v: 7700, tier: 'B', src: 'MTA 2024 budget materials' },
    avgPay: { v: 121646, tier: 'A', src: 'Empire Center SeeThroughNY, full 2024 MTA payroll database' },
    medianPay: { v: null, tier: 'X', src: 'Not separately calculated by Empire Center' },
    totalPayroll: { v: 936, tier: 'A', src: 'Calculated from SeeThroughNY (avg × headcount)' },
    highEarner: { v: 505147, tier: 'A', src: 'SeeThroughNY: 2024 MTA top earner (includes $308k OT)' },
    over100kOT: { v: 259, tier: 'A', src: 'Empire Center: 259 LIRR employees earned >$100k in OT alone in 2024' },
    engineerTopHourly: { v: null, tier: 'X', src: 'Step-rate not separately published' },
    pensionStructure: 'MTA DB + federal RRB',
  },
  {
    system: 'Metro-North',
    region: 'New York / Connecticut',
    metroLabel: 'NY metro',
    metro: 'New York-Newark-Jersey City, NY-NJ-PA',
    operator: 'MTA (public)',
    workforce: { v: 6883, tier: 'A', src: 'OpenGovPay employee count from disclosed payroll' },
    avgPay: { v: 119800, tier: 'A', src: 'Empire Center SeeThroughNY (rounded)' },
    medianPay: { v: null, tier: 'X', src: 'Not separately calculated' },
    totalPayroll: { v: 825, tier: 'A', src: 'Calculated from SeeThroughNY' },
    highEarner: { v: null, tier: 'X', src: 'Top MNR-specific earner not separately reported for 2024' },
    over100kOT: { v: 98, tier: 'D', src: 'News 12 / Empire Center: ~100 MNR workers earned >$100k OT in 2024' },
    engineerTopHourly: { v: null, tier: 'X', src: 'Step-rate not separately published' },
    pensionStructure: 'MTA DB + federal RRB',
  },
  {
    system: 'NJ Transit (all)',
    region: 'New Jersey',
    metroLabel: 'NY metro',
    metro: 'New York-Newark-Jersey City, NY-NJ-PA',
    operator: 'NJT (public)',
    workforce: { v: 13604, tier: 'A', src: 'NJ public records, FY2022 (most recent published)' },
    avgPay: { v: 80733, tier: 'A', src: 'NJ public records via OPRA, FY2022' },
    medianPay: { v: 81303, tier: 'A', src: 'NJ public records via OPRA, FY2022' },
    totalPayroll: { v: 945, tier: 'B', src: 'NJT FY2023 OT $216.3M = 22.9% of payroll → implied ~$945M' },
    highEarner: { v: 296566, tier: 'A', src: 'NJ.com OPRA analysis: 2023 top earner was a conductor; $101k OT' },
    over100kOT: { v: 82, tier: 'A', src: 'NJ.com 2024 OPRA analysis: 82 NJT employees earned >$100k OT in 2023' },
    engineerTopHourly: { v: 49.82, tier: 'C', src: 'BLET cited rate during May 2025 strike (Labor Notes)' },
    pensionStructure: 'NJ PERS + federal RRB',
  },
  {
    system: 'NJ Transit (rail engineers)',
    region: 'New Jersey',
    metroLabel: 'NY metro',
    metro: 'New York-Newark-Jersey City, NY-NJ-PA',
    operator: 'NJT (public)',
    workforce: { v: 461, tier: 'C', src: 'BLET stated membership: 461 engineers + trainees (2025)' },
    avgPay: { v: 135000, tier: 'B', src: 'NJ Transit official statement, May 2025 strike' },
    medianPay: { v: null, tier: 'X', src: 'Not separately published' },
    totalPayroll: { v: null, tier: 'X', src: 'Craft-level total not separately published' },
    highEarner: { v: 200000, tier: 'B', src: 'NJT statement: highest earners "exceeding $200,000"' },
    over100kOT: { v: 0, tier: 'A', src: 'NJ.com 2024 analysis: no engineers in top 50 OT earners' },
    engineerTopHourly: { v: 49.82, tier: 'C', src: 'BLET cited rate, May 2025' },
    pensionStructure: 'NJ PERS + federal RRB',
  },
  {
    system: 'Metra',
    region: 'Chicago',
    metroLabel: 'Chicago metro',
    metro: 'Chicago-Naperville-Elgin, IL-IN-WI',
    operator: 'Metra (public)',
    workforce: { v: 3610, tier: 'A', src: 'Illinois public records (GovSalaries/OpenGovPay), 2024' },
    avgPay: { v: 87520, tier: 'A', src: 'Illinois public records (GovSalaries), 2024' },
    medianPay: { v: 89321, tier: 'A', src: 'Illinois public records (GovSalaries), 2024' },
    totalPayroll: { v: 316, tier: 'A', src: 'Calculated: 3,610 × $87,520' },
    highEarner: { v: 337450, tier: 'A', src: 'Illinois public records, 2024 top Metra earner' },
    over100kOT: { v: null, tier: 'X', src: 'OT breakouts not in summary databases; FOIA-able from Metra' },
    engineerTopHourly: { v: null, tier: 'X', src: 'Metra uses miles+hours formula, not direct hourly rate' },
    pensionStructure: 'Metra DB + federal RRB',
  },
  {
    system: 'MBTA (T workforce)',
    region: 'Boston',
    metroLabel: 'Boston metro',
    metro: 'Boston-Cambridge-Newton, MA-NH',
    operator: 'MBTA (public)',
    workforce: { v: 9908, tier: 'A', src: 'Massachusetts state payroll database, 2024' },
    avgPay: { v: 88775, tier: 'A', src: 'Calculated: $879.58M / 9,908 employees (MA state data)' },
    medianPay: { v: null, tier: 'X', src: 'MA database publishes individual records, not median' },
    totalPayroll: { v: 879.58, tier: 'A', src: 'Massachusetts state payroll, 2024' },
    highEarner: { v: 546000, tier: 'A', src: 'MA state data: GM Phillip Eng' },
    over100kOT: { v: null, tier: 'X', src: 'Not in published summary; available in raw MA payroll data' },
    engineerTopHourly: { v: null, tier: 'X', src: 'Subway operators, not commuter rail engineers' },
    pensionStructure: 'MBTA Retirement Fund + state plan',
  },
  {
    system: 'MARC (MD MTA portion)',
    region: 'Washington / Baltimore',
    metroLabel: 'Baltimore metro',
    metro: 'Baltimore-Columbia-Towson, MD',
    operator: 'MTA Maryland (public) + Amtrak + Alstom (contractor)',
    workforce: { v: 7723, tier: 'A', src: 'Maryland state payroll, 2023 (MTA Maryland total)' },
    avgPay: { v: 76803, tier: 'A', src: 'Maryland state payroll, 2023 (MTA Maryland-wide)' },
    medianPay: { v: 72043, tier: 'A', src: 'Maryland state payroll, 2023' },
    totalPayroll: { v: 593, tier: 'A', src: 'Calculated: 7,723 × $76,803' },
    highEarner: { v: 349773, tier: 'A', src: 'Maryland state payroll, 2023 top MTA Maryland earner' },
    over100kOT: { v: null, tier: 'X', src: 'Not in summary database' },
    engineerTopHourly: { v: null, tier: 'X', src: 'MARC operations split between Amtrak and Alstom contractors' },
    pensionStructure: 'MD state plan + RRB (for rail crews)',
  },
];

// ============================================================
// HELPERS
// ============================================================

const fmt$ = (n) => '$' + n.toLocaleString();
const fmtM = (n) => '$' + n.toFixed(0) + 'M';
const fmtHr = (n) => '$' + n.toFixed(2) + '/hr';

// Cost-of-living adjustment: nominal value × (100 / metro RPP)
// This converts the wage into national-average-equivalent purchasing power
const adjustForCOL = (nominal, metro) => {
  const rpp = RPP[metro] || 100;
  return Math.round(nominal * (100 / rpp));
};

// ============================================================
// CELL COMPONENT — handles tier badge + source tooltip + COL adjustment
// ============================================================

const Cell = ({ data, metro, formatter = fmt$, isStr = false, applyCOL = false }) => {
  const [showSrc, setShowSrc] = useState(false);
  const toggle = () => setShowSrc(s => !s);
  const tierInfo = TIERS[data.tier];
  const isEmpty = data.tier === 'X';

  let displayValue = data.v;
  if (applyCOL && data.v != null && !isStr && metro && metro !== 'National average') {
    displayValue = adjustForCOL(data.v, metro);
  }

  return (
    <td
      style={{
        padding: '10px 12px',
        verticalAlign: 'top',
        position: 'relative',
        borderBottom: '1px solid #eee',
        background: showSrc ? '#fffbeb' : 'transparent',
        transition: 'background 120ms',
        cursor: 'help',
      }}
      onMouseEnter={() => setShowSrc(true)}
      onMouseLeave={() => setShowSrc(false)}
      onClick={toggle}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      aria-label={data.src}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 13,
          color: isEmpty ? '#999' : '#111',
          fontWeight: isEmpty ? 400 : 500,
          fontStyle: isEmpty ? 'italic' : 'normal',
        }}>
          {data.v == null ? 'Not available' : (isStr ? data.v : formatter(displayValue))}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#fff',
          background: tierInfo.color,
          padding: '2px 5px',
          borderRadius: 3,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}>{tierInfo.label}</span>
      </div>
      {showSrc && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 12,
          right: 12,
          background: '#111',
          color: '#fff',
          padding: '8px 10px',
          fontSize: 11,
          lineHeight: 1.4,
          borderRadius: 4,
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          marginTop: 4,
        }}>
          {data.src}
        </div>
      )}
    </td>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const Table = () => {
  const [adjustCOL, setAdjustCOL] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('col') === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (adjustCOL) url.searchParams.set('col', '1');
    else url.searchParams.delete('col');
    window.history.replaceState({}, '', url);
  }, [adjustCOL]);

  const downloadCSV = () => {
    const headers = ['System', 'Region', 'Operator', 'Headcount', 'Avg pay (nominal)', 'Avg pay (COL-adjusted)', 'Median pay (nominal)', 'Total payroll $M', 'Top earner (nominal)', 'Workers >$100k OT', 'Engineer top $/hr', 'Pension structure', 'Metro RPP'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const rpp = RPP[r.metro] || 100;
      const adj = (v) => v == null ? '' : Math.round(v * (100 / rpp));
      const cells = [
        r.system, r.region, r.operator,
        r.workforce.v ?? '',
        r.avgPay.v ?? '',
        adj(r.avgPay.v),
        r.medianPay.v ?? '',
        r.totalPayroll.v ?? '',
        r.highEarner.v ?? '',
        r.over100kOT.v ?? '',
        r.engineerTopHourly.v ?? '',
        r.pensionStructure,
        rpp,
      ].map(c => {
        const s = String(c);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(cells.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'commuter-rail-compensation.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build chart data dynamically based on toggle
  const chartData = rows
    .filter(r => r.avgPay.v != null && r.avgPay.tier !== 'X')
    .map(r => ({
      system: r.system,
      metroLabel: r.metroLabel,
      rpp: RPP[r.metro],
      nominal: r.avgPay.v,
      value: adjustCOL ? adjustForCOL(r.avgPay.v, r.metro) : r.avgPay.v,
      tier: r.avgPay.tier,
    }))
    .sort((a, b) => b.value - a.value);

  const maxVal = Math.max(...chartData.map(d => d.value));

  return (
    <div style={{
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: '#111',
      maxWidth: 1320,
      margin: '0 auto',
      padding: '32px 20px',
      background: '#fff',
    }}>
      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        margin: '0 0 8px 0',
        lineHeight: 1.2,
      }}>
        U.S. commuter rail compensation: a sourced comparison
      </h1>
      <p style={{
        fontSize: 14,
        color: '#555',
        margin: '0 0 24px 0',
        lineHeight: 1.5,
        maxWidth: 820,
      }}>
        Average compensation across major U.S. commuter rail and transit systems, drawn from state payroll transparency databases. Every cell is labeled with a sourcing tier (A–D); hover or tap for the specific source. Toggle the cost-of-living adjustment to convert nominal pay into national-average-equivalent purchasing power using Bureau of Economic Analysis (BEA) Regional Price Parities, 2024.
      </p>

      {/* TOGGLE */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        marginBottom: 20,
        background: adjustCOL ? '#fff3e0' : '#f5f5f5',
        borderRadius: 4,
        border: adjustCOL ? '1px solid #ff9800' : '1px solid #ddd',
        transition: 'all 200ms',
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          flex: 1,
        }}>
          <button
            type="button"
            onClick={() => setAdjustCOL(!adjustCOL)}
            aria-pressed={adjustCOL}
            aria-label="Toggle cost-of-living adjustment"
            style={{
              border: 0,
              padding: 0,
              cursor: 'pointer',
              width: 44,
              height: 24,
              background: adjustCOL ? '#ff9800' : '#bbb',
              borderRadius: 12,
              position: 'relative',
              transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: 2,
              left: adjustCOL ? 22 : 2,
              width: 20,
              height: 20,
              background: '#fff',
              borderRadius: 10,
              transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span>
            {adjustCOL ? 'Adjusted for cost of living (national-equivalent purchasing power)' : 'Nominal dollars (as paid)'}
          </span>
          <input
            type="checkbox"
            checked={adjustCOL}
            onChange={() => setAdjustCOL(!adjustCOL)}
            style={{ display: 'none' }}
          />
        </label>
        <button
          type="button"
          onClick={downloadCSV}
          style={{
            background: '#111',
            color: '#fff',
            border: 0,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.3,
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Download CSV
        </button>
      </div>

      {/* CHART */}
      <div style={{ marginBottom: 32, padding: '20px 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
          {adjustCOL
            ? 'Average pay, adjusted to national-average purchasing power'
            : 'Average pay per employee, nominal dollars (2024)'}
        </h2>
        <p style={{ fontSize: 12, color: '#777', margin: '0 0 16px 0' }}>
          {adjustCOL
            ? 'Each dollar of nominal pay deflated by the BEA Regional Price Parity for the relevant metro area, so the resulting value represents what that pay would buy at national-average prices.'
            : 'Includes all employees (operating crafts, mechanical, maintenance-of-way, management). Excludes systems where train crews are private contractors.'}
        </p>
        {chartData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
            <div style={{ width: 240, textAlign: 'right', paddingRight: 12 }}>
              <div style={{ fontWeight: 500 }}>{d.system}</div>
              {adjustCOL && (
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                  {d.metroLabel} · RPP {d.rpp.toFixed(1)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 26, background: '#f5f5f5' }}>
              <div style={{
                width: `${(d.value / maxVal) * 100}%`,
                height: '100%',
                background: adjustCOL ? '#ff9800' : '#1565c0',
                position: 'relative',
                transition: 'width 300ms, background 300ms',
              }}>
                <span style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}>
                  ${(d.value / 1000).toFixed(1)}k
                </span>
              </div>
              {adjustCOL && d.value !== d.nominal && (
                <span style={{
                  position: 'absolute',
                  left: `${(d.value / maxVal) * 100}%`,
                  top: '50%',
                  transform: 'translate(8px, -50%)',
                  fontSize: 10,
                  color: d.value > d.nominal ? '#2e7d32' : '#c62828',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {d.value > d.nominal ? '↑' : '↓'} from ${(d.nominal / 1000).toFixed(1)}k nominal
                </span>
              )}
            </div>
            <div style={{ width: 30, textAlign: 'center', marginLeft: 8 }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                background: TIERS[d.tier].color,
                padding: '2px 5px',
                borderRadius: 3,
              }}>{TIERS[d.tier].label}</span>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#777', margin: '16px 0 0 240px', paddingLeft: 12 }}>
          NJT figure is 2022 (most recent OPRA-disclosed); all others are 2024. MTA Maryland figure is 2023.
          {adjustCOL && ' RPP values from BEA, 2024 (Baltimore-Columbia-Towson MD: ~105, approximate).'}
        </p>
      </div>

      {/* Sourcing tier legend */}
      <div style={{
        background: '#f5f5f5',
        padding: '14px 16px',
        marginBottom: 20,
        borderRadius: 4,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase', color: '#555' }}>
          Sourcing tiers
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13 }}>
          {Object.entries(TIERS).map(([k, t]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                background: t.color,
                padding: '2px 6px',
                borderRadius: 3,
                letterSpacing: 0.5,
                minWidth: 14,
                textAlign: 'center',
              }}>{t.label}</span>
              <span style={{ color: '#333' }}>{t.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The table */}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          minWidth: 1280,
        }}>
          <thead>
            <tr style={{ background: '#111', color: '#fff' }}>
              <th style={{ ...th, position: 'sticky', left: 0, background: '#111', zIndex: 2 }}>System</th>
              <th style={th}>Operator</th>
              <th style={th}>Headcount</th>
              <th style={th}>
                Avg pay
                {adjustCOL && <div style={{ fontSize: 9, fontWeight: 400, color: '#ff9800', textTransform: 'none', marginTop: 2 }}>COL-adjusted</div>}
              </th>
              <th style={th}>
                Median pay
                {adjustCOL && <div style={{ fontSize: 9, fontWeight: 400, color: '#ff9800', textTransform: 'none', marginTop: 2 }}>COL-adjusted</div>}
              </th>
              <th style={th}>Total payroll ($M)</th>
              <th style={th}>
                Top earner
                {adjustCOL && <div style={{ fontSize: 9, fontWeight: 400, color: '#ff9800', textTransform: 'none', marginTop: 2 }}>COL-adjusted</div>}
              </th>
              <th style={th}>{'Workers >$100k'}<br/>in OT alone</th>
              <th style={th}>Engineer top<br/>hourly rate</th>
              <th style={th}>Pension structure</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #eee', verticalAlign: 'top', position: 'sticky', left: 0, background: i % 2 ? '#fafafa' : '#fff', zIndex: 1 }}>
                  {row.system}
                  <div style={{ fontSize: 11, color: '#777', fontWeight: 400, marginTop: 2 }}>{row.region}</div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: '#555', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                  {row.operator}
                </td>
                <Cell data={row.workforce} formatter={(n) => n.toLocaleString()} />
                <Cell data={row.avgPay} metro={row.metro} applyCOL={adjustCOL} />
                <Cell data={row.medianPay} metro={row.metro} applyCOL={adjustCOL} />
                <Cell data={row.totalPayroll} formatter={fmtM} />
                <Cell data={row.highEarner} metro={row.metro} applyCOL={adjustCOL} />
                <Cell data={row.over100kOT} formatter={(n) => n.toLocaleString()} />
                <Cell data={row.engineerTopHourly} formatter={fmtHr} />
                <td style={{ padding: '10px 12px', fontSize: 11, color: '#444', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                  {row.pensionStructure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RPP context box */}
      {adjustCOL && (
        <div style={{
          background: '#fff3e0',
          border: '1px solid #ff9800',
          padding: '14px 18px',
          marginBottom: 20,
          fontSize: 12,
          lineHeight: 1.55,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Regional Price Parities applied (BEA, 2024)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            <div>New York-Newark-Jersey City: <strong>112.6</strong></div>
            <div>Boston-Cambridge-Newton: <strong>108.3</strong></div>
            <div>Chicago-Naperville-Elgin: <strong>103.6</strong></div>
            <div>Philadelphia-Camden-Wilmington: <strong>102.6</strong></div>
            <div>Baltimore-Columbia-Towson: <strong>~105</strong></div>
            <div>National average: <strong>100.0</strong></div>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: 11, color: '#555' }}>
            RPP measures the relative cost of an identical basket of goods and services in each metro area, as a percentage of the national average. New York's RPP of 112.6 means consumer prices in the NY metro are 12.6% above the national average. Housing rents drive most of the variation.
          </p>
        </div>
      )}

      {/* What the data shows — dynamic based on toggle */}
      <div style={{
        background: '#fff',
        border: '1px solid #ddd',
        padding: '16px 18px',
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
          {adjustCOL ? 'What the data shows after adjusting for cost of living' : 'What the data shows in nominal dollars'}
        </div>
        {!adjustCOL ? (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong>LIRR ($121,646) and Metro-North (~$119,800) average pay is roughly 38-50% higher than other major systems with comparable disclosure.</strong> Metra averages $87,520, MBTA averages $88,775, NJ Transit averages $80,733 (2022), MTA Maryland averages $76,803.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>Overtime (OT) is concentrated where pay is highest.</strong> 259 LIRR employees and ~98 Metro-North employees earned over $100,000 in OT alone in 2024. At NJ Transit, 82 employees did in 2023.
            </li>
            <li style={{ marginBottom: 0 }}>
              <strong>NJ Transit engineer base pay ($135k average) sits below LIRR/Metro-North engineers</strong>, despite operating in the same metro area. This drove the May 2025 Brotherhood of Locomotive Engineers and Trainmen (BLET) strike.
            </li>
          </ol>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong>The NY premium shrinks but doesn't disappear after adjusting for cost of living.</strong> LIRR's COL-adjusted average of ~$108k still leads Metra (~$84k), MBTA (~$82k), and MTA Maryland (~$73k) by 28-48%. The 50% nominal gap becomes roughly a 30-45% real gap.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>NJ Transit looks much worse on a real basis.</strong> Its nominal $81k average converts to ~$72k in national-equivalent purchasing power — the lowest among publicly-disclosed systems despite NJT operating in the country's most expensive metro.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>Philadelphia and Chicago workers gain the least from adjustment</strong> because their metros are close to the national price level. The RPP adjustment changes their numbers by 2-4%.
            </li>
            <li style={{ marginBottom: 0 }}>
              <strong>The adjustment is conservative.</strong> BEA Regional Price Parities use metro-wide averages. Workers who live in the actual core city (Manhattan, downtown Boston) face higher costs than the metro average; those who commute from outer suburbs face lower ones. The within-metro variation can be larger than the across-metro variation.
            </li>
          </ol>
        )}
      </div>

      {/* Caveats */}
      <div style={{
        background: '#fff5f5',
        border: '1px solid #f5c2c7',
        padding: '16px 18px',
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>What this comparison still cannot show</div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>
            <strong>Workforce-mix differences remain.</strong> MTA Maryland averages include bus operators (lower-paid); LIRR is essentially all rail crafts. The COL adjustment does not correct for this.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Contractor-operated systems still missing.</strong> MBTA Commuter Rail (Keolis), Caltrain operations (TransitAmerica), Amtrak, and parts of MARC employ workforces through private contractors not covered by state transparency laws.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>RPP is a regional average, not a worker-specific cost of living.</strong> An LIRR engineer commuting from Suffolk County faces materially different costs than one living in Brooklyn, even though both fall within the same MSA. The adjustment is appropriate for cross-system comparison but should not be read as the actual cost of living any individual worker experiences.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Pension value comparisons require actuarial modeling.</strong> Employer contribution rates as a percentage of pay are not the same as the present value of retirement benefits earned by the worker. DB = defined benefit; RRB = Railroad Retirement Board; PERS = Public Employees' Retirement System.
          </li>
          <li style={{ marginBottom: 0 }}>
            <strong>NJ Transit figures mix two fiscal years.</strong> The headcount (13,604) and average pay ($80,733) are from FY2022 Open Public Records Act (OPRA) disclosures; the implied $945M total payroll is back-derived from FY2023 overtime as a share of total pay. The two cannot be multiplied to reconcile — they describe slightly different workforces a year apart.
          </li>
        </ul>
      </div>

      {/* Sources */}
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6, marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
        <div style={{ fontWeight: 700, color: '#333', marginBottom: 6, fontSize: 12 }}>Primary sources</div>
        Empire Center, SeeThroughNY MTA Payroll Database (2024) · Massachusetts state payroll database (2024) · Illinois public records via GovSalaries/OpenGovPay (2024 Metra) · Maryland state payroll (2023 MTA Maryland) · NJ.com / NJ Advance Media OPRA analyses of NJ Transit payroll · NJ Transit official statements during May 2025 BLET strike · Brotherhood of Locomotive Engineers and Trainmen public statements · U.S. Bureau of Economic Analysis, Regional Price Parities by Metropolitan Area, 2024, retrieved via FRED.
      </div>
    </div>
  );
};

const th = {
  padding: '12px 10px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  borderBottom: '2px solid #333',
  verticalAlign: 'bottom',
};

export default Table;
