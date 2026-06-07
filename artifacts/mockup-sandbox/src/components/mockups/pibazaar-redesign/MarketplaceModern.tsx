import { Search, MapPin, SlidersHorizontal, Home, Compass, Plus, ShoppingBag, UserCircle, ChevronRight, Clock, Heart } from "lucide-react";

const FILTERS = ["All", "Near You", "New Today", "Deals", "Verified"];

const LISTINGS = [
  {
    title: "Sony WH-1000XM5 Headphones",
    price: "65",
    location: "2 km away",
    time: "1h ago",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80",
    seller: "Tom R.",
    avatar: "https://i.pravatar.cc/32?img=1",
    liked: false,
  },
  {
    title: "MacBook Air M2 — Perfect Condition",
    price: "890",
    location: "5 km away",
    time: "3h ago",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&q=80",
    seller: "John D.",
    avatar: "https://i.pravatar.cc/32?img=5",
    liked: true,
  },
  {
    title: "Nike Air Max 2024 — Size 42",
    price: "45",
    location: "8 km away",
    time: "5h ago",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    seller: "Maria T.",
    avatar: "https://i.pravatar.cc/32?img=9",
    liked: false,
  },
  {
    title: "Vintage Leather Crossbody Bag",
    price: "28",
    location: "3 km away",
    time: "12h ago",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80",
    seller: "Sara M.",
    avatar: "https://i.pravatar.cc/32?img=20",
    liked: false,
  },
];

export function MarketplaceModern() {
  return (
    <div className="w-[390px] h-[844px] bg-[#F8F9FA] text-gray-900 flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Status bar */}
      <div className="bg-white flex justify-between items-center px-5 pt-3 pb-1">
        <span className="text-xs font-semibold text-gray-800">9:41</span>
        <div className="flex gap-1.5 items-center">
          <div className="w-4 h-2.5 rounded-sm border border-gray-400 relative">
            <div className="absolute inset-0.5 right-1 bg-gray-700 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm px-4 pb-3">
        <div className="flex items-center justify-between mb-3 pt-1">
          <div>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#4B0082]" /> Your location
            </p>
            <p className="font-bold text-base text-gray-900 leading-tight flex items-center gap-1">
              Worldwide <ChevronRight className="w-4 h-4 text-gray-400" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-full bg-[#F0C040]/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#4B0082]" />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#F0C040] rounded-full text-[8px] font-bold text-black flex items-center justify-center">2</span>
            </button>
            <img src="https://i.pravatar.cc/36?img=33" alt="" className="w-9 h-9 rounded-full border-2 border-[#F0C040]" />
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 bg-gray-100 rounded-2xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">What are you looking for?</span>
          </div>
          <button className="w-11 h-11 rounded-2xl bg-[#4B0082] flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              i === 0
                ? "bg-[#4B0082] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto overscroll-none bg-[#F8F9FA]">

        {/* Stats banner */}
        <div className="mx-4 mt-4 mb-3 bg-gradient-to-r from-[#4B0082] to-[#7B2FBE] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Active listings</p>
            <p className="text-white font-black text-2xl">10,247</p>
            <p className="text-[#F0C040] text-xs mt-0.5 flex items-center gap-1">
              <span>↑ 12% this week</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-xs">Avg. price</p>
            <p className="text-white font-black text-2xl">π 84</p>
            <p className="text-white/60 text-xs mt-0.5">across all categories</p>
          </div>
        </div>

        {/* Section */}
        <div className="px-4 flex items-center justify-between mb-2">
          <p className="font-bold text-gray-900 text-sm">Latest near you</p>
          <button className="text-xs text-[#4B0082] font-semibold flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Listing cards — full-width horizontal layout */}
        <div className="px-4 flex flex-col gap-3 pb-6">
          {LISTINGS.map((item) => (
            <div key={item.title} className="bg-white rounded-2xl overflow-hidden shadow-sm flex border border-gray-100">
              <div className="relative flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-28 h-28 object-cover" />
                <button
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${item.liked ? 'bg-red-50' : 'bg-black/20'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${item.liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.title}</p>
                  <p className="text-xl font-black text-[#4B0082] mt-1">π {item.price}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img src={item.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-[11px] text-gray-500 truncate">{item.seller}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400">{item.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating sell button */}
      <div className="absolute bottom-20 right-4">
        <button className="w-14 h-14 rounded-full bg-[#F0C040] flex items-center justify-center shadow-xl shadow-[#F0C040]/40">
          <Plus className="w-6 h-6 text-black font-bold" />
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-5 flex justify-around items-center">
        {[
          { icon: Home, label: "Home", active: true },
          { icon: Compass, label: "Explore", active: false },
          { icon: ShoppingBag, label: "Orders", active: false },
          { icon: UserCircle, label: "Profile", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className="flex flex-col items-center gap-1 flex-1">
            <Icon className={`w-5 h-5 ${active ? 'text-[#4B0082]' : 'text-gray-400'}`} />
            <span className={`text-[10px] font-medium ${active ? 'text-[#4B0082] font-bold' : 'text-gray-400'}`}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
