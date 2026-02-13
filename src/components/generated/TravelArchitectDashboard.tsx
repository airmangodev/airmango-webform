import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  useJsApiLoader,
  GoogleMap,
  MarkerF,
  PolylineF,
  InfoWindowF,
} from '@react-google-maps/api';
import {
  Calendar,
  Car,
  Hotel,
  Camera,
  Compass,
  Plus,
  Star,
  MapPin,
  CheckCircle2,
  Mountain,
  Sparkles,
  Check,
  X,
  Menu,
  AlertCircle,
  Send,
  Loader,
  Zap,
  Info,
  ChevronDown,
  Search,
  Map as MapIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface PlaceAsset {
  id: string;
  type: 'attraction' | 'hotel' | 'activity';
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  image: string;
  rating: number;
  reviews: number;
  status: 'available';
  googlePlaceId: string;
}

interface Destination {
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
}

interface TripItem extends PlaceAsset {
  day: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DESTINATION: Destination = {
  name: 'Iceland',
  center: { lat: 64.9631, lng: -19.0208 },
  zoom: 6,
};

const LIBRARIES: ('places')[] = ['places'];

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ============================================================================
// HELPERS
// ============================================================================

const getSavedDestination = (): Destination => {
  try {
    const saved = localStorage.getItem('airmango_destination');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_DESTINATION;
};

const saveDestination = (dest: Destination) => {
  localStorage.setItem('airmango_destination', JSON.stringify(dest));
};

const createMarkerSvg = (
  type: string,
  opts: { isSelected?: boolean; isAdded?: boolean; isHovered?: boolean } = {},
) => {
  const { isSelected, isAdded, isHovered } = opts;
  const size = isSelected || isHovered ? 48 : 40;
  const color =
    type === 'hotel' ? '#EC407A' : type === 'attraction' ? '#F97316' : '#8B5CF6';
  const letter = type === 'hotel' ? 'H' : type === 'attraction' ? 'A' : 'T';

  let badge = '';
  if (isAdded) {
    badge = `<circle cx="${size - 8}" cy="8" r="7" fill="#22c55e" stroke="white" stroke-width="2"/>
      <text x="${size - 8}" y="12" text-anchor="middle" fill="white" font-size="10" font-weight="bold">✓</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
    <defs><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    <path d="M${size / 2} ${size + 8} C${size / 2} ${size + 8} 2 ${size * 0.6} 2 ${size * 0.38} C2 ${size * 0.15} ${size * 0.22} 2 ${size / 2} 2 C${size * 0.78} 2 ${size - 2} ${size * 0.15} ${size - 2} ${size * 0.38} C${size - 2} ${size * 0.6} ${size / 2} ${size + 8} ${size / 2} ${size + 8}Z" fill="${color}" stroke="white" stroke-width="2.5" filter="url(#s)"/>
    <circle cx="${size / 2}" cy="${size * 0.38}" r="${size * 0.22}" fill="rgba(255,255,255,0.25)"/>
    <text x="${size / 2}" y="${size * 0.44}" text-anchor="middle" fill="white" font-size="${size * 0.35}" font-weight="bold" font-family="system-ui, sans-serif">${letter}</text>
    ${badge}
  </svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size + 10),
    anchor: new google.maps.Point(size / 2, size + 10),
  };
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CategoryBadge = ({ type }: { type: string }) => {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    hotel: {
      bg: 'bg-pink-50 text-pink-600 border-pink-200',
      text: 'Hotel',
      icon: <Hotel className="w-3 h-3" />,
    },
    car: {
      bg: 'bg-gray-50 text-gray-600 border-gray-200',
      text: 'Vehicle',
      icon: <Car className="w-3 h-3" />,
    },
    activity: {
      bg: 'bg-purple-50 text-purple-600 border-purple-200',
      text: 'Activity',
      icon: <Mountain className="w-3 h-3" />,
    },
    attraction: {
      bg: 'bg-orange-50 text-orange-600 border-orange-200',
      text: 'Attraction',
      icon: <Camera className="w-3 h-3" />,
    },
  };
  const style = styles[type] || styles.activity;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg}`}
    >
      {style.icon}
      {style.text}
    </span>
  );
};

// ============================================================================
// APPLY TRIP CONFIRMATION MODAL
// ============================================================================

const ApplyTripModal = ({
  tripAssets,
  onClose,
  onConfirm,
}: {
  tripAssets: TripItem[];
  onClose: () => void;
  onConfirm: () => void;
}) => {
  // Group by day
  const byDay = tripAssets.reduce(
    (acc, a) => {
      const d = a.day || 1;
      if (!acc[d]) acc[d] = [];
      acc[d].push(a);
      return acc;
    },
    {} as Record<number, TripItem[]>,
  );
  const days = Object.keys(byDay)
    .sort((a, b) => Number(a) - Number(b));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-[#EC407A]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-xl mb-1">
              Request Trip Confirmation
            </h3>
            <p className="text-sm text-gray-600">
              Review your trip itinerary and confirm to proceed.
            </p>
          </div>
        </div>

        {days.map((day) => (
          <div key={day} className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#EC407A]" />
              Day {day} ({byDay[Number(day)].length} stop
              {byDay[Number(day)].length > 1 ? 's' : ''})
            </h4>
            <div className="space-y-2">
              {byDay[Number(day)].map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200"
                >
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-600">{asset.location}</p>
                  </div>
                  <CategoryBadge type={asset.type} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-pink-50 rounded-lg p-4 mb-6 border border-pink-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#EC407A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                What happens next?
              </p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Your trip will be created and suppliers will be contacted</li>
                <li>• You'll receive notifications when they respond</li>
                <li>• Bookings will be confirmed based on availability</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Create a Trip
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TravelArchitectDashboard = () => {
  // Google Maps loader
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // Core state
  const [destination, setDestination] = useState<Destination>(getSavedDestination());
  const [allAssets, setAllAssets] = useState<PlaceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<PlaceAsset | null>(null);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Trip state
  const [tripItems, setTripItems] = useState<Map<string, number>>(new Map());
  const [currentDay, setCurrentDay] = useState(1);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Destination search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // ---- PLACES FETCHING ----

  const normalizePlace = useCallback(
    (place: google.maps.places.PlaceResult, type: PlaceAsset['type']): PlaceAsset => ({
      id: place.place_id || `place-${Math.random().toString(36).slice(2)}`,
      type,
      name: place.name || 'Unknown Place',
      location: place.formatted_address || place.vicinity || '',
      coordinates: {
        lat: place.geometry?.location?.lat() || 0,
        lng: place.geometry?.location?.lng() || 0,
      },
      image: place.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 500 }) || '',
      rating: place.rating || 0,
      reviews: place.user_ratings_total || 0,
      status: 'available',
      googlePlaceId: place.place_id || '',
    }),
    [],
  );

  const fetchPlaces = useCallback(() => {
    if (!placesServiceRef.current) return;
    setLoading(true);
    setError(null);
    setAllAssets([]);

    const service = placesServiceRef.current;
    const allResults: PlaceAsset[] = [];
    let completedSearches = 0;
    const totalSearches = 3;

    const checkComplete = () => {
      completedSearches++;
      if (completedSearches === totalSearches) {
        // Deduplicate by place_id
        const seen = new Set<string>();
        const unique = allResults.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setAllAssets(unique);
        setLoading(false);
      }
    };

    const handleResults = (type: PlaceAsset['type']) =>
      (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus,
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.forEach((r) => {
            if (r.geometry?.location) {
              allResults.push(normalizePlace(r, type));
            }
          });
        }
        checkComplete();
      };

    // 1. Tourist attractions
    service.textSearch(
      { query: `top tourist attractions in ${destination.name}` },
      handleResults('attraction'),
    );

    // 2. Hotels & accommodations
    service.textSearch(
      { query: `best hotels and accommodations in ${destination.name}` },
      handleResults('hotel'),
    );

    // 3. Tours & activities
    service.textSearch(
      { query: `tours and activities in ${destination.name}` },
      handleResults('activity'),
    );
  }, [destination, normalizePlace]);

  // Fetch places when map loads or destination changes
  useEffect(() => {
    if (isLoaded && placesServiceRef.current) {
      fetchPlaces();
    }
  }, [isLoaded, destination, fetchPlaces]);

  // ---- MAP SETUP ----

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      placesServiceRef.current = new google.maps.places.PlacesService(map);
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      fetchPlaces();
    },
    [fetchPlaces],
  );

  // ---- DESTINATION SEARCH ----

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!autocompleteServiceRef.current || query.length < 2) {
        setSearchResults([]);
        return;
      }
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          types: ['(cities)'],
        },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSearchResults(predictions);
          } else {
            setSearchResults([]);
          }
        },
      );
    },
    [],
  );

  const handleSelectDestination = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      if (!placesServiceRef.current) return;

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'name', 'formatted_address'],
        },
        (place, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            place?.geometry?.location
          ) {
            const newDest: Destination = {
              name:
                place.name || place.formatted_address || prediction.description,
              center: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              zoom: 8,
            };
            setDestination(newDest);
            saveDestination(newDest);
            // Clear trip when switching destinations
            setTripItems(new Map());
            setSelectedAsset(null);
            setSearchQuery('');
            setSearchResults([]);
            setShowSearch(false);
            // Pan the map
            mapRef.current?.panTo(newDest.center);
            mapRef.current?.setZoom(newDest.zoom);
          }
        },
      );
    },
    [],
  );

  // ---- TRIP MANAGEMENT ----

  const handleAddToTrip = useCallback(
    (asset: PlaceAsset) => {
      if (!tripItems.has(asset.id)) {
        const newItems = new Map(tripItems);
        newItems.set(asset.id, currentDay);
        setTripItems(newItems);
      }
    },
    [tripItems, currentDay],
  );

  const handleRemoveFromTrip = useCallback(
    (assetId: string) => {
      const newItems = new Map(tripItems);
      newItems.delete(assetId);
      setTripItems(newItems);
    },
    [tripItems],
  );

  const handleApplyTrip = useCallback(() => {
    setShowApplyModal(false);
    console.log(
      'Trip created:',
      Array.from(tripItems.entries()).map(([id, day]) => ({
        id,
        day,
        asset: allAssets.find((a) => a.id === id),
      })),
    );
  }, [tripItems, allAssets]);

  // ---- COMPUTED VALUES ----

  const filteredAssets = allAssets.filter(
    (a) => !filterType || a.type === filterType,
  );

  const tripAssetsData: TripItem[] = allAssets
    .filter((a) => tripItems.has(a.id))
    .map((a) => ({ ...a, day: tripItems.get(a.id) || 1 }));

  const tripAssetsByDay = tripAssetsData.reduce(
    (acc, asset) => {
      const d = asset.day;
      if (!acc[d]) acc[d] = [];
      acc[d].push(asset);
      return acc;
    },
    {} as Record<number, TripItem[]>,
  );

  const sortedDays = Object.keys(tripAssetsByDay).sort(
    (a, b) => Number(a) - Number(b),
  );

  // Build polyline path (sorted by day, then by insertion order)
  const tripPath = tripAssetsData
    .sort((a, b) => a.day - b.day)
    .map((a) => a.coordinates);

  const attractionCount = allAssets.filter((a) => a.type === 'attraction').length;
  const hotelCount = allAssets.filter((a) => a.type === 'hotel').length;
  const activityCount = allAssets.filter((a) => a.type === 'activity').length;

  // ---- LOADING / ERROR STATES ----

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to load Google Maps
          </h2>
          <p className="text-sm text-gray-600">
            Please check your API key and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 text-[#EC407A] animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading maps...</p>
        </div>
      </div>
    );
  }

  // ---- RENDER ----

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-gray-900">
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
            <button className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors">
              Demo
            </button>
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
          {/* Page Header with Destination Search */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-4xl font-bold text-gray-900">
                {destination.name} Trip
              </h1>
              {/* Destination Search Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Change Destination
                </button>

                {/* Search Dropdown */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50"
                    >
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search city or country..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC407A] focus:border-transparent"
                        autoFocus
                      />
                      {searchResults.length > 0 && (
                        <div className="mt-2 max-h-60 overflow-y-auto">
                          {searchResults.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              onClick={() =>
                                handleSelectDestination(prediction)
                              }
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#EC407A] rounded-lg transition-colors flex items-center gap-2"
                            >
                              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                              <span className="truncate">
                                {prediction.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{destination.name}</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>7 day itinerary</span>
              </div>
              {tripItems.size > 0 && (
                <>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <span className="px-3 py-1 bg-[#EC407A] text-white text-xs rounded-full font-medium">
                    {tripItems.size} Asset{tripItems.size > 1 ? 's' : ''} Added
                  </span>
                </>
              )}
            </div>

            {/* Loading indicator for places */}
            {loading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Loading places in {destination.name}...</span>
              </div>
            )}
          </div>

          {/* MAP-BASED TRIP PLANNER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Map + Itinerary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Day Switcher */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Select Day
                  </span>
                  <span className="text-xs text-gray-500">7 days</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const dayHasAssets = tripAssetsData.some(
                      (asset) => asset.day === day,
                    );
                    return (
                      <button
                        key={day}
                        onClick={() => setCurrentDay(day)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                          currentDay === day
                            ? 'bg-[#EC407A] text-white shadow-lg scale-105'
                            : dayHasAssets
                              ? 'bg-pink-50 text-[#EC407A] border-2 border-pink-200 hover:bg-pink-100'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Google Map */}
              <div
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 relative"
                style={{ height: '580px' }}
              >
                {/* Create Trip Button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="px-4 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Info className="w-4 h-4" />
                    Create a Trip
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
                      >
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          How to Plan Your Trip
                        </h4>
                        <ul className="text-xs text-gray-700 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              1
                            </span>
                            <span>
                              Click on any marker on the map to view details
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              2
                            </span>
                            <span>
                              Select a day, then add places to your trip
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              3
                            </span>
                            <span>
                              Review your itinerary below the map
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              4
                            </span>
                            <span>Click below to finalize your trip</span>
                          </li>
                        </ul>
                        <button
                          onClick={() => {
                            setShowInstructions(false);
                            setShowApplyModal(true);
                          }}
                          className="w-full mt-3 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-semibold"
                        >
                          Create a Trip
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Filter Badges - Top Left */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  {[
                    {
                      key: null,
                      label: 'All',
                      count: allAssets.length,
                    },
                    {
                      key: 'attraction',
                      label: 'Attractions',
                      count: attractionCount,
                    },
                    { key: 'hotel', label: 'Hotels', count: hotelCount },
                    {
                      key: 'activity',
                      label: 'Activities',
                      count: activityCount,
                    },
                  ].map((f) => (
                    <button
                      key={f.key || 'all'}
                      onClick={() =>
                        setFilterType(f.key === filterType ? null : f.key)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md ${
                        filterType === f.key
                          ? 'bg-[#EC407A] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>

                {/* The Map */}
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={destination.center}
                  zoom={destination.zoom}
                  onLoad={onMapLoad}
                  options={{
                    styles: MAP_STYLES,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                  }}
                >
                  {/* Place Markers */}
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    const isHovered = hoveredAsset === asset.id;
                    const isAdded = tripItems.has(asset.id);

                    return (
                      <MarkerF
                        key={asset.id}
                        position={asset.coordinates}
                        icon={createMarkerSvg(asset.type, {
                          isSelected,
                          isAdded,
                          isHovered,
                        })}
                        onClick={() => setSelectedAsset(asset)}
                        onMouseOver={() => setHoveredAsset(asset.id)}
                        onMouseOut={() => setHoveredAsset(null)}
                        zIndex={isSelected ? 1000 : isHovered ? 500 : isAdded ? 100 : 1}
                        animation={
                          isSelected
                            ? google.maps.Animation.BOUNCE
                            : undefined
                        }
                      />
                    );
                  })}

                  {/* Trip Route Polyline */}
                  {tripPath.length > 1 && (
                    <PolylineF
                      path={tripPath}
                      options={{
                        strokeColor: '#EC407A',
                        strokeWeight: 3,
                        strokeOpacity: 0.8,
                        geodesic: true,
                        icons: [
                          {
                            icon: {
                              path: 'M 0,-1 0,1',
                              strokeOpacity: 1,
                              scale: 3,
                            },
                            offset: '0',
                            repeat: '15px',
                          },
                        ],
                      }}
                    />
                  )}

                  {/* InfoWindow for hovered marker */}
                  {hoveredAsset && !selectedAsset && (() => {
                    const asset = allAssets.find(a => a.id === hoveredAsset);
                    if (!asset) return null;
                    return (
                      <InfoWindowF
                        position={asset.coordinates}
                        options={{ pixelOffset: new google.maps.Size(0, -45), disableAutoPan: true }}
                        onCloseClick={() => setHoveredAsset(null)}
                      >
                        <div className="p-1">
                          <p className="text-xs font-semibold text-gray-900">{asset.name}</p>
                          {asset.rating > 0 && (
                            <p className="text-xs text-gray-500">★ {asset.rating}</p>
                          )}
                        </div>
                      </InfoWindowF>
                    );
                  })()}
                </GoogleMap>

                {/* Loading overlay on map */}
                {loading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-[5]">
                    <div className="bg-white rounded-xl px-6 py-4 shadow-lg flex items-center gap-3">
                      <Loader className="w-5 h-5 text-[#EC407A] animate-spin" />
                      <span className="text-sm font-medium text-gray-700">
                        Loading {destination.name} places...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trip Itinerary Below Map */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Trip Itinerary
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {tripItems.size === 0
                          ? 'Add assets to build your trip'
                          : `${sortedDays.length} day${sortedDays.length > 1 ? 's' : ''} • ${tripItems.size} stop${tripItems.size > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                {tripItems.size === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <MapIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      No assets added yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Click markers on the map, then add them to your trip
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    {sortedDays.map((day) => {
                      const dayAssets = tripAssetsByDay[Number(day)];
                      return (
                        <div key={day} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#EC407A]" />
                              <h4 className="text-sm font-bold text-gray-900">
                                Day {day}
                              </h4>
                            </div>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>

                          <div className="space-y-2 pl-6">
                            {dayAssets.map((asset, idx) => (
                              <motion.div
                                key={asset.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group border border-gray-200"
                              >
                                <img
                                  src={asset.image}
                                  alt={asset.name}
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                    {asset.name}
                                  </h4>
                                  <p className="text-xs text-gray-600 mb-2">
                                    {asset.location}
                                  </p>
                                  <CategoryBadge type={asset.type} />
                                </div>
                                <button
                                  onClick={() =>
                                    handleRemoveFromTrip(asset.id)
                                  }
                                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-gray-200 shadow-sm"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Selected Asset Detail Card */}
              {selectedAsset && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                  style={{
                    height: '580px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div className="relative flex-shrink-0">
                    {selectedAsset.image ? (
                      <img
                        src={selectedAsset.image}
                        alt={selectedAsset.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedAsset(null)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {selectedAsset.name}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedAsset.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <CategoryBadge type={selectedAsset.type} />
                    </div>

                    {selectedAsset.rating > 0 && (
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold">
                            {selectedAsset.rating}
                          </span>
                        </div>
                        {selectedAsset.reviews > 0 && (
                          <span className="text-gray-600">
                            ({selectedAsset.reviews.toLocaleString()} reviews)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Day Selector for Adding */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Add to Day
                      </h4>
                      <div className="flex gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <button
                            key={day}
                            onClick={() => setCurrentDay(day)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                              currentDay === day
                                ? 'bg-[#EC407A] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add to Trip Button */}
                    <div className="mb-4">
                      {!tripItems.has(selectedAsset.id) ? (
                        <button
                          onClick={() => handleAddToTrip(selectedAsset)}
                          className="w-full px-4 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Day {currentDay}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleRemoveFromTrip(selectedAsset.id)
                          }
                          className="w-full px-4 py-3 bg-white text-[#EC407A] rounded-full hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 font-semibold border-2 border-[#EC407A]"
                        >
                          <Check className="w-4 h-4" />
                          Added to Day{' '}
                          {tripItems.get(selectedAsset.id)}
                        </button>
                      )}
                    </div>

                    {/* Google Place Link */}
                    {selectedAsset.googlePlaceId && (
                      <a
                        href={`https://www.google.com/maps/place/?q=place_id:${selectedAsset.googlePlaceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#EC407A] hover:underline flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3" />
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Assets List */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {selectedAsset ? 'Nearby Places' : 'Available Assets'}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {attractionCount} attractions • {hotelCount} hotels •{' '}
                    {activityCount} activities
                  </p>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <Loader className="w-6 h-6 text-[#EC407A] animate-spin mx-auto mb-3" />
                      <p className="text-xs text-gray-500">
                        Loading places...
                      </p>
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="p-8 text-center">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-xs text-gray-500">
                        No places found. Try changing the destination.
                      </p>
                    </div>
                  ) : (
                    filteredAssets.slice(0, 20).map((asset) => {
                      const isAdded = tripItems.has(asset.id);
                      return (
                        <motion.div
                          key={asset.id}
                          whileHover={{ y: -2 }}
                          onClick={() => {
                            setSelectedAsset(asset);
                            mapRef.current?.panTo(asset.coordinates);
                          }}
                          onMouseEnter={() => setHoveredAsset(asset.id)}
                          onMouseLeave={() => setHoveredAsset(null)}
                          className={`bg-white border rounded-lg overflow-hidden hover:border-[#EC407A] transition-all cursor-pointer ${
                            selectedAsset?.id === asset.id
                              ? 'border-[#EC407A] ring-2 ring-pink-200'
                              : 'border-gray-200'
                          } ${isAdded ? 'ring-2 ring-pink-200' : ''}`}
                        >
                          <div className="flex gap-3 p-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                              {asset.image ? (
                                <img
                                  src={asset.image}
                                  alt={asset.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                  <Camera className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              {isAdded && (
                                <div className="absolute inset-0 bg-[#EC407A]/20 flex items-center justify-center">
                                  <div className="w-5 h-5 bg-[#EC407A] rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                                {asset.name}
                              </h4>
                              <p className="text-xs text-gray-600 truncate mb-2">
                                {asset.location}
                              </p>
                              <div className="flex items-center gap-2">
                                <CategoryBadge type={asset.type} />
                                {asset.rating > 0 && (
                                  <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {asset.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Apply Trip Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <ApplyTripModal
            tripAssets={tripAssetsData}
            onClose={() => setShowApplyModal(false)}
            onConfirm={handleApplyTrip}
          />
        )}
      </AnimatePresence>
    </div>
  );
};