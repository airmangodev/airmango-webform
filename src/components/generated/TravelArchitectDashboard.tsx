import React, { useState } from 'react';
import { Map as MapIcon, Calendar, Car, Hotel, Camera, Search, Compass, Heart, User, Plus, MoreHorizontal, Star, Clock, MapPin, CheckCircle2, ChevronRight, TrendingUp, LayoutDashboard, Gift, Filter, SlidersHorizontal, Bell, Settings, LogOut, CreditCard, Package, Mountain, Palmtree, Waves, Sparkles, ArrowRight, Check, X, Navigation, ZoomIn, ZoomOut, Layers, Navigation2, Menu, AlertCircle, Send, Loader, Zap, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// MOCK DATA - ICELAND FOCUSED WITH GOOGLE PLACES INTEGRATION
// ============================================================================

// Available Suppliers (signed up on platform)
const AVAILABLE_SUPPLIERS = [{
  id: 'h-1',
  type: 'hotel',
  name: 'The Retreat at Blue Lagoon',
  location: 'Grindavík, Iceland',
  coordinates: {
    lat: 63.88,
    lng: -22.44
  },
  image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
  available: 3,
  total: 5,
  value: '$2,400',
  rating: 4.9,
  reviews: 284,
  amenities: ['Spa Access', 'Private Lagoon', 'Fine Dining'],
  supplier: 'Blue Lagoon Iceland',
  dateRange: 'Mar 15 - Apr 30',
  status: 'available',
  allotmentType: 'pre-approved',
  day: 1
}, {
  id: 'h-2',
  type: 'hotel',
  name: 'Hotel Rangá',
  location: 'Hella, South Iceland',
  coordinates: {
    lat: 63.8321,
    lng: -20.4042
  },
  image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
  available: 2,
  total: 4,
  value: '$1,800',
  rating: 4.9,
  reviews: 201,
  amenities: ['Northern Lights Bar', 'Geothermal Pool', 'Observatory'],
  supplier: 'Hotel Rangá',
  dateRange: 'Year-Round',
  status: 'available',
  allotmentType: 'on-request',
  day: 3
}, {
  id: 'c-1',
  type: 'car',
  name: 'Tesla Model Y - Long Range AWD',
  location: 'Keflavík Airport Pickup',
  coordinates: {
    lat: 63.985,
    lng: -22.605
  },
  image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800',
  available: 7,
  total: 14,
  value: '$850',
  rating: 4.8,
  reviews: 142,
  amenities: ['Autopilot', 'Winter Tires', 'Unlimited km'],
  supplier: 'Nordic EV Rentals',
  dateRange: 'Available Year-Round',
  status: 'available',
  allotmentType: 'pre-approved',
  day: 1
}, {
  id: 'a-1',
  type: 'activity',
  name: 'Golden Circle Private Tour',
  location: 'Þingvellir National Park',
  coordinates: {
    lat: 64.2558,
    lng: -21.1297
  },
  image: 'https://images.unsplash.com/photo-1504870712357-65ea720d6078?auto=format&fit=crop&q=80&w=800',
  available: 6,
  total: 10,
  value: '$320',
  rating: 4.8,
  reviews: 213,
  amenities: ['Private Guide', 'Hotel Pickup', 'Lunch Included'],
  supplier: 'Golden Circle Tours',
  dateRange: 'Year-Round',
  status: 'available',
  allotmentType: 'pre-approved',
  day: 2
}] as any[];

// Google Places Data (not yet on platform)
const GOOGLE_PLACES_NOT_SIGNED = [{
  id: 'g-h-1',
  type: 'hotel',
  name: 'ION Adventure Hotel',
  location: 'Nesjavellir, South Iceland',
  coordinates: {
    lat: 64.065,
    lng: -21.28
  },
  image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800',
  rating: 4.6,
  reviews: 152,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 1234',
    email: 'info@ioniceland.is'
  },
  day: 2
}, {
  id: 'g-h-2',
  type: 'hotel',
  name: 'Hotel Budir',
  location: 'Snæfellsnes Peninsula',
  coordinates: {
    lat: 64.8233,
    lng: -23.7953
  },
  image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=800',
  rating: 4.8,
  reviews: 167,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 5678',
    email: 'info@hotelbudir.is'
  },
  day: 4
}, {
  id: 'g-h-3',
  type: 'hotel',
  name: 'Fosshotel Glacier Lagoon',
  location: 'Jökulsárlón Area',
  coordinates: {
    lat: 64.04,
    lng: -16.18
  },
  image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
  rating: 4.5,
  reviews: 192,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 9012',
    email: 'info@fosshotel.is'
  },
  day: 5
}, {
  id: 'g-c-1',
  type: 'car',
  name: 'Land Rover Defender 4x4',
  location: 'Downtown Reykjavík',
  coordinates: {
    lat: 64.1466,
    lng: -21.9426
  },
  image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=800',
  rating: 4.7,
  reviews: 97,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 3456',
    email: 'info@arctictrucks.is'
  },
  day: 1
}, {
  id: 'g-a-1',
  type: 'activity',
  name: 'Jökulsárlón Glacier Lagoon Tour',
  location: 'Jökulsárlón',
  coordinates: {
    lat: 64.0484,
    lng: -16.1794
  },
  image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=80&w=800',
  rating: 5.0,
  reviews: 189,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 7890',
    email: 'info@glacierlagoon.is'
  },
  day: 5
}, {
  id: 'g-a-2',
  type: 'activity',
  name: 'Skógafoss Waterfall Experience',
  location: 'Skógar, South Coast',
  coordinates: {
    lat: 63.5319,
    lng: -19.5111
  },
  image: 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&q=80&w=800',
  rating: 4.9,
  reviews: 276,
  status: 'not-signed',
  googlePlaceId: 'ChIJ...',
  contact: {
    phone: '+354 555 2345',
    email: 'info@southcoast.is'
  },
  day: 3
}] as any[];
const ALL_ASSETS = [...AVAILABLE_SUPPLIERS, ...GOOGLE_PLACES_NOT_SIGNED];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CategoryBadge = ({
  type
}: {
  type: string;
}) => {
  const styles: Record<string, {
    bg: string;
    text: string;
    icon: React.ReactNode;
  }> = {
    hotel: {
      bg: 'bg-pink-50 text-pink-600 border-pink-200',
      text: 'Hotel',
      icon: <Hotel className="w-3 h-3" />
    },
    car: {
      bg: 'bg-gray-50 text-gray-600 border-gray-200',
      text: 'Vehicle',
      icon: <Car className="w-3 h-3" />
    },
    activity: {
      bg: 'bg-pink-50 text-pink-600 border-pink-200',
      text: 'Activity',
      icon: <Mountain className="w-3 h-3" />
    }
  };
  const style = styles[type] || styles.activity;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg}`}>
      {style.icon}
      {style.text}
    </span>;
};
const StatusBadge = ({
  status,
  allotmentType
}: {
  status: string;
  allotmentType?: string;
}) => {
  if (status === 'available') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EC407A] text-white">
        <CheckCircle2 className="w-3 h-3" />
        {allotmentType === 'pre-approved' ? 'Pre-Approved' : 'On Request'}
      </span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <AlertCircle className="w-3 h-3" />
      Not on Platform
    </span>;
};

// ============================================================================
// APPLY TRIP CONFIRMATION MODAL
// ============================================================================

const ApplyTripModal = ({
  tripAssets,
  onClose,
  onConfirm
}: {
  tripAssets: any[];
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const notSignedAssets = tripAssets.filter(a => a.status === 'not-signed');
  const availableAssets = tripAssets.filter(a => a.status === 'available');
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <motion.div initial={{
      scale: 0.95,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} exit={{
      scale: 0.95,
      opacity: 0
    }} className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-[#EC407A]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-xl mb-1">Request Trip Confirmation</h3>
            <p className="text-sm text-gray-600">
              Review your trip and confirm. AI agents will contact non-partner suppliers automatically.
            </p>
          </div>
        </div>

        {/* Available Assets Summary */}
        {availableAssets.length > 0 && <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#EC407A]" />
              Ready to Book ({availableAssets.length})
            </h4>
            <div className="space-y-2">
              {availableAssets.map(asset => <div key={asset.id} className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <img src={asset.image} alt={asset.name} className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                    <p className="text-xs text-gray-600">{asset.location}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#EC407A]">{asset.value}</span>
                </div>)}
            </div>
          </div>}

        {/* Not Signed Assets - Will be AI Requested */}
        {notSignedAssets.length > 0 && <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              AI Agent Will Contact ({notSignedAssets.length})
            </h4>
            <div className="space-y-2">
              {notSignedAssets.map(asset => <div key={asset.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <img src={asset.image} alt={asset.name} className="w-12 h-12 rounded object-cover grayscale" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                    <p className="text-xs text-gray-600">{asset.location}</p>
                  </div>
                  <span className="text-xs text-gray-700 font-medium">AI Request</span>
                </div>)}
            </div>
          </div>}

        {/* What Happens Next */}
        {notSignedAssets.length > 0 && <div className="bg-pink-50 rounded-lg p-4 mb-6 border border-pink-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#EC407A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">What happens next?</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>
                    • AI agents automatically contact {notSignedAssets.length} non-partner supplier
                    {notSignedAssets.length > 1 ? 's' : ''}
                  </li>
                  <li>• Suppliers learn about AirMango and your creator profile</li>
                  <li>• You'll receive notifications when they respond (24-48h typical)</li>
                  <li>• Available assets will be booked immediately</li>
                </ul>
              </div>
            </div>
          </div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {tripAssets.length > 0 ? 'Create a Trip' : 'Create a Trip'}
          </button>
        </div>
      </motion.div>
    </motion.div>;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TravelArchitectDashboard = () => {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(AVAILABLE_SUPPLIERS[3]); // Default to Golden Circle
  const [tripAssets, setTripAssets] = useState<string[]>(['a-1']); // Default trip with Golden Circle
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appliedTrips, setAppliedTrips] = useState<string[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const filteredAllotments = ALL_ASSETS.filter(item => {
    const typeMatch = filterType ? item.type === filterType : true;
    const statusMatch = showOnlyAvailable ? item.status === 'available' : true;
    return typeMatch && statusMatch;
  });
  const handleAddAssetToTrip = (asset: any) => {
    if (!tripAssets.includes(asset.id)) {
      // Update the asset's day to the current selected day
      const updatedAsset = ALL_ASSETS.find(a => a.id === asset.id);
      if (updatedAsset) {
        updatedAsset.day = currentDay;
      }
      setTripAssets([...tripAssets, asset.id]);
    }
  };
  const handleRemoveAssetFromTrip = (assetId: string) => {
    setTripAssets(tripAssets.filter(id => id !== assetId));
  };
  const handleApplyTrip = () => {
    const assetsInTrip = ALL_ASSETS.filter(a => tripAssets.includes(a.id));
    const notSignedAssets = assetsInTrip.filter(a => a.status === 'not-signed');
    setAppliedTrips([...appliedTrips, ...notSignedAssets.map(a => a.id)]);
    setShowApplyModal(false);
    console.log('AI Agents contacting:', notSignedAssets);
  };
  const tripAssetsData = ALL_ASSETS.filter(a => tripAssets.includes(a.id));
  const availableCount = ALL_ASSETS.filter(a => a.status === 'available').length;
  const notSignedCount = ALL_ASSETS.filter(a => a.status === 'not-signed').length;

  // Group trip assets by day
  const tripAssetsByDay = tripAssetsData.reduce((acc, asset) => {
    const day = asset.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(asset);
    return acc;
  }, {} as Record<number, any[]>);
  const sortedDays = Object.keys(tripAssetsByDay).sort((a, b) => Number(a) - Number(b));
  return <div className="flex flex-col min-h-screen bg-white font-sans text-gray-900">
      {/* ===== NAVIGATION HEADER ===== */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-normal tracking-tight">
              <span className="text-gray-900">Air</span>
              <span className="text-[#EC407A]">mango</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <button className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors">
              How It Works
            </button>
            <button className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors">Demo</button>
            <button className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors">
              For Suppliers
            </button>
            
            <button className="px-6 py-2.5 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors">
              This is a Demo only
            </button>
          </nav>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Iceland Expedition 2024</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Southern Region & Highlands</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Apr 15 - Apr 21 (7 days)</span>
              </div>
              {tripAssets.length > 0 && <>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <span className="px-3 py-1 bg-[#EC407A] text-white text-xs rounded-full font-medium">
                    {tripAssets.length} Asset{tripAssets.length > 1 ? 's' : ''} Added
                  </span>
                </>}
            </div>
          </div>

          {/* MAP-BASED TRIP PLANNER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Container */}
            <div className="lg:col-span-2 space-y-6">
              {/* Day Switcher */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Select Day</span>
                  <span className="text-xs text-gray-500">7 days</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                  const dayHasAssets = tripAssetsData.some(asset => asset.day === day);
                  return <button key={day} onClick={() => setCurrentDay(day)} className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${currentDay === day ? 'bg-[#EC407A] text-white shadow-lg scale-105' : dayHasAssets ? 'bg-pink-50 text-[#EC407A] border-2 border-pink-200 hover:bg-pink-100' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`}>
                        <span>{day}</span>
                      </button>;
                })}</div>
              </div>

              {/* Map View */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 relative" style={{
              height: '580px'
            }}>
                {/* Create Journey Button - Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={() => setShowInstructions(!showInstructions)} className="px-4 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl">
                    <Info className="w-4 h-4" />
                    {tripAssets.length > 0 ? 'Create a Trip' : 'Create a Trip'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Instructions Dropdown */}
                  <AnimatePresence>
                    {showInstructions && <motion.div initial={{
                    opacity: 0,
                    y: -10
                  }} animate={{
                    opacity: 1,
                    y: 0
                  }} exit={{
                    opacity: 0,
                    y: -10
                  }} className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">How to Plan Your Trip</h4>
                        <ul className="text-xs text-gray-700 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span>Click on any marker on the map to view asset details</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span>Add assets to your trip - pink markers are partners, gray ones trigger AI outreach</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span>Review your complete itinerary below the map</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            <span>Finalize your trip - AI agents contact non-partners automatically</span>
                          </li>
                        </ul>
                        <button onClick={() => setShowApplyModal(true)} className="w-full mt-3 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-semibold">
                          {tripAssets.length > 0 ? 'Create a Trip' : 'Create a Trip'}
                        </button>
                      </motion.div>}
                  </AnimatePresence>
                </div>

                <div className="relative w-full h-full bg-gradient-to-br from-gray-100 via-white to-gray-50">
                  {/* Iceland Map Background */}
                  <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1000 800' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='oceanGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23f3f4f6;stop-opacity:0.8'/%3E%3Cstop offset='100%25' style='stop-color:%23ffffff;stop-opacity:0.9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23oceanGrad)' width='1000' height='800'/%3E%3Cpath d='M200,280 Q220,240 270,250 L340,265 Q380,255 420,275 L480,295 Q540,285 600,310 L670,330 Q730,320 780,340 L810,420 Q800,460 760,480 L690,500 Q620,520 550,510 L460,495 Q380,510 310,490 L240,465 Q190,445 170,410 L165,340 Q175,300 200,280 Z' fill='%236b7280' stroke='%234b5563' stroke-width='2' opacity='0.3'/%3E%3Cpath d='M200,360 L180,390 Q185,410 205,420 L230,410 Q245,395 235,375 Z' fill='%236b7280' stroke='%234b5563' stroke-width='1.5' opacity='0.3'/%3E%3Cpath d='M280,290 Q295,265 325,275 L360,290 Q370,310 355,325 L315,315 Z' fill='%236b7280' stroke='%234b5563' stroke-width='1.5' opacity='0.3'/%3E%3C/svg%3E")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}></div>

                  {/* Trip Path Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {tripAssets.length > 1 && tripAssets.map((assetId, idx) => {
                    if (idx === tripAssets.length - 1) return null;
                    const currentAsset = ALL_ASSETS.find(a => a.id === assetId);
                    const nextAsset = ALL_ASSETS.find(a => a.id === tripAssets[idx + 1]);
                    if (!currentAsset || !nextAsset) return null;
                    const latRange = [63.3, 66.6];
                    const lngRange = [-24.5, -13.5];
                    const x1 = (currentAsset.coordinates.lng - lngRange[0]) / (lngRange[1] - lngRange[0]) * 700 + 150;
                    const y1 = (1 - (currentAsset.coordinates.lat - latRange[0]) / (latRange[1] - latRange[0])) * 400 + 50;
                    const x2 = (nextAsset.coordinates.lng - lngRange[0]) / (lngRange[1] - lngRange[0]) * 700 + 150;
                    const y2 = (1 - (nextAsset.coordinates.lat - latRange[0]) / (latRange[1] - latRange[0])) * 400 + 50;
                    return <g key={`path-${idx}`}>
                            <motion.line initial={{
                        pathLength: 0,
                        opacity: 0
                      }} animate={{
                        pathLength: 1,
                        opacity: 1
                      }} transition={{
                        duration: 0.5,
                        delay: idx * 0.1
                      }} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#EC407A" strokeWidth="3" strokeDasharray="8,4" strokeLinecap="round" />
                            <motion.circle initial={{
                        scale: 0,
                        opacity: 0
                      }} animate={{
                        scale: 1,
                        opacity: 1
                      }} transition={{
                        duration: 0.3,
                        delay: idx * 0.1 + 0.3
                      }} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="4" fill="#EC407A" />
                          </g>;
                  })}
                  </svg>

                  {/* Asset Markers */}
                  {filteredAllotments.map((asset, idx) => {
                  const latRange = [63.3, 66.6];
                  const lngRange = [-24.5, -13.5];
                  const xPos = (asset.coordinates.lng - lngRange[0]) / (lngRange[1] - lngRange[0]) * 700 + 150;
                  const yPos = (1 - (asset.coordinates.lat - latRange[0]) / (latRange[1] - latRange[0])) * 400 + 50;
                  const isSelected = selectedAsset?.id === asset.id;
                  const isHovered = hoveredAsset === asset.id;
                  const isAdded = tripAssets.includes(asset.id);
                  const isPending = appliedTrips.includes(asset.id);
                  const isNotSigned = asset.status === 'not-signed';
                  return <motion.div key={asset.id} initial={{
                    scale: 0,
                    opacity: 0
                  }} animate={{
                    scale: 1,
                    opacity: 1
                  }} transition={{
                    delay: idx * 0.05
                  }} style={{
                    position: 'absolute',
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    transform: 'translate(-50%, -50%)'
                  }} className="cursor-pointer" onClick={() => setSelectedAsset(asset)} onMouseEnter={() => setHoveredAsset(asset.id)} onMouseLeave={() => setHoveredAsset(null)}>
                        {(isSelected || isHovered) && <motion.div initial={{
                      scale: 1,
                      opacity: 0.5
                    }} animate={{
                      scale: 2,
                      opacity: 0
                    }} transition={{
                      duration: 1.5,
                      repeat: Infinity
                    }} className={`absolute inset-0 w-10 h-10 rounded-full -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 ${isNotSigned ? 'bg-gray-400' : 'bg-[#EC407A]'}`} />}

                        <div className={`relative w-10 h-10 rounded-full border-4 border-white flex items-center justify-center transition-all shadow-lg ${isAdded ? 'ring-4 ring-[#EC407A]' : isPending ? 'ring-4 ring-gray-400 animate-pulse' : isSelected ? 'scale-125 shadow-xl' : isHovered ? 'scale-110' : ''} ${isNotSigned ? 'bg-gray-400' : 'bg-[#EC407A]'}`}>
                          {asset.type === 'hotel' && <Hotel className="w-5 h-5 text-white" />}
                          {asset.type === 'car' && <Car className="w-5 h-5 text-white" />}
                          {asset.type === 'activity' && <Mountain className="w-5 h-5 text-white" />}

                          {isAdded && !isPending && <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#EC407A] rounded-full border-2 border-white flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>}

                          {isPending && <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 rounded-full border-2 border-white flex items-center justify-center">
                              <Loader className="w-3 h-3 text-white animate-spin" />
                            </div>}
                        </div>

                        {(isHovered || isSelected) && <motion.div initial={{
                      opacity: 0,
                      y: 10
                    }} animate={{
                      opacity: 1,
                      y: 0
                    }} className="absolute top-12 left-1/2 -translate-x-1/2 bg-white rounded-lg border border-gray-200 px-3 py-2 whitespace-nowrap z-20 shadow-xl">
                            <p className="text-xs font-semibold text-gray-900">{asset.name}</p>
                            {asset.status === 'available' ? <p className="text-xs text-[#EC407A] font-medium">{asset.value}</p> : <p className="text-xs text-gray-600">Via AI Agent</p>}
                          </motion.div>}
                      </motion.div>;
                })}</div>
              </div>

              {/* TripItinerary Below Map - Grouped by Days */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Trip Itinerary</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {tripAssets.length === 0 ? 'Add assets to build your trip' : `${sortedDays.length} day${sortedDays.length > 1 ? 's' : ''} • ${tripAssets.length} stop${tripAssets.length > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                {tripAssets.length === 0 ? <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <MapIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">No assets added yet</p>
                    <p className="text-xs text-gray-400">Click assets on the map to add them to your trip</p>
                  </div> : <div className="p-4 space-y-6">
                    {sortedDays.map(day => {
                  const dayAssets = tripAssetsByDay[Number(day)];
                  return <div key={day} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#EC407A]" />
                            <h4 className="text-sm font-bold text-gray-900">Day {day}</h4>
                          </div>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        
                        <div className="space-y-2 pl-6">
                          {dayAssets.map((asset, idx) => {
                        const isPending = appliedTrips.includes(asset.id);
                        return <motion.div key={asset.id} initial={{
                          opacity: 0,
                          x: -20
                        }} animate={{
                          opacity: 1,
                          x: 0
                        }} transition={{
                          delay: idx * 0.05
                        }} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group border border-gray-200">
                                {/* Image */}
                                <img src={asset.image} alt={asset.name} className={`w-16 h-16 rounded-lg object-cover flex-shrink-0 ${asset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{asset.name}</h4>
                                  <p className="text-xs text-gray-600 mb-2">{asset.location}</p>
                                  <div className="flex items-center gap-2">
                                    <CategoryBadge type={asset.type} />
                                    {asset.status === 'available' ? <span className="text-xs font-semibold text-[#EC407A]">{asset.value}</span> : <span className="text-xs text-gray-600">AI Request</span>}
                                  </div>
                                  {isPending && <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                                      <Loader className="w-3 h-3 animate-spin" />
                                      <span>AI Contacting...</span>
                                    </div>}
                                </div>

                                {/* Remove Button */}
                                <button onClick={() => handleRemoveAssetFromTrip(asset.id)} className="flex-shrink-0 w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-gray-200 shadow-sm">
                                  <X className="w-4 h-4" />
                                </button>
                              </motion.div>;
                      })}
                        </div>
                      </div>;
                })}</div>}
              </div>
            </div>

            {/* Right Sidebar - Selected Detail + Available Assets */}
            <div className="space-y-6">
              {/* Selected Asset Detail Card */}
              {selectedAsset && <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{
              height: '580px',
              display: 'flex',
              flexDirection: 'column'
            }}>
                  <div className="relative flex-shrink-0">
                    <img src={selectedAsset.image} alt={selectedAsset.name} className={`w-full h-48 object-cover ${selectedAsset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`} />
                    <button onClick={() => setSelectedAsset(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedAsset.name}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedAsset.location}
                        </p>
                      </div>
                      {selectedAsset.status === 'available' && <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-[#EC407A]">{selectedAsset.value}</div>
                          <div className="text-xs text-gray-600">Value</div>
                        </div>}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <CategoryBadge type={selectedAsset.type} />
                      <StatusBadge status={selectedAsset.status} allotmentType={selectedAsset.allotmentType} />
                    </div>

                    {selectedAsset.rating && <div className="flex items-center gap-2 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold">{selectedAsset.rating}</span>
                        </div>
                        <span className="text-gray-600">({selectedAsset.reviews} reviews)</span>
                      </div>}

                    {selectedAsset.amenities && <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Includes</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedAsset.amenities.map((amenity: string, idx: number) => <span key={idx} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                              {amenity}
                            </span>)}
                        </div>
                      </div>}

                    {/* Add to Trip Button - Moved up */}
                    <div className="mb-4">
                      {!tripAssets.includes(selectedAsset.id) ? <button onClick={() => handleAddAssetToTrip(selectedAsset)} className="w-full px-4 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-semibold">
                          <Plus className="w-4 h-4" />
                          Add to Trip
                        </button> : <button onClick={() => handleRemoveAssetFromTrip(selectedAsset.id)} className="w-full px-4 py-3 bg-white text-[#EC407A] rounded-full hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 font-semibold border-2 border-[#EC407A]">
                          <Check className="w-4 h-4" />
                          Added to Trip
                        </button>}
                    </div>

                    {selectedAsset.status === 'not-signed' && <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-[#EC407A] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 mb-1">Not a partner yet</p>
                            <p className="text-xs text-gray-700">
                              Add to trip & our AI agent will contact them about this request. We will let you know if they join
                            </p>
                          </div>
                        </div>
                      </div>}
                  </div>
                </motion.div>}

              {/* Available Assets in View - Now separate card below selected asset */}
              {selectedAsset && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Assets Available</h3>
                    <p className="text-xs text-gray-600">
                      {availableCount} partners • {notSignedCount} via AI
                    </p>
                  </div>
                  <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredAllotments.slice(0, 6).map(asset => {
                  const isAdded = tripAssets.includes(asset.id);
                  return <motion.div key={asset.id} whileHover={{
                    y: -2
                  }} onClick={() => setSelectedAsset(asset)} onMouseEnter={() => setHoveredAsset(asset.id)} onMouseLeave={() => setHoveredAsset(null)} className={`bg-white border rounded-lg overflow-hidden hover:border-[#EC407A] transition-all cursor-pointer ${selectedAsset?.id === asset.id ? 'border-[#EC407A] ring-2 ring-pink-200' : 'border-gray-200'} ${isAdded ? 'ring-2 ring-pink-200' : ''}`}>
                            <div className="flex gap-3 p-3">
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                                <img src={asset.image} alt={asset.name} className={`w-full h-full object-cover ${asset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`} />
                                {isAdded && <div className="absolute inset-0 bg-[#EC407A]/20 flex items-center justify-center">
                                    <div className="w-5 h-5 bg-[#EC407A] rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  </div>}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">{asset.name}</h4>
                                <p className="text-xs text-gray-600 truncate mb-2">{asset.location}</p>
                                <div className="flex items-center gap-2">
                                  <CategoryBadge type={asset.type} />
                                </div>
                              </div>
                            </div>
                          </motion.div>;
                })}</div>
                </div>}

              {/* Available Assets List - Keep this for when no asset is selected */}
              {!selectedAsset && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900">Available Assets</h3>
                      <button onClick={() => setShowOnlyAvailable(!showOnlyAvailable)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${showOnlyAvailable ? 'bg-[#EC407A] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {showOnlyAvailable ? 'Show All' : 'Partners Only'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      {availableCount} partners active • {notSignedCount} via AI request
                    </p>
                  </div>
                  <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredAllotments.map(asset => {
                  const isAdded = tripAssets.includes(asset.id);
                  const isPending = appliedTrips.includes(asset.id);
                  return <motion.div key={asset.id} whileHover={{
                    y: -2
                  }} onClick={() => setSelectedAsset(asset)} onMouseEnter={() => setHoveredAsset(asset.id)} onMouseLeave={() => setHoveredAsset(null)} className={`bg-white border rounded-lg overflow-hidden hover:border-[#EC407A] transition-all cursor-pointer ${selectedAsset?.id === asset.id ? 'border-[#EC407A] ring-2 ring-pink-200' : 'border-gray-200'} ${isAdded ? 'ring-2 ring-pink-200' : ''} ${isPending ? 'ring-2 ring-gray-400' : ''}`}>
                          <div className="flex gap-3 p-3">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                              <img src={asset.image} alt={asset.name} className={`w-full h-full object-cover ${asset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`} />
                              {isAdded && !isPending && <div className="absolute inset-0 bg-[#EC407A]/20 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-[#EC407A] rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                </div>}
                              {isPending && <div className="absolute inset-0 bg-gray-600/20 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                                    <Loader className="w-4 h-4 text-white animate-spin" />
                                  </div>
                                </div>}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">{asset.name}</h4>
                              <p className="text-xs text-gray-600 truncate mb-2">{asset.location}</p>
                              <div className="flex items-center gap-2">
                                <CategoryBadge type={asset.type} />
                                {asset.status === 'available' ? <span className="text-sm font-semibold text-[#EC407A]">{asset.value}</span> : <span className="text-xs text-gray-600">AI Request</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>;
                })}</div>
                </div>}
            </div>
          </div>
        </div>
      </main>

      {/* Apply Trip Modal */}
      <AnimatePresence>
        {showApplyModal && <ApplyTripModal tripAssets={tripAssetsData} onClose={() => setShowApplyModal(false)} onConfirm={handleApplyTrip} />}
      </AnimatePresence>
    </div>;
};