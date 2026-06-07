import { Search, Bell, Flame, TrendingUp, Star, ChevronRight, Home, Grid3X3, PlusSquare, Package, User2, ShieldCheck, Zap } from "lucide-react";

const CATEGORIES = [
  { emoji: "📱", label: "Tech" },
  { emoji: "👠", label: "Fashion" },
  { emoji: "🏡", label: "Home" },
  { emoji: "🎮", label: "Gaming" },
  { emoji: "🎨", label: "Art" },
  { emoji: "🚗", label: "Autos" },
  { emoji: "📚", label: "Books" },
  { emoji: "💍", label: "Jewelry" },
];

const TRENDING = [
  { title: "iPhone 14 Pro", price: "120", image: "https://images.unsplash.com/photo-1695048133142-1a20484429be?w=300&q=80", tag: "🔥 Hot" },
  { title: "AirPods Pro 2", price: "55", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=300&q=80", tag: "⚡ New" },
  { title: "PS5 Controller", price: "30", image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&q=80", tag: "✅ Verified" },
];

const RECENT = [
  { title: "MacBook Air M2", price: "890", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&q=80", rating: 5.0, reviews: 24 },
  { title: "Nike Jordan 1", price: "85", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", rating: 4.7, reviews: 18 },
  { title: "Leather Tote Bag", price: "35", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", rating: 4.8, reviews: 31 },
  { title: "Sony Headphones", price: "65", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80", rating: 4.9, reviews: 52 },
];

function PiIcon() {
  return (
    <div className="w-9 h-9 rounded-full bg-[#F0C040] flex items-center justify-center shadow-lg shadow-[#F0C040]/40">
      <span className="font-black text-black text-lg">π</span>
    </div>
  );
}

export function PiPremium() {
  return (
    <div className="w-[390px] h-[844px] flex flex-col overflow-hidden bg-[#08080F] text-white" style={{ fontFamily: "'Sora', sans-serif" }}>

      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-0.5 bg-transparent">
        <span className="text-xs font-semibold">9:41</span>
        <div className="flex gap-1.5 items-center">
          <div className="w-4 h-2.5 rounded-sm border border-white/40 relative">
            <div className="absolute inset-0.5 right-1 bg-white/60 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Hero Header — gradient */}
      <div className="relative px-4 pt-2 pb-5 bg-gradient-to-b from-[#1a0638] via-[#12042a] to-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0C040]/5 via-transparent to-[#4B0082]/20 pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <PiIcon />
            <div>
              <p className="text-[10px] text-[#F0C040]/70 uppercase tracking-widest font-medium">Welcome back</p>
              <p className="font-bold text-white text-base leading-tight">PiBazaar</p>
            </div>
          </div>
          <div className="relative">
            <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Bell className="w-4.5 h-4.5 text-gray-300" style={{ width: 18, height: 18 }} />
            </button>
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#F0C040] rounded-full text-[8px] font-bold text-black flex items-center justify-center">5</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F0C040]/60" />
          <input
            readOnly
            placeholder="Search Pi listings…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-400 placeholder-gray-600 outline-none backdrop-blur-sm focus:border-[#F0C040]/30 transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#F0C040] rounded-xl text-black text-xs font-bold">Go</button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-none">

        {/* Pi Ecosystem badges */}
        <div className="flex gap-3 px-4 mb-4">
          {[
            { icon: ShieldCheck, label: "Pi Verified", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
            { icon: Zap, label: "Instant Trade", color: "text-[#F0C040]", bg: "bg-[#F0C040]/10 border-[#F0C040]/20" },
            { icon: TrendingUp, label: "10K+ Listings", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl border ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`text-[9px] font-semibold ${color} text-center leading-tight`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-white">Categories</p>
            <button className="text-xs text-[#F0C040] flex items-center gap-0.5">All <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.label} className="flex flex-col items-center gap-1.5 py-2 rounded-2xl bg-[#141424] border border-white/5 active:scale-95 transition-transform">
                <span className="text-xl">{c.emoji}</span>
                <span className="text-[10px] text-gray-400 font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trending — horizontal scroll */}
        <div className="mb-4">
          <div className="px-4 flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <p className="font-bold text-sm text-white">Trending Now</p>
            </div>
            <button className="text-xs text-[#F0C040] flex items-center gap-0.5">More <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
            {TRENDING.map((item) => (
              <div key={item.title} className="flex-shrink-0 w-36 bg-[#141424] rounded-2xl overflow-hidden border border-white/5">
                <div className="relative">
                  <img src={item.image} alt={item.title} className="w-full h-28 object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-semibold text-white">{item.tag}</span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-white font-semibold leading-tight mb-1">{item.title}</p>
                  <p className="text-sm font-black text-[#F0C040]">π {item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest — 2-col grid */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-white">Latest</p>
            <button className="text-xs text-[#F0C040] flex items-center gap-0.5">See all <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {RECENT.map((item) => (
              <div key={item.title} className="bg-[#141424] rounded-2xl overflow-hidden border border-white/5 active:scale-95 transition-transform">
                <img src={item.image} alt={item.title} className="w-full h-32 object-cover" />
                <div className="p-2.5">
                  <p className="text-xs text-white font-semibold leading-tight mb-1.5 line-clamp-2">{item.title}</p>
                  <p className="text-sm font-black text-[#F0C040] mb-1">π {item.price}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#F0C040] text-[#F0C040]" />
                    <span className="text-[10px] text-gray-400">{item.rating} ({item.reviews})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-[#0D0D1A] border-t border-white/5 px-3 pt-2 pb-5">
        <div className="flex justify-around">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Grid3X3, label: "Browse", active: false },
            { icon: PlusSquare, label: "Sell", active: false, special: true },
            { icon: Package, label: "Orders", active: false },
            { icon: User2, label: "Profile", active: false },
          ].map(({ icon: Icon, label, active, special }) => (
            <button key={label} className="flex flex-col items-center gap-1 flex-1">
              <div className={`${special ? 'p-2 rounded-xl bg-gradient-to-br from-[#F0C040] to-[#D4A017]' : ''}`}>
                <Icon className={`w-5 h-5 ${special ? 'text-black' : active ? 'text-[#F0C040]' : 'text-gray-600'}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#F0C040] font-bold' : special ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
