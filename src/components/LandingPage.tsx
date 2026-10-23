import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Coins,
  MapPin,
  Phone,
  Play,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  User,
  Users,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { BusinessSettingsRecord, formatCurrency } from '../types';

interface PublicStockItem {
  inventoryCode: string;
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  color: string;
  condition: string;
  sellingPrice: number;
  warrantyDetails: string;
  status: string;
}

interface LandingPageProps {
  settings?: BusinessSettingsRecord;
  stats: {
    inStockCount: number;
    totalCatalogTracked: number;
    customerCount: number;
    supplierCount: number;
  };
  featuredStock: PublicStockItem[];
  onOpenLogin: (portalType: 'admin' | 'staff') => void;
}

const HERO_SLIDES = [
  {
    kicker: 'YOUR TRUSTED MOBILE PARTNER',
    headline: 'T Mobiles',
    subhead: 'Buy  •  Sell  •  Manage',
    desc: 'Your one-stop solution for mobile purchase, sales, inventory tracking, billing and complete business management. Smart technology for a smarter mobile business.',
    badgeText: 'Latest Mobiles Best Prices',
  },
  {
    kicker: '100% IMEI-VERIFIED INVENTORY',
    headline: 'T Mobiles',
    subhead: 'Track  •  Bill  •  Grow',
    desc: 'Every handset is individually recorded by its 15-digit IMEI, linked to verified suppliers, and backed by instant QR labels and GST-ready sales billing.',
    badgeText: 'Certified Stock Live Pricing',
  },
];

const BRAND_LIST = [
  { name: 'Apple', accent: 'text-slate-900 font-bold' },
  { name: 'Samsung', accent: 'text-[#1428A0] font-extrabold tracking-wider uppercase' },
  { name: 'Xiaomi', accent: 'text-[#FF6900] font-extrabold' },
  { name: 'Oppo', accent: 'text-[#008A45] font-bold lowercase tracking-wide' },
  { name: 'Vivo', accent: 'text-[#415FFF] font-extrabold lowercase tracking-wide' },
  { name: 'Realme', accent: 'text-slate-900 bg-amber-400 px-2 py-0.5 rounded font-bold text-xs' },
  { name: 'OnePlus', accent: 'text-[#F50514] font-bold uppercase tracking-tight' },
  { name: 'Redmi', accent: 'text-slate-900 font-extrabold' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  settings,
  stats,
  featuredStock,
  onOpenLogin,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [activeNavSection, setActiveNavSection] = useState<string>('home');

  const storeName = settings?.storeName || 'T Mobiles';
  const currency = settings?.currencySymbol || '₹';

  const filteredStock =
    selectedBrand === 'All'
      ? featuredStock
      : featuredStock.filter(
          (item) => item.brand.toLowerCase() === selectedBrand.toLowerCase()
        );

  const currentSlide = HERO_SLIDES[slideIdx];

  const scrollToSection = (id: string) => {
    setActiveNavSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Dark Navy Navigation Bar matching Reference 1 */}
      <header className="sticky top-0 z-40 bg-[#0A1628] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('home');
            }}
            className="focus:outline-none shrink-0"
          >
            <div className="sm:hidden">
              <BrandLogo theme="dark" size="sm" storeName={storeName} showSubtitle={false} />
            </div>
            <div className="hidden sm:block">
              <BrandLogo theme="dark" size="md" storeName={storeName} />
            </div>
          </a>

          {/* Center Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-2 text-sm font-medium"
          >
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About' },
              { id: 'features', label: 'Features' },
              { id: 'stock', label: 'Our Stock' },
              { id: 'contact', label: 'Contact' },
            ].map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => scrollToSection(nav.id)}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeNavSection === nav.id
                    ? 'bg-[#0066FF] text-white font-semibold shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Right Login Buttons matching Reference 1 */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenLogin('admin')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('admin')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-[#0066FF] hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('staff')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              <span>Staff Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section matching Reference 1 */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-b from-[#DCE9FA] via-[#EAF2FC] to-[#F8FAFC] border-b border-slate-200"
      >
        {/* Subtle skyline ambient glow */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-10 py-10 lg:py-14 relative">
          {/* Left / Right Carousel Arrows */}
          <button
            type="button"
            aria-label="Previous Hero Slide"
            onClick={() =>
              setSlideIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
            }
            className="hidden xl:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#13233E] text-white items-center justify-center hover:bg-[#0066FF] transition-colors shadow-md z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next Hero Slide"
            onClick={() => setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="hidden xl:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#13233E] text-white items-center justify-center hover:bg-[#0066FF] transition-colors shadow-md z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-3 text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800">
                <span className="w-7 h-0.5 bg-[#0066FF]" />
                <span>
                  YOUR <span className="text-[#0066FF]">TRUSTED MOBILE PARTNER</span>
                </span>
                <span className="w-7 h-0.5 bg-[#0066FF]" />
              </div>

              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none text-[#0A1628]">
                <span className="text-[#0066FF]">T</span> Mobiles
              </h1>

              <p className="text-2xl sm:text-3xl font-extrabold text-[#0A1628] tracking-tight">
                Buy <span className="text-[#0066FF] mx-1">•</span> Sell{' '}
                <span className="text-[#0066FF] mx-1">•</span> Manage
              </p>

              <p className="text-slate-700 text-base sm:text-lg leading-relaxed max-w-xl font-medium">
                {currentSlide.desc}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection('stock')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Our Stock</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogin('admin')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/80 hover:bg-white text-[#0066FF] border border-[#0066FF]/40 font-semibold text-sm sm:text-base shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Launch Workspace</span>
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Right Flagship 5-Phone Podium Showcase matching Reference 1 */}
            <div className="lg:col-span-6 relative flex flex-col items-center justify-center pt-4">
              <div className="relative w-full max-w-[600px] h-[300px] sm:h-[340px] flex items-end justify-center pb-10">
                {/* Phone 1 (Far Left - Graphite Pro) */}
                <div className="w-24 sm:w-28 h-52 sm:h-60 rounded-2xl bg-gradient-to-b from-slate-600 to-slate-800 border-2 border-slate-400 shadow-xl -mr-4 transform -rotate-6 translate-y-2 flex flex-col justify-between p-2.5 z-10">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/90 p-1 grid grid-cols-2 gap-1">
                    <span className="rounded-full bg-slate-700 border border-slate-500" />
                    <span className="rounded-full bg-slate-700 border border-slate-500" />
                    <span className="rounded-full bg-slate-700 border border-slate-500" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 text-center tracking-wider">
                    PRO MAX
                  </div>
                </div>

                {/* Phone 2 (Mid Left - Titanium Violet Ultra) */}
                <div className="w-28 sm:w-32 h-60 sm:h-68 rounded-xl bg-gradient-to-b from-[#4B4453] to-[#2C2733] border-2 border-slate-400 shadow-2xl -mr-4 transform -rotate-2 flex flex-col justify-between p-3 z-20">
                  <div className="flex flex-col gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500" />
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500" />
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 text-center tracking-widest">
                    S24 ULTRA
                  </div>
                </div>

                {/* Phone 3 (Center Front - Vivid OLED Display) */}
                <div className="w-28 sm:w-34 h-60 sm:h-66 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-orange-400 border-[3px] border-slate-900 shadow-2xl z-30 flex flex-col justify-between p-3 relative overflow-hidden">
                  <div className="w-8 h-1.5 bg-slate-950 rounded-full mx-auto" />
                  <div className="my-auto text-center text-white drop-shadow">
                    <div className="text-xs font-extrabold tracking-wide">5G FLAGSHIP</div>
                    <div className="text-[10px] opacity-90 mt-0.5">IMEI Verified</div>
                  </div>
                  <div className="w-10 h-1 bg-white/80 rounded-full mx-auto" />
                </div>

                {/* Phone 4 (Mid Right - Emerald/Teal Flagship) */}
                <div className="w-28 sm:w-32 h-58 sm:h-64 rounded-2xl bg-gradient-to-b from-[#5A7D8C] to-[#2C4755] border-2 border-slate-300 shadow-2xl -ml-4 transform rotate-3 translate-y-1 flex flex-col items-center justify-between p-3 z-20">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-400 grid grid-cols-2 gap-1 p-1.5 mt-1">
                    <span className="rounded-full bg-slate-700" />
                    <span className="rounded-full bg-slate-700" />
                    <span className="rounded-full bg-slate-700" />
                    <span className="rounded-full bg-slate-700" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-200 tracking-wider">
                    ONEPLUS 13
                  </div>
                </div>

                {/* Phone 5 (Far Right - Deep Blue Edge) */}
                <div className="w-24 sm:w-28 h-50 sm:h-56 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-600 border-2 border-slate-700 shadow-xl -ml-4 transform rotate-6 translate-y-3 flex flex-col justify-between p-2.5 z-10">
                  <div className="w-2 h-2 rounded-full bg-slate-950 mx-auto" />
                  <div className="text-[10px] font-semibold text-blue-200 text-center">
                    ZEISS 5G
                  </div>
                </div>

                {/* Glowing Blue Stage Podium */}
                <div className="absolute bottom-0 inset-x-6 h-12 rounded-[100%] bg-gradient-to-r from-[#0A1628] via-[#0066FF] to-[#0A1628] border-t-2 border-sky-300 shadow-[0_10px_35px_rgba(0,102,255,0.55)] flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    {HERO_SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Slide ${idx + 1}`}
                        onClick={() => setSlideIdx(idx)}
                        className={`h-2 rounded-full transition-all ${
                          slideIdx === idx ? 'w-6 bg-white' : 'w-2 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Script Accent Badge on the Right */}
              <div className="hidden sm:block absolute right-0 top-12 transform -rotate-6 text-right pointer-events-none">
                <p className="text-xl font-extrabold italic text-[#0A1628] leading-tight">
                  Latest
                  <br />
                  Mobiles
                  <br />
                  <span className="text-[#0066FF]">Best Prices</span>
                </p>
                <div className="w-20 h-1 bg-[#0A1628] rounded-full ml-auto mt-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Pillars matching Reference 1 */}
      <section id="features" className="py-12 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {[
              {
                icon: ShoppingCart,
                color: 'bg-[#0066FF]',
                title: 'Purchase & Stock',
                desc: 'Manage supplier purchases and stock with IMEI tracking.',
                action: () => onOpenLogin('admin'),
              },
              {
                icon: Coins,
                color: 'bg-emerald-500',
                title: 'Sales & Billing',
                desc: 'Create bills, track sales and manage customers.',
                action: () => onOpenLogin('staff'),
              },
              {
                icon: QrCode,
                color: 'bg-violet-600',
                title: 'IMEI Tracking',
                desc: 'Track every mobile with unique IMEI number.',
                action: () => onOpenLogin('staff'),
              },
              {
                icon: BarChart3,
                color: 'bg-amber-500',
                title: 'Reports & Analytics',
                desc: 'Get detailed reports for better business decisions.',
                action: () => onOpenLogin('admin'),
              },
              {
                icon: ShieldCheck,
                color: 'bg-[#0066FF]',
                title: 'Secure & Reliable',
                desc: 'Role-based access and complete data security.',
                action: () => onOpenLogin('admin'),
              },
            ].map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`flex flex-col items-start ${
                    i > 0 ? 'sm:pl-6 pt-6 sm:pt-0' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={feat.action}
                    className={`w-12 h-12 rounded-full ${feat.color} text-white flex items-center justify-center shadow-md mb-4 hover:scale-105 transition-transform`}
                    aria-label={feat.title}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                  <h2 className="text-base font-bold text-slate-900 mb-1.5">
                    {feat.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Mobile Brands Strip + Live Available Stock Section */}
      <section id="stock" className="py-8 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-0.5 bg-[#0066FF]" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Top Mobile Brands
                </h2>
              </div>
              {selectedBrand !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedBrand('All')}
                  className="text-xs font-semibold text-[#0066FF] hover:underline"
                >
                  Show All Brands ({featuredStock.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {BRAND_LIST.map((b) => {
                const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
                return (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() =>
                      setSelectedBrand(isSelected ? 'All' : b.name)
                    }
                    className={`h-14 rounded-xl border transition-all flex items-center justify-center px-3 shadow-2xs ${
                      isSelected
                        ? 'border-[#0066FF] bg-blue-50/70 ring-2 ring-[#0066FF]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-sm ${b.accent}`}>{b.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedBrand('All')}
                className={`h-14 rounded-xl border transition-all flex items-center justify-center px-3 text-xs font-bold ${
                  selectedBrand === 'All'
                    ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                    : 'border-slate-200 bg-white text-[#0066FF] hover:bg-slate-50'
                }`}
              >
                + All ({featuredStock.length})
              </button>
            </div>
          </div>

          {/* Live Verified In-Stock Handsets from Database */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Live Verified Store Stock ({filteredStock.length} Available)
                </h3>
                <p className="text-xs text-slate-600">
                  Real-time inventory synced with T Mobiles PostgreSQL database. Sign in to view IMEIs, create bills, or scan QR labels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenLogin('staff')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A1628] hover:bg-slate-800 text-white text-xs font-semibold transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
              >
                <span>Open POS & Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredStock.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No handsets currently in stock for brand "{selectedBrand}".{' '}
                <button
                  type="button"
                  onClick={() => setSelectedBrand('All')}
                  className="text-[#0066FF] font-semibold underline ml-1"
                >
                  View all available stock
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStock.slice(0, 6).map((item) => (
                  <div
                    key={item.inventoryCode}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="font-mono font-semibold text-blue-700">
                          {item.inventoryCode}
                        </span>
                        <span>
                          {item.condition} · {item.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {item.brand} {item.model}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {item.ram} / {item.storage} · {item.color}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {item.warrantyDetails}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Store Price</span>
                        <span className="text-base font-extrabold font-mono tabular-nums text-slate-900">
                          {formatCurrency(item.sellingPrice, currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenLogin('staff')}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0066FF] text-xs font-semibold transition-colors"
                      >
                        Create Bill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dark Navy Banner matching Reference 1 ("T Mobiles — More Than Just a Store") */}
      <section id="about" className="py-6 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-[#071120] via-[#0D213F] to-[#0A1931] text-white p-6 sm:p-8 shadow-lg border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 space-y-1.5">
                <div className="text-2xl font-extrabold tracking-tight">
                  <span className="text-[#0066FF]">T</span> Mobiles
                </div>
                <div className="text-base font-bold text-slate-100">
                  More Than Just a Store
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  We help you manage your mobile business with simplicity, security and smart automation.
                </p>
              </div>

              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    icon: Smartphone,
                    value: `${stats.inStockCount} In Stock`,
                    sub: `${stats.totalCatalogTracked} Total IMEIs Tracked`,
                  },
                  {
                    icon: Users,
                    value: `${stats.customerCount}+`,
                    sub: 'Registered Customers',
                  },
                  {
                    icon: Store,
                    value: `${stats.supplierCount}+`,
                    sub: 'Trusted Suppliers',
                  },
                  {
                    icon: ShieldCheck,
                    value: '100%',
                    sub: 'IMEI Audit Integrity',
                  },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.sub}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3.5"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#0066FF]/25 text-sky-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-white">
                          {metric.value}
                        </div>
                        <div className="text-[11px] text-slate-300">{metric.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Store Information Strip */}
      <section id="contact" className="py-8 bg-slate-50 border-t border-slate-200 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0066FF] shrink-0" />
            <span>
              <strong>{storeName}:</strong> {settings?.address || 'Shop No. 14 & 15, Metro Tech Plaza, MG Road'},{' '}
              {settings?.cityStatePin || 'Bengaluru, Karnataka - 560001'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Phone className="w-4 h-4 text-[#0066FF]" />
              {settings?.phone || '+91 98450 11223'}
            </span>
            <span>·</span>
            <span>{settings?.email || 'billing@tmobiles.in'}</span>
          </div>
        </div>
      </section>

      {/* Dark Navy Footer matching Reference 1 */}
      <footer className="bg-[#081221] text-slate-300 py-5 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo theme="dark" size="sm" storeName={storeName} />
          <div className="flex items-center gap-6 text-xs font-medium">
            <button type="button" onClick={() => scrollToSection('home')} className="hover:text-white">
              Home
            </button>
            <button type="button" onClick={() => scrollToSection('about')} className="hover:text-white">
              About
            </button>
            <button type="button" onClick={() => scrollToSection('features')} className="hover:text-white">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-white">
              Contact
            </button>
          </div>
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} <strong className="text-white">{storeName}</strong>. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
