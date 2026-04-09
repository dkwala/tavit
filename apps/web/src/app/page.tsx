"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { DottedSurface } from "@/components/ui/dotted-surface";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <DottedSurface />

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="bg-[#1e2118] px-5 md:px-10 h-[60px] flex items-center justify-between sticky top-0 z-50">
        <div className="text-[20px] font-medium text-[#e8ddb5] tracking-tight">
          Tavit<span className="text-[#7ea860]">.in</span>
        </div>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-7 list-none">
          {["Product", "Pricing", "For CAs", "About"].map((item) => (
            <li key={item}>
              <a
                href={item === "Pricing" ? "#pricing" : "#"}
                className="text-[rgba(232,221,181,0.65)] text-[13px] no-underline hover:text-[#e8ddb5] transition-colors"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden md:inline-block bg-[#7ea860] text-[#1e2118] text-[13px] font-medium px-[18px] py-[7px] rounded-[6px] no-underline hover:bg-[#9cc47a] transition-colors"
          >
            Start now
          </Link>
          {/* Hamburger */}
          <button
            className="md:hidden text-[#e8ddb5] text-2xl leading-none"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-[#1e2118] border-t border-[rgba(232,221,181,0.08)] px-5 py-4 flex flex-col gap-4 z-40">
          {["Product", "Pricing", "For CAs", "About"].map((item) => (
            <a
              key={item}
              href={item === "Pricing" ? "#pricing" : "#"}
              className="text-[rgba(232,221,181,0.7)] text-[15px] no-underline"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="bg-[#7ea860] text-[#1e2118] text-[13px] font-medium px-4 py-2 rounded-[6px] no-underline text-center mt-1"
            onClick={() => setMenuOpen(false)}
          >
            Start now
          </Link>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="bg-[#1e2118] px-5 md:px-10 pt-16 pb-20 md:pt-20 md:pb-24 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            variants={fadeUp}
            className="inline-block bg-[rgba(90,122,58,0.25)] border border-[rgba(90,122,58,0.5)] text-[#9cc47a] text-[11px] font-medium px-3 py-1 rounded-full tracking-widest uppercase mb-6"
          >
            Paid · Push to live · Varanasi &amp; Prayagraj
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-medium text-[#e8ddb5] leading-[1.15] tracking-tight mb-5"
          >
            Your enterprise, running on{" "}
            <span className="gradient-text">autopilot</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-[15px] sm:text-[17px] text-[rgba(232,221,181,0.6)] max-w-[480px] mx-auto mb-9 leading-relaxed"
          >
            Tavit files your GST, reconciles ITC, and manages compliance —
            automatically. Built for Indian MSMEs that run on Tally.
          </motion.p>

          {/* Social proof strip */}
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="flex -space-x-2">
              {["RG", "AS", "PK", "MK"].map((init, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-[#1e2118] flex items-center justify-center text-[9px] font-medium"
                  style={{
                    background: ["#3d5020", "#4a6630", "#2e3320", "#3a4a28"][i],
                    color: "#9cc47a",
                  }}
                >
                  {init}
                </div>
              ))}
            </div>
            <span className="text-[12px] text-[rgba(232,221,181,0.45)] tracking-wide">
              ★★★★★ &nbsp;Trusted by 200+ MSMEs
            </span>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex gap-3 justify-center flex-wrap"
          >
            <Link
              href="/auth/login"
              className="bg-[#7ea860] text-[#1e2118] text-[14px] font-medium px-7 py-[11px] rounded-[8px] no-underline hover:bg-[#9cc47a] transition-colors"
            >
              Get started
            </Link>
            <button className="bg-transparent text-[#e8ddb5] text-[14px] px-7 py-[11px] rounded-[8px] border border-[rgba(232,221,181,0.3)] hover:border-[rgba(232,221,181,0.6)] transition-colors cursor-pointer">
              See it in action
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-14 pt-10 border-t border-[rgba(232,221,181,0.1)]"
          >
            {[
              { num: "10 min", label: "to import Tally data" },
              { num: "100%", label: "GST compliant output" },
              { num: "3x", label: "faster than manual filing" },
              { num: "₹0", label: "penalty risk with Tavit" },
            ].map(({ num, label }) => (
              <div key={num} className="text-center">
                <div className="text-[26px] sm:text-[28px] font-medium text-[#e8ddb5]">
                  {num}
                </div>
                <div className="text-[11px] text-[rgba(232,221,181,0.45)] mt-1 tracking-wide">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="bg-white px-5 md:px-10 py-16 md:py-20">
        <div className="max-w-[960px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              className="text-[11px] font-medium tracking-[.08em] uppercase text-[#5a7a3a] mb-2"
            >
              how it works
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <motion.div variants={fadeUp}>
                <h2 className="text-[26px] sm:text-[30px] font-medium text-[#1e2118] leading-[1.25] tracking-tight max-w-[480px] mb-3">
                  From Tally export to filed return in minutes
                </h2>
                <p className="text-[15px] text-[#6b7061] leading-relaxed max-w-[440px] mb-8">
                  No manual data entry. No spreadsheets. Tavit reads your Tally
                  XML, computes the right figures, and hands you a ready-to-file
                  return.
                </p>
                <div className="flex flex-col gap-0">
                  {[
                    {
                      n: "1",
                      title: "Export from Tally",
                      desc: "One-click XML export from TallyPrime. Drag it into Tavit — vouchers, ledgers, and masters all imported in seconds.",
                    },
                    {
                      n: "2",
                      title: "Tavit computes everything",
                      desc: "Our compliance engine separates B2B, B2C, exports, nil-rated, and exempt supplies. It cross-checks GSTR-2B and flags ITC mismatches.",
                    },
                    {
                      n: "3",
                      title: "Review, approve, file",
                      desc: "GSTR-1, GSTR-2B reconciliation, and GSTR-3B are pre-filled and ready. Your CA reviews in minutes, not hours.",
                    },
                  ].map(({ n, title, desc }) => (
                    <div
                      key={n}
                      className="flex gap-4 py-5 border-b border-[#e8ead0] last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1e2118] text-[#e8ddb5] text-[13px] font-medium flex items-center justify-center shrink-0 mt-[2px]">
                        {n}
                      </div>
                      <div>
                        <div className="text-[14px] font-medium text-[#1e2118] mb-1">
                          {title}
                        </div>
                        <div className="text-[13px] text-[#6b7061] leading-relaxed">
                          {desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Terminal */}
              <motion.div
                variants={fadeUp}
                className="bg-[#1e2118] rounded-xl p-7 min-h-[320px] flex flex-col gap-3 order-first lg:order-last"
              >
                <div className="flex gap-[5px] mb-2">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#e8ddb5] opacity-30" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#7ea860] opacity-50" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#5a7a3a]" />
                </div>
                {[
                  { cls: "text-[rgba(232,221,181,0.5)]", text: "// Tavit compliance engine" },
                  { cls: "text-[rgba(232,221,181,0.3)]", text: "importing tally_export_oct25.xml..." },
                  { cls: "text-[#7ea860]", text: "✓ 847 vouchers parsed" },
                  { cls: "text-[#7ea860]", text: "✓ 23 GSTINs validated" },
                  { cls: "text-[rgba(232,221,181,0.3)] mt-2", text: "running gstr-1 builder..." },
                  { cls: "text-[#e8ddb5] ml-4", text: "B2B supplies → ₹42,80,000" },
                  { cls: "text-[#e8ddb5] ml-4", text: "B2C supplies → ₹8,15,000" },
                  { cls: "text-[#e8ddb5] ml-4", text: "Nil rated → ₹1,20,000" },
                  { cls: "text-[#7ea860] mt-1", text: "✓ GSTR-1 ready (Table 4A-12)" },
                  { cls: "text-[rgba(232,221,181,0.3)] mt-2", text: "reconciling with 2B..." },
                  { cls: "text-[#e8c87a] ml-4", text: "⚠ 3 invoices unmatched" },
                  { cls: "text-[#7ea860] ml-4", text: "✓ ₹5,84,200 ITC eligible" },
                  { cls: "text-[rgba(232,221,181,0.3)] mt-2", text: "drafting gstr-3b..." },
                  { cls: "text-[#7ea860]", text: "✓ GSTR-3B ready for CA review" },
                  { cls: "text-[rgba(232,221,181,0.2)] mt-2", text: "time elapsed: 38 seconds" },
                ].map(({ cls, text }, i) => (
                  <div
                    key={i}
                    className={`font-mono text-[12px] leading-[1.8] ${cls}`}
                  >
                    {text}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES (BENTO) ────────────────────────────────────────── */}
      <section className="bg-[#f7f7f0] px-5 md:px-10 py-16 md:py-20">
        <div className="max-w-[960px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="text-center mb-10"
          >
            <motion.div
              variants={fadeUp}
              className="text-[11px] font-medium tracking-[.08em] uppercase text-[#5a7a3a] mb-2"
            >
              features
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-[26px] sm:text-[30px] font-medium text-[#1e2118] leading-[1.25] tracking-tight max-w-[480px] mx-auto"
            >
              Everything your finance team needs, automated
            </motion.h2>
          </motion.div>

          {/* Bento grid: 2 wide + 4 small */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Wide card — ITC reconciliation */}
            <motion.div
              variants={fadeUp}
              className="sm:col-span-2 glass-card p-6 rounded-xl"
            >
              <div className="w-9 h-9 rounded-lg bg-[#eef5e4] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#3b6d11" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <path d="M3 9l4 4 8-8" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">ITC reconciliation</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed max-w-sm">
                Auto-match your purchase register against GSTR-2B. See matched, unmatched, and pending in a single view. Export discrepancy report for your CA.
              </div>
              <span className="inline-block mt-3 text-[10px] font-medium px-2 py-[2px] rounded bg-[#e2f0d6] text-[#2e5a10] tracking-wide">Core feature</span>
            </motion.div>

            {/* GSTR-1 & 3B */}
            <motion.div variants={fadeUp} className="glass-card p-6 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-[#e8eedd] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#4a6630" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <rect x="2" y="2" width="14" height="14" rx="2" />
                  <path d="M5 9h8M5 6h5" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">GSTR-1 &amp; 3B builder</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed">
                Tally data flows directly into GSTR-1 sections and GSTR-3B tables. Decimal-precise arithmetic — never float errors.
              </div>
              <span className="inline-block mt-3 text-[10px] font-medium px-2 py-[2px] rounded bg-[#f5e8e2] text-[#8a3a1a] tracking-wide">paid</span>
            </motion.div>

            {/* Compliance calendar */}
            <motion.div variants={fadeUp} className="glass-card p-6 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-[#e2e4d5] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#2a3015" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M9 5v4l3 2" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">Compliance calendar</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed">
                Never miss a due date. GSTR-1 (11th), GSTR-3B (20th), TDS challan (7th) — all tracked with WhatsApp reminders.
              </div>
              <span className="inline-block mt-3 text-[10px] font-medium px-2 py-[2px] rounded bg-[#e2f0d6] text-[#2e5a10] tracking-wide">Auto-reminders</span>
            </motion.div>

            {/* Tally integration */}
            <motion.div variants={fadeUp} className="glass-card p-6 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-[#eef5e4] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#3b6d11" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <path d="M3 3h12v4H3zM3 9h7v6H3zM13 9h2v6h-2z" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">Tally integration</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed">
                Works with TallyPrime out of the box. Import via XML — no API key, no plugin, just drag and drop.
              </div>
            </motion.div>

            {/* CA dashboard — wide */}
            <motion.div
              variants={fadeUp}
              className="sm:col-span-2 lg:col-span-1 glass-card p-6 rounded-xl"
            >
              <div className="w-9 h-9 rounded-lg bg-[#e8eedd] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#4a6630" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <path d="M9 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L9 13l-4.5 3 1.5-5.5L1.5 7H7z" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">CA dashboard</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed">
                CAs manage all clients from one place. Review, annotate, and approve returns without switching tools.
              </div>
              <span className="inline-block mt-3 text-[10px] font-medium px-2 py-[2px] rounded bg-[#e2f0d6] text-[#2e5a10] tracking-wide">Free for CAs</span>
            </motion.div>

            {/* Hindi-first — wide */}
            <motion.div
              variants={fadeUp}
              className="sm:col-span-2 glass-card p-6 rounded-xl"
            >
              <div className="w-9 h-9 rounded-lg bg-[#e2e4d5] flex items-center justify-center mb-4">
                <svg viewBox="0 0 18 18" fill="none" stroke="#2a3015" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <path d="M4 4h10v10H4z" /><path d="M4 8h10M8 4v10" />
                </svg>
              </div>
              <div className="text-[14px] font-medium text-[#1e2118] mb-2">Hindi-first UI</div>
              <div className="text-[13px] text-[#6b7061] leading-relaxed max-w-sm">
                Interface available in Hindi for Tier 2/3 businesses. WhatsApp-native flows for owners who prefer voice and chat over dashboards.
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TALLY INTEGRATION ───────────────────────────────────────── */}
      <section className="bg-[#1e2118] px-5 md:px-10 py-16 md:py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center"
        >
          <motion.div variants={fadeUp}>
            <div className="text-[11px] font-medium tracking-[.08em] uppercase text-[#7ea860] mb-3">
              Tally integration
            </div>
            <h2 className="text-[24px] sm:text-[28px] font-medium text-[#e8ddb5] leading-[1.25] tracking-tight mb-3">
              Built on top of the software your business already uses
            </h2>
            <p className="text-[15px] text-[rgba(232,221,181,0.55)] leading-relaxed mb-7">
              28,000+ CAs and lakhs of businesses run on Tally. Tavit doesn&apos;t
              replace it — it plugs in on top and handles everything Tally
              doesn&apos;t do automatically.
            </p>
            <ul className="flex flex-col gap-[10px] list-none">
              {[
                "Import any TallyPrime XML export in seconds",
                "All voucher types supported: sales, purchase, credit note, debit note",
                "GSTIN, HSN, and PAN validated on import",
                "Multi-GSTIN companies supported",
                "No Tally add-ons or plugins required",
              ].map((item) => (
                <li key={item} className="flex items-start gap-[10px] text-[13px] text-[rgba(232,221,181,0.75)] leading-snug">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#7ea860] shrink-0 mt-[5px]" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* GSTR-3B UI mockup */}
          <motion.div
            variants={fadeUp}
            className="bg-[#1a1f14] rounded-xl p-5 border border-[rgba(90,122,58,0.2)]"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[rgba(90,122,58,0.15)]">
              <span className="text-[13px] font-medium text-[#e8ddb5]">GSTR-3B draft · October 2025</span>
              <span className="text-[10px] px-2 py-[2px] rounded bg-[rgba(126,168,96,0.15)] text-[#7ea860] border border-[rgba(126,168,96,0.3)]">
                Ready for review
              </span>
            </div>
            {[
              { label: "3.1 — Outward taxable supplies", val: "₹42,80,000", cls: "text-[#e8ddb5]" },
              { label: "Integrated tax (IGST)", val: "₹3,24,000", cls: "text-[#e8ddb5]" },
              { label: "Central tax (CGST)", val: "₹1,84,500", cls: "text-[#e8ddb5]" },
              { label: "State tax (SGST)", val: "₹1,84,500", cls: "text-[#e8ddb5]" },
              { label: "ITC available (from 2B)", val: "₹5,84,200", cls: "text-[#7ea860]" },
              { label: "ITC unmatched — pending", val: "₹18,400", cls: "text-[#e8c87a]" },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 text-[12px]">
                <span className="text-[rgba(232,221,181,0.45)]">{label}</span>
                <span className={`font-mono ${cls}`}>{val}</span>
              </div>
            ))}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-[rgba(90,122,58,0.15)]">
              <span className="text-[11px] text-[rgba(232,221,181,0.4)]">Net tax payable</span>
              <span className="text-[16px] font-medium text-[#7ea860]">₹1,08,800</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="bg-[#f7f7f0] px-5 md:px-10 py-16 md:py-20">
        <div className="max-w-[960px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="text-center mb-10"
          >
            <motion.div
              variants={fadeUp}
              className="text-[11px] font-medium tracking-[.08em] uppercase text-[#5a7a3a] mb-2"
            >
              testimonials
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-[26px] sm:text-[30px] font-medium text-[#1e2118] leading-[1.25] tracking-tight max-w-[480px] mx-auto"
            >
              Trusted by manufacturers and traders across UP
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              {
                quote: '"Pehle GST filing mein poora din jaata tha. Tavit se ab 2 ghante mein khatam ho jaata hai. ITC reconciliation automatically ho jaati hai — yahi sabse badi rahat hai."',
                init: "RG",
                name: "Rajesh Gupta",
                role: "MD, Gupta Textile Mills · Varanasi",
                bg: "#eef5e4",
                color: "#2e5a10",
              },
              {
                quote: '"As a CA managing 40 clients, Tavit has given me my evenings back. The reconciliation report is exactly what I need to review and approve — clean, accurate, exportable."',
                init: "AS",
                name: "Ankit Srivastava, CA",
                role: "Partner, AS & Associates · Prayagraj",
                bg: "#e8eedd",
                color: "#3d5020",
              },
              {
                quote: '"Our trading company has 3 GSTINs and it was a nightmare every month. Tavit handles all three, shows the consolidated view, and sends WhatsApp reminders before every due date."',
                init: "PK",
                name: "Priya Kesarwani",
                role: "CFO, Kesarwani Traders · Prayagraj",
                bg: "#e0e3d0",
                color: "#2a3015",
              },
            ].map(({ quote, init, name, role, bg, color }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                className="glass-card p-6 rounded-xl"
              >
                <div className="text-[#5a7a3a] text-[12px] tracking-[2px] mb-3">★★★★★</div>
                <p className="text-[14px] text-[#3d3f30] leading-relaxed mb-5 italic">{quote}</p>
                <div className="flex items-center gap-[10px]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0"
                    style={{ background: bg, color }}
                  >
                    {init}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#1e2118]">{name}</div>
                    <div className="text-[11px] text-[#8a8d75]">{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-white px-5 md:px-10 py-16 md:py-20">
        <div className="max-w-[880px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="text-center mb-10"
          >
            <motion.div
              variants={fadeUp}
              className="text-[11px] font-medium tracking-[.08em] uppercase text-[#5a7a3a] mb-2"
            >
              pricing
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-[26px] sm:text-[30px] font-medium text-[#1e2118] leading-[1.25] tracking-tight mb-3"
            >
              Simple pricing, no surprises
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-[15px] text-[#6b7061] leading-relaxed"
            >
              Start free. Scale as you grow. All plans include Tally import and GSTR-1/3B.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              {
                tier: "Starter",
                price: "₹2,999",
                period: "per month · 1 GSTIN",
                desc: "For small businesses filing monthly returns and needing basic ITC reconciliation.",
                features: ["Tally XML import", "GSTR-1 builder", "GSTR-2B reconciliation", "Compliance calendar", "WhatsApp reminders"],
                featured: false,
              },
              {
                tier: "Growth",
                price: "₹7,999",
                period: "per month · up to 3 GSTINs",
                desc: "For growing MSMEs needing multi-GSTIN support and CA collaboration tools.",
                features: ["Everything in Starter", "GSTR-3B drafter", "CA dashboard access", "Up to 3 GSTINs", "CSV export for all reports", "Priority support"],
                featured: true,
              },
              {
                tier: "Professional",
                price: "₹17,999",
                period: "per month · unlimited GSTINs",
                desc: "For large enterprises and CA firms managing multiple companies.",
                features: ["Everything in Growth", "Unlimited GSTINs", "Multi-company view", "TDS engine (coming)", "Dedicated CA account manager"],
                featured: false,
              },
            ].map(({ tier, price, period, desc, features, featured }) => (
              <motion.div
                key={tier}
                variants={fadeUp}
                className={`rounded-xl p-7 flex flex-col ${
                  featured
                    ? "border-2 border-[#5a7a3a] bg-[#f9faf4] md:scale-105"
                    : "border border-[#dde0cc] bg-white"
                }`}
              >
                {featured && (
                  <span className="inline-block bg-[#e8f0da] text-[#2e5a10] text-[10px] font-medium px-[9px] py-[3px] rounded tracking-wide mb-2">
                    Most popular
                  </span>
                )}
                <div className="text-[12px] font-medium tracking-[.06em] uppercase text-[#5a7a3a] mb-2">
                  {tier}
                </div>
                <div className="text-[32px] font-medium text-[#1e2118] tracking-tight leading-none">
                  {price}
                </div>
                <div className="text-[13px] text-[#8a8d75] mt-1 mb-4">{period}</div>
                <div className="text-[13px] text-[#6b7061] leading-relaxed mb-5 pb-5 border-b border-[#eaecd8]">
                  {desc}
                </div>
                <ul className="flex flex-col gap-2 mb-6 flex-1 list-none">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#4a4e36]">
                      <span className="text-[#5a7a3a] text-[14px] shrink-0 mt-[1px]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-[10px] rounded-[7px] text-[13px] font-medium cursor-pointer transition-all ${
                    featured
                      ? "bg-[#1e2118] text-[#e8ddb5] border-none hover:bg-[#2e3320]"
                      : "bg-transparent border border-[#b8bba0] text-[#1e2118] hover:border-[#5a7a3a] hover:text-[#5a7a3a]"
                  }`}
                >
                  Get started
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#1e2118] px-5 md:px-10 py-20 md:py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-[560px] mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-[28px] sm:text-[36px] font-medium text-[#e8ddb5] tracking-tight leading-[1.2] mb-4"
          >
            Stop managing compliance. Let{" "}
            <span className="gradient-text">Tavit</span> handle it.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-[15px] sm:text-[16px] text-[rgba(232,221,181,0.55)] mb-9 leading-relaxed"
          >
            Paid and live. Set up your company, import Tally data, and file your
            first return today.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex gap-3 justify-center flex-wrap"
          >
            <Link
              href="/auth/login"
              className="bg-[#7ea860] text-[#1e2118] text-[14px] font-medium px-7 py-[11px] rounded-[8px] no-underline hover:bg-[#9cc47a] transition-colors"
            >
              Get started
            </Link>
            <button className="bg-transparent text-[#e8ddb5] text-[14px] px-7 py-[11px] rounded-[8px] border border-[rgba(232,221,181,0.3)] hover:border-[rgba(232,221,181,0.6)] transition-colors cursor-pointer">
              Partner as a CA
            </button>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="mt-7 text-[12px] text-[rgba(232,221,181,0.3)] tracking-wide"
          >
            Live product · Cancel anytime · GSTN compliant
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-[#13160e] px-5 md:px-10 py-9 flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
        <div className="text-[16px] font-medium text-[rgba(232,221,181,0.5)]">
          Tavit<span className="text-[#7ea860]">.in</span>
        </div>
        <ul className="flex gap-6 list-none flex-wrap justify-center">
          {["Privacy", "Terms", "Contact", "For CAs"].map((item) => (
            <li key={item}>
              <a href="#" className="text-[rgba(232,221,181,0.25)] text-[12px] no-underline hover:text-[rgba(232,221,181,0.5)] transition-colors">
                {item}
              </a>
            </li>
          ))}
        </ul>
        <div className="text-[12px] text-[rgba(232,221,181,0.2)]">
          © 2026 Tavit Technologies Pvt. Ltd.
        </div>
      </footer>
    </div>
  );
}
