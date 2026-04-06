"use client";

import Link from "next/link";
import { DottedSurface } from "@/components/ui/dotted-surface";

export default function Home() {
  const sendPrompt = (message: string) => {
    console.log(message);
  };

  return (
    <div style={{ position: "relative" }}>
      <DottedSurface />
      <style>{`
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#1e2118;
  --olive:#5a7a3a;
  --sage:#7ea860;
  --cream:#e8ddb5;
  --ink-light:#2e3320;
  --olive-mid:#4a6630;
  --sage-light:#9cc47a;
  --cream-dark:#d4c490;
}
body{font-family:var(--font-sans,sans-serif);background:#fff;color:var(--ink)}

nav{background:var(--ink);padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-size:20px;font-weight:500;color:var(--cream);letter-spacing:-.3px}
.nav-logo span{color:var(--sage)}
.nav-links{display:flex;gap:28px;list-style:none}
.nav-links a{color:rgba(232,221,181,.65);font-size:13px;text-decoration:none;transition:color .15s}
.nav-links a:hover{color:var(--cream)}
.nav-cta{background:var(--sage);color:var(--ink);font-size:13px;font-weight:500;padding:7px 18px;border-radius:6px;border:none;cursor:pointer;transition:background .15s}
.nav-cta:hover{background:var(--sage-light)}

.hero{background:var(--ink);padding:80px 40px 90px;text-align:center}
.hero-badge{display:inline-block;background:rgba(90,122,58,.25);border:0.5px solid rgba(90,122,58,.5);color:var(--sage-light);font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:24px}
.hero h1{font-size:44px;font-weight:500;color:var(--cream);line-height:1.15;letter-spacing:-.8px;max-width:640px;margin:0 auto 20px}
.hero h1 em{font-style:normal;color:var(--sage)}
.hero-sub{font-size:17px;color:rgba(232,221,181,.6);max-width:480px;margin:0 auto 36px;line-height:1.7}
.hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn-primary{background:var(--sage);color:var(--ink);font-size:14px;font-weight:500;padding:11px 28px;border-radius:8px;border:none;cursor:pointer;transition:background .15s}
.btn-primary:hover{background:var(--sage-light)}
.btn-ghost{background:transparent;color:var(--cream);font-size:14px;font-weight:400;padding:11px 28px;border-radius:8px;border:0.5px solid rgba(232,221,181,.3);cursor:pointer;transition:border-color .15s}
.btn-ghost:hover{border-color:rgba(232,221,181,.6)}
.hero-stats{display:flex;gap:40px;justify-content:center;margin-top:56px;padding-top:40px;border-top:0.5px solid rgba(232,221,181,.1)}
.stat-item{text-align:center}
.stat-num{font-size:28px;font-weight:500;color:var(--cream)}
.stat-label{font-size:12px;color:rgba(232,221,181,.45);margin-top:3px;letter-spacing:.03em}

.section{padding:72px 40px}
.section-label{font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--olive);margin-bottom:10px}
.section-title{font-size:30px;font-weight:500;color:var(--ink);line-height:1.25;letter-spacing:-.4px;max-width:480px;margin-bottom:14px}
.section-sub{font-size:15px;color:#6b7061;line-height:1.7;max-width:440px}
.section-center{text-align:center}
.section-center .section-title,.section-center .section-sub{margin-left:auto;margin-right:auto}

.how-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;max-width:960px;margin:0 auto}
.how-steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:16px;padding:20px 0;border-bottom:0.5px solid #e8ead0}
.step:last-child{border-bottom:none}
.step-num{width:32px;height:32px;border-radius:50%;background:var(--ink);color:var(--cream);font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.step-title{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:4px}
.step-desc{font-size:13px;color:#6b7061;line-height:1.6}
.how-visual{background:var(--ink);border-radius:12px;padding:28px;min-height:340px;display:flex;flex-direction:column;gap:12px}
.terminal-bar{display:flex;gap:5px;margin-bottom:8px}
.tb{width:10px;height:10px;border-radius:50%}
.tb1{background:#e8ddb5;opacity:.3}
.tb2{background:#7ea860;opacity:.5}
.tb3{background:#5a7a3a}
.term-line{font-family:var(--font-mono,monospace);font-size:12px;line-height:1.8}
.tl-gray{color:rgba(232,221,181,.3)}
.tl-sage{color:var(--sage)}
.tl-cream{color:var(--cream)}
.tl-dim{color:rgba(232,221,181,.5)}
.tl-green{color:#7ea860}
.tl-indent{margin-left:16px}

.features-bg{background:#f7f7f0}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:960px;margin:40px auto 0}
.feat-card{background:#fff;border:0.5px solid #dde0cc;border-radius:12px;padding:24px}
.feat-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.fi-green{background:#eef5e4}
.fi-olive{background:#e8eedd}
.fi-dark{background:#e2e4d5}
.feat-icon svg{width:18px;height:18px}
.feat-title{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:6px}
.feat-desc{font-size:13px;color:#6b7061;line-height:1.65}
.feat-badge{display:inline-block;margin-top:10px;font-size:10px;font-weight:500;padding:2px 8px;border-radius:4px;letter-spacing:.04em}
.fb-red{background:#f5e8e2;color:#8a3a1a}
.fb-green{background:#e2f0d6;color:#2e5a10}

.tally-section{background:var(--ink);padding:72px 40px}
.tally-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.tally-label{font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--sage);margin-bottom:12px}
.tally-title{font-size:28px;font-weight:500;color:var(--cream);line-height:1.25;margin-bottom:14px;letter-spacing:-.3px}
.tally-sub{font-size:15px;color:rgba(232,221,181,.55);line-height:1.7;margin-bottom:28px}
.tally-list{list-style:none;display:flex;flex-direction:column;gap:10px}
.tally-list li{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:rgba(232,221,181,.75);line-height:1.55}
.tl-dot{width:6px;height:6px;border-radius:50%;background:var(--sage);flex-shrink:0;margin-top:5px}
.tally-ui{background:#1a1f14;border-radius:12px;padding:20px;border:0.5px solid rgba(90,122,58,.2)}
.tu-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:0.5px solid rgba(90,122,58,.15)}
.tu-title{font-size:13px;font-weight:500;color:var(--cream)}
.tu-badge{font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(126,168,96,.15);color:var(--sage);border:0.5px solid rgba(126,168,96,.3)}
.tu-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid rgba(255,255,255,.04);font-size:12px}
.tu-row:last-child{border-bottom:none}
.tu-label{color:rgba(232,221,181,.45)}
.tu-val{color:var(--cream);font-family:var(--font-mono,monospace)}
.tu-val.green{color:var(--sage)}
.tu-val.warn{color:#e8c87a}
.tu-footer{margin-top:14px;padding-top:12px;border-top:0.5px solid rgba(90,122,58,.15);display:flex;justify-content:space-between;align-items:center}
.tu-total-label{font-size:11px;color:rgba(232,221,181,.4)}
.tu-total-val{font-size:16px;font-weight:500;color:var(--sage)}

.testimonials-bg{background:#f7f7f0;padding:72px 40px}
.test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:960px;margin:40px auto 0}
.test-card{background:#fff;border:0.5px solid #dde0cc;border-radius:12px;padding:24px}
.test-quote{font-size:14px;color:#3d3f30;line-height:1.7;margin-bottom:20px;font-style:italic}
.test-author{display:flex;align-items:center;gap:10px}
.test-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0}
.ta-green{background:#eef5e4;color:#2e5a10}
.ta-olive{background:#e8eedd;color:#3d5020}
.ta-dark{background:#e0e3d0;color:#2a3015}
.test-name{font-size:13px;font-weight:500;color:var(--ink)}
.test-role{font-size:11px;color:#8a8d75}
.test-stars{color:var(--olive);font-size:12px;margin-bottom:12px;letter-spacing:2px}

.pricing-section{padding:72px 40px}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:880px;margin:40px auto 0}
.price-card{border:0.5px solid #dde0cc;border-radius:12px;padding:28px;background:#fff}
.price-card.featured{border:2px solid var(--olive);background:#f9faf4}
.price-tier{font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--olive);margin-bottom:8px}
.price-num{font-size:32px;font-weight:500;color:var(--ink);letter-spacing:-.5px;line-height:1}
.price-period{font-size:13px;color:#8a8d75;margin-top:3px;margin-bottom:18px}
.price-desc{font-size:13px;color:#6b7061;line-height:1.6;margin-bottom:20px;padding-bottom:20px;border-bottom:0.5px solid #eaecd8}
.price-features{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.price-features li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#4a4e36}
.pf-check{color:var(--olive);font-size:14px;flex-shrink:0;margin-top:1px}
.price-btn{width:100%;padding:10px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.pb-outline{background:transparent;border:0.5px solid #b8bba0;color:var(--ink)}
.pb-outline:hover{border-color:var(--olive);color:var(--olive)}
.pb-solid{background:var(--ink);border:none;color:var(--cream)}
.pb-solid:hover{background:var(--ink-light)}
.featured-badge{display:inline-block;background:#e8f0da;color:#2e5a10;font-size:10px;font-weight:500;padding:3px 9px;border-radius:4px;letter-spacing:.04em;margin-bottom:10px}

.cta-section{background:var(--ink);padding:80px 40px;text-align:center}
.cta-title{font-size:36px;font-weight:500;color:var(--cream);letter-spacing:-.5px;max-width:560px;margin:0 auto 14px;line-height:1.2}
.cta-title em{font-style:normal;color:var(--sage)}
.cta-sub{font-size:16px;color:rgba(232,221,181,.55);margin:0 auto 36px;max-width:420px;line-height:1.7}
.cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-trust{margin-top:28px;font-size:12px;color:rgba(232,221,181,.3);letter-spacing:.04em}

footer{background:#13160e;padding:36px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.footer-logo{font-size:16px;font-weight:500;color:rgba(232,221,181,.5)}
.footer-logo span{color:var(--sage)}
.footer-links{display:flex;gap:24px;list-style:none}
.footer-links a{color:rgba(232,221,181,.25);font-size:12px;text-decoration:none}
.footer-copy{font-size:12px;color:rgba(232,221,181,.2)}
      `}</style>

      <nav>
        <div className="nav-logo">
          Tavit<span>.in</span>
        </div>
        <ul className="nav-links">
          <li>
            <a href="#">Product</a>
          </li>
          <li>
            <a href="#">Pricing</a>
          </li>
          <li>
            <a href="#">For CAs</a>
          </li>
          <li>
            <a href="#">About</a>
          </li>
        </ul>
        <Link
          href="/auth/login"
          className="nav-cta"
          style={{ textDecoration: "none" }}
        >
          Start now
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-badge">
          Paid · Push to live · Varanasi & Prayagraj
        </div>
        <h1>
          Your enterprise, running on <em>autopilot</em>
        </h1>
        <p className="hero-sub">
          Tavit files your GST, reconciles ITC, and manages compliance —
          automatically. Built for Indian MSMEs that run on Tally.
        </p>
        <div className="hero-actions">
          <Link
            href="/auth/login"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Get started
          </Link>
          <button
            className="btn-ghost"
            onClick={() =>
              sendPrompt("Show me a demo of Tavit ITC reconciliation")
            }
          >
            See it in action
          </button>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-num">10 min</div>
            <div className="stat-label">to import Tally data</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">100%</div>
            <div className="stat-label">GST compliant output</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">3x</div>
            <div className="stat-label">faster than manual filing</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">₹0</div>
            <div className="stat-label">penalty risk with Tavit</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#fff" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="section-label">how it works</div>
          <div className="how-grid">
            <div>
              <h2 className="section-title">
                From Tally export to filed return in minutes
              </h2>
              <p className="section-sub" style={{ marginBottom: "32px" }}>
                No manual data entry. No spreadsheets. Tavit reads your Tally
                XML, computes the right figures, and hands you a ready-to-file
                return.
              </p>
              <div className="how-steps">
                <div className="step">
                  <div className="step-num">1</div>
                  <div>
                    <div className="step-title">Export from Tally</div>
                    <div className="step-desc">
                      One-click XML export from TallyPrime. Drag it into Tavit —
                      vouchers, ledgers, and masters all imported in seconds.
                    </div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div>
                    <div className="step-title">Tavit computes everything</div>
                    <div className="step-desc">
                      Our compliance engine separates B2B, B2C, exports,
                      nil-rated, and exempt supplies. It cross-checks GSTR-2B
                      and flags ITC mismatches.
                    </div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div>
                    <div className="step-title">Review, approve, file</div>
                    <div className="step-desc">
                      GSTR-1, GSTR-2B reconciliation, and GSTR-3B are pre-filled
                      and ready. Your CA reviews in minutes, not hours.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="how-visual">
              <div className="terminal-bar">
                <div className="tb tb1"></div>
                <div className="tb tb2"></div>
                <div className="tb tb3"></div>
              </div>
              <div className="term-line tl-dim">{`// Tavit compliance engine`}</div>
              <div className="term-line tl-gray">
                importing tally_export_oct25.xml...
              </div>
              <div className="term-line tl-sage">✓ 847 vouchers parsed</div>
              <div className="term-line tl-sage">✓ 23 GSTINs validated</div>
              <div className="term-line tl-gray" style={{ marginTop: "8px" }}>
                running gstr-1 builder...
              </div>
              <div className="term-line tl-indent tl-cream">
                B2B supplies → ₹42,80,000
              </div>
              <div className="term-line tl-indent tl-cream">
                B2C supplies → ₹8,15,000
              </div>
              <div className="term-line tl-indent tl-cream">
                Nil rated → ₹1,20,000
              </div>
              <div className="term-line tl-sage" style={{ marginTop: "4px" }}>
                ✓ GSTR-1 ready (Table 4A-12)
              </div>
              <div className="term-line tl-gray" style={{ marginTop: "8px" }}>
                reconciling with 2B...
              </div>
              <div className="term-line tl-indent" style={{ color: "#e8c87a" }}>
                ⚠ 3 invoices unmatched
              </div>
              <div className="term-line tl-indent tl-sage">
                ✓ ₹5,84,200 ITC eligible
              </div>
              <div className="term-line tl-gray" style={{ marginTop: "8px" }}>
                drafting gstr-3b...
              </div>
              <div className="term-line tl-sage">
                ✓ GSTR-3B ready for CA review
              </div>
              <div
                className="term-line"
                style={{ color: "rgba(232,221,181,.2)", marginTop: "8px" }}
              >
                time elapsed: 38 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section features-bg">
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="section-center">
            <div className="section-label">features</div>
            <h2 className="section-title">
              Everything your finance team needs, automated
            </h2>
          </div>
          <div className="features-grid">
            <div className="feat-card">
              <div className="feat-icon fi-green">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#3b6d11"
                  strokeWidth="1.5"
                >
                  <path d="M3 9l4 4 8-8" />
                </svg>
              </div>
              <div className="feat-title">ITC reconciliation</div>
              <div className="feat-desc">
                Auto-match your purchase register against GSTR-2B. See matched,
                unmatched, and pending in a single view. Export discrepancy
                report for your CA.
              </div>
              <span className="feat-badge fb-green">Core feature</span>
            </div>
            <div className="feat-card">
              <div className="feat-icon fi-olive">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#4a6630"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="2" width="14" height="14" rx="2" />
                  <path d="M5 9h8M5 6h5" />
                </svg>
              </div>
              <div className="feat-title">GSTR-1 & 3B builder</div>
              <div className="feat-desc">
                Tally data flows directly into GSTR-1 sections and GSTR-3B
                tables. Figures are computed using decimal-precise arithmetic —
                never float errors.
              </div>
              <span className="feat-badge fb-red">paid</span>
            </div>
            <div className="feat-card">
              <div className="feat-icon fi-dark">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#2a3015"
                  strokeWidth="1.5"
                >
                  <circle cx="9" cy="9" r="7" />
                  <path d="M9 5v4l3 2" />
                </svg>
              </div>
              <div className="feat-title">Compliance calendar</div>
              <div className="feat-desc">
                Never miss a due date. GSTR-1 (11th), GSTR-3B (20th), TDS
                challan (7th) — all tracked with WhatsApp reminders 3 days
                before.
              </div>
              <span className="feat-badge fb-green">Auto-reminders</span>
            </div>
            <div className="feat-card">
              <div className="feat-icon fi-green">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#3b6d11"
                  strokeWidth="1.5"
                >
                  <path d="M3 3h12v4H3zM3 9h7v6H3zM13 9h2v6h-2z" />
                </svg>
              </div>
              <div className="feat-title">Tally integration</div>
              <div className="feat-desc">
                Works with TallyPrime out of the box. Import vouchers, masters,
                and ledgers via XML. No API key, no plugin — just drag and drop.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon fi-olive">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#4a6630"
                  strokeWidth="1.5"
                >
                  <path d="M9 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L9 13l-4.5 3 1.5-5.5L1.5 7H7z" />
                </svg>
              </div>
              <div className="feat-title">CA dashboard</div>
              <div className="feat-desc">
                CAs manage all their clients from one place. Review, annotate,
                and approve returns without switching tools. Free for CA
                partners.
              </div>
              <span className="feat-badge fb-green">Free for CAs</span>
            </div>
            <div className="feat-card">
              <div className="feat-icon fi-dark">
                <svg
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#2a3015"
                  strokeWidth="1.5"
                >
                  <path d="M4 4h10v10H4z" />
                  <path d="M4 8h10M8 4v10" />
                </svg>
              </div>
              <div className="feat-title">Hindi-first UI</div>
              <div className="feat-desc">
                Interface available in Hindi for Tier 2/3 businesses.
                WhatsApp-native flows for owners who prefer voice and chat over
                dashboards.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tally-section">
        <div className="tally-inner">
          <div>
            <div className="tally-label">Tally integration</div>
            <h2 className="tally-title">
              Built on top of the software your business already uses
            </h2>
            <p className="tally-sub">
              28,000+ CAs and lakhs of businesses run on Tally. Tavit
              doesn&apos;t replace it — it plugs in on top and handles
              everything Tally doesn&apos;t do automatically.
            </p>
            <ul className="tally-list">
              <li>
                <div className="tl-dot"></div>Import any TallyPrime XML export
                in seconds
              </li>
              <li>
                <div className="tl-dot"></div>All voucher types supported:
                sales, purchase, credit note, debit note
              </li>
              <li>
                <div className="tl-dot"></div>GSTIN, HSN, and PAN validated on
                import
              </li>
              <li>
                <div className="tl-dot"></div>Multi-GSTIN companies supported
              </li>
              <li>
                <div className="tl-dot"></div>No Tally add-ons or plugins
                required
              </li>
            </ul>
          </div>
          <div className="tally-ui">
            <div className="tu-head">
              <span className="tu-title">GSTR-3B draft · October 2025</span>
              <span className="tu-badge">Ready for review</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">3.1 — Outward taxable supplies</span>
              <span className="tu-val">₹42,80,000</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">Integrated tax (IGST)</span>
              <span className="tu-val">₹3,24,000</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">Central tax (CGST)</span>
              <span className="tu-val">₹1,84,500</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">State tax (SGST)</span>
              <span className="tu-val">₹1,84,500</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">ITC available (from 2B)</span>
              <span className="tu-val green">₹5,84,200</span>
            </div>
            <div className="tu-row">
              <span className="tu-label">ITC unmatched — pending</span>
              <span className="tu-val warn">₹18,400</span>
            </div>
            <div className="tu-footer">
              <span className="tu-total-label">Net tax payable</span>
              <span className="tu-total-val">₹1,08,800</span>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials-bg">
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="section-center">
            <div className="section-label">testimonials</div>
            <h2 className="section-title">
              Trusted by manufacturers and traders across UP
            </h2>
          </div>
          <div className="test-grid">
            <div className="test-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &quot;Pehle GST filing mein poora din jaata tha. Tavit se ab 2
                ghante mein khatam ho jaata hai. ITC reconciliation
                automatically ho jaati hai — yahi sabse badi rahat hai.&quot;
              </p>
              <div className="test-author">
                <div className="test-avatar ta-green">RG</div>
                <div>
                  <div className="test-name">Rajesh Gupta</div>
                  <div className="test-role">
                    MD, Gupta Textile Mills · Varanasi
                  </div>
                </div>
              </div>
            </div>
            <div className="test-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &quot;As a CA managing 40 clients, Tavit has given me my
                evenings back. The reconciliation report is exactly what I need
                to review and approve — clean, accurate, exportable.&quot;
              </p>
              <div className="test-author">
                <div className="test-avatar ta-olive">AS</div>
                <div>
                  <div className="test-name">Ankit Srivastava, CA</div>
                  <div className="test-role">
                    Partner, AS & Associates · Prayagraj
                  </div>
                </div>
              </div>
            </div>
            <div className="test-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &quot;Our trading company has 3 GSTINs and it was a nightmare
                every month. Tavit handles all three, shows the consolidated
                view, and sends WhatsApp reminders before every due date.&quot;
              </p>
              <div className="test-author">
                <div className="test-avatar ta-dark">PK</div>
                <div>
                  <div className="test-name">Priya Kesarwani</div>
                  <div className="test-role">
                    CFO, Kesarwani Traders · Prayagraj
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="section-center">
            <div className="section-label">pricing</div>
            <h2 className="section-title">Simple pricing, no surprises</h2>
            <p className="section-sub" style={{ margin: "0 auto 0" }}>
              Start free. Scale as you grow. All plans include Tally import and
              GSTR-1/3B.
            </p>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-tier">Starter</div>
              <div className="price-num">₹2,999</div>
              <div className="price-period">per month · 1 GSTIN</div>
              <div className="price-desc">
                For small businesses filing monthly returns and needing basic
                ITC reconciliation.
              </div>
              <ul className="price-features">
                <li>
                  <span className="pf-check">✓</span>Tally XML import
                </li>
                <li>
                  <span className="pf-check">✓</span>GSTR-1 builder
                </li>
                <li>
                  <span className="pf-check">✓</span>GSTR-2B reconciliation
                </li>
                <li>
                  <span className="pf-check">✓</span>Compliance calendar
                </li>
                <li>
                  <span className="pf-check">✓</span>WhatsApp reminders
                </li>
              </ul>
              <button
                className="price-btn pb-outline"
                onClick={() =>
                  sendPrompt("I want to sign up for the Tavit Starter plan")
                }
              >
                Get started
              </button>
            </div>
            <div className="price-card featured">
              <div className="featured-badge">Most popular</div>
              <div className="price-tier">Growth</div>
              <div className="price-num">₹7,999</div>
              <div className="price-period">per month · up to 3 GSTINs</div>
              <div className="price-desc">
                For growing MSMEs needing multi-GSTIN support and CA
                collaboration tools.
              </div>
              <ul className="price-features">
                <li>
                  <span className="pf-check">✓</span>Everything in Starter
                </li>
                <li>
                  <span className="pf-check">✓</span>GSTR-3B drafter
                </li>
                <li>
                  <span className="pf-check">✓</span>CA dashboard access
                </li>
                <li>
                  <span className="pf-check">✓</span>Up to 3 GSTINs
                </li>
                <li>
                  <span className="pf-check">✓</span>CSV export for all reports
                </li>
                <li>
                  <span className="pf-check">✓</span>Priority support
                </li>
              </ul>
              <button
                className="price-btn pb-solid"
                onClick={() =>
                  sendPrompt("I want to sign up for the Tavit Growth plan")
                }
              >
                Get started
              </button>
            </div>
            <div className="price-card">
              <div className="price-tier">Professional</div>
              <div className="price-num">₹17,999</div>
              <div className="price-period">per month · unlimited GSTINs</div>
              <div className="price-desc">
                For large enterprises and CA firms managing multiple companies.
              </div>
              <ul className="price-features">
                <li>
                  <span className="pf-check">✓</span>Everything in Growth
                </li>
                <li>
                  <span className="pf-check">✓</span>Unlimited GSTINs
                </li>
                <li>
                  <span className="pf-check">✓</span>Multi-company view
                </li>
                <li>
                  <span className="pf-check">✓</span>TDS engine (coming)
                </li>
                <li>
                  <span className="pf-check">✓</span>Dedicated CA account
                  manager
                </li>
              </ul>
              <button
                className="price-btn pb-outline"
                onClick={() =>
                  sendPrompt(
                    "I want to sign up for the Tavit Professional plan",
                  )
                }
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">
          Stop managing compliance. Let <em>Tavit</em> handle it.
        </h2>
        <p className="cta-sub">
          Paid and live. Set up your company, import Tally data, and file your
          first return today.
        </p>
        <div className="cta-actions">
          <Link
            href="/auth/login"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Get started
          </Link>
          <button
            className="btn-ghost"
            onClick={() =>
              sendPrompt("I am a CA and want to partner with Tavit")
            }
          >
            Partner as a CA
          </button>
        </div>
        <div className="cta-trust">
          Live product · Cancel anytime · GSTN compliant
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          Tavit<span>.in</span>
        </div>
        <ul className="footer-links">
          <li>
            <a href="#">Privacy</a>
          </li>
          <li>
            <a href="#">Terms</a>
          </li>
          <li>
            <a href="#">Contact</a>
          </li>
          <li>
            <a href="#">For CAs</a>
          </li>
        </ul>
        <div className="footer-copy">© 2026 Tavit Technologies Pvt. Ltd.</div>
      </footer>
    </div>
  );
}
