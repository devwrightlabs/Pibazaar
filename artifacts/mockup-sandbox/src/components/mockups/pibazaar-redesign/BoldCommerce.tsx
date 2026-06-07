import { Search, ShoppingCart, Bell, Home, Grid, PlusCircle, Package, User, Star, ChevronRight, Flame, Tag, MapPin } from "lucide-react";

const CATEGORIES = [
  { icon: "📱", label: "Electronics" },
  { icon: "👗", label: "Fashion" },
  { icon: "🏠", label: "Home" },
  { icon: "🎮", label: "Gaming" },
  { icon: "📚", label: "Books" },
  { icon: "🚗", label: "Auto" },
  { icon: "🎨", label: "Art" },
  { icon: "💎", label: "Jewelry" },
];

const FEATURED = [
  { title: "iPhone 14 Pro — Like New", price: "120", image: "https://images.unsplash.com/photo-1695048133142-1a20484429be?w=400&q=80", rating: 4.8, seller: "Alex K.", badge: "Hot Deal" },
  { title: "Nike Air Max 2024", price: "45", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", rating: 4.6, seller: "Maria T.", badge: "New" },
  { title: "MacBook Air M2", price: "890", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&q=80", rating: 5.0, seller: "John D.", badge: "Verified" },
  { title: "Vintage Leather Bag", price: "28", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", rating: 4.7, seller: "Sara M.", badge: null },
  { title: "Sony WH-1000XM5", price: "65", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80", rating: 4.9, seller: "Tom R.", badge: "Hot Deal" },
  { title: "Gaming Chair", price: "95", image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=80", rating: 4.5, seller: "Lin C.", badge: null },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <span className="text-xs text-gray-400">{rating}</span>
    </div>
  );
}

export function BoldCommerce() {
  return (
    <div className="w-[390px] h-[844px] bg-[#0D0D14] text-white flex flex-col overflow-hidden font-sans">

      {/* ── Status bar ── */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1">
        <span className="text-xs font-semibold">9:41</span>
        <div className="flex gap-1.5 items-center">
          <div className="w-4 h-2.5 rounded-sm border border-white/60 relative">
            <div className="absolute inset-0.5 right-1 bg-white/80 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* ── Top Nav ── */}
      <div className="bg-[#0D0D14] px-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F0C040] flex items-center justify-center font-black text-black text-sm">π</div>
            <div>
              <p className="text-[10px] text-gray-500 leading-none">Good morning 👋</p>
              <p className="text-sm font-bold text-white leading-tight">PiBazaar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F0C040] rounded-full text-[8px] font-bold text-black flex items-center justify-center">3</span>
            </div>
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">2</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#1A1A2E] rounded-xl px-3 py-2.5 border border-[#F0C040]/20 focus-within:border-[#F0C040]/60 transition-colors">
          <Search className="w-4 h-4 text-[#F0C040]" />
          <span className="text-sm text-gray-500 flex-1">Search 10,000+ Pi listings…</span>
          <div className="w-px h-4 bg-white/10" />
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Global</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overscroll-none">

        {/* Category strip */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map((c) => (
              <button key={c.label} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-[#1A1A2E] flex items-center justify-center text-xl border border-white/5">
                  {c.icon}
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero banner */}
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative h-32 bg-gradient-to-r from-[#1a0a30] via-[#2d1060] to-[#F0C040]/20 border border-[#F0C040]/20">
          <div className="absolute inset-0 p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#F0C040]" />
              <span className="text-xs font-semibold text-[#F0C040] uppercase tracking-wider">Flash Sale</span>
            </div>
            <div>
              <p className="text-white font-black text-xl leading-tight">Up to 60% off<br/>top Pi listings</p>
              <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#F0C040]">
                Shop now <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-6xl opacity-20">🛍️</div>
        </div>

        {/* Section header */}
        <div className="px-4 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#F0C040]" />
            <span className="font-bold text-sm">Latest Listings</span>
          </div>
          <button className="flex items-center gap-0.5 text-xs text-[#F0C040] font-medium">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Product grid */}
        <div className="px-4 grid grid-cols-2 gap-3 pb-4">
          {FEATURED.map((item) => (
            <div key={item.title} className="bg-[#16213E] rounded-2xl overflow-hidden border border-white/5 active:scale-95 transition-transform">
              <div className="relative">
                <img src={item.image} alt={item.title} className="w-full h-36 object-cover" />
                {item.badge && (
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${item.badge === 'Hot Deal' ? 'bg-red-500 text-white' : item.badge === 'New' ? 'bg-green-500 text-white' : 'bg-[#F0C040] text-black'}`}>
                    {item.badge}
                  </span>
                )}
                <button className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white text-xs">♡</button>
              </div>
              <div className="p-2.5">
                <p className="text-xs text-white font-semibold leading-tight line-clamp-2 mb-1.5">{item.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#F0C040]">π {item.price}</span>
                  <StarRating rating={item.rating} />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.seller}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <div className="bg-[#0D0D14] border-t border-white/5 px-2 pt-2 pb-4 safe-area-bottom">
        <div className="flex justify-around">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Grid, label: "Browse", active: false },
            { icon: PlusCircle, label: "Sell", active: false, special: true },
            { icon: Package, label: "Orders", active: false },
            { icon: User, label: "Profile", active: false },
          ].map(({ icon: Icon, label, active, special }) => (
            <button key={label} className="flex flex-col items-center gap-1 flex-1">
              {special ? (
                <div className="w-12 h-12 -mt-6 rounded-full bg-[#F0C040] flex items-center justify-center shadow-lg shadow-[#F0C040]/30 border-4 border-[#0D0D14]">
                  <Icon className="w-5 h-5 text-black" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${active ? 'text-[#F0C040]' : 'text-gray-600'}`} />
              )}
              <span className={`text-[10px] font-medium ${active ? 'text-[#F0C040]' : special ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
