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
  ChevronLeft,
  ChevronRight,
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
  photos: string[];
  rating: number;
  reviews: number;
  status: 'available' | 'not-signed';
  allotmentType: 'pre-approved' | 'on-request' | 'not-partner';
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

// Circular markers matching original style: all pink for partners, gray for not-signed
const createMarkerSvg = (
  type: string,
  opts: { isSelected?: boolean; isAdded?: boolean; isHovered?: boolean; isNotPartner?: boolean } = {},
) => {
  const { isSelected, isAdded, isHovered, isNotPartner } = opts;
  const size = isSelected || isHovered ? 48 : 40;
  const r = size / 2 - 4; // radius for inner circle
  const cx = size / 2;
  const cy = size / 2;
  const color = isNotPartner ? '#9CA3AF' : '#EC407A';

  // Simple recognizable icon shapes (white, centered in circle)
  let iconSvg = '';
  const iconScale = size * 0.012;
  const iconTx = cx - 12 * iconScale;
  const iconTy = cy - 12 * iconScale;
  const iconG = `transform="translate(${iconTx},${iconTy}) scale(${iconScale})" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;

  if (type === 'hotel') {
    // Building icon (Hotel from lucide)
    iconSvg = `<g ${iconG}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></g>`;
  } else if (type === 'car') {
    // Car icon
    iconSvg = `<g ${iconG}><path d="M19 17H5V13l2-6h10l2 6v4z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/><path d="M5 13h14"/></g>`;
  } else if (type === 'attraction') {
    // Camera icon
    iconSvg = `<g ${iconG}><path d="M14.5 4h-5L7.5 2h-3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.5L14.5 4z"/><circle cx="12" cy="11" r="4"/></g>`;
  } else {
    // Mountain icon (activity)
    iconSvg = `<g ${iconG}><path d="M2 20L9 6l4 8 3-4 6 10H2z"/></g>`;
  }

  // Checkmark badge when added to trip
  let badge = '';
  if (isAdded) {
    badge = `<circle cx="${size - 7}" cy="7" r="7" fill="#EC407A" stroke="white" stroke-width="2.5"/><path d="M${size - 10} 7l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Ring effect when added
  let ring = '';
  if (isAdded) {
    ring = `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="#EC407A" stroke-width="3" opacity="0.5"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 10}" height="${size + 10}" viewBox="-5 -5 ${size + 10} ${size + 10}">
    <defs><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter></defs>
    ${ring}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="white" stroke-width="4" filter="url(#s)"/>
    ${iconSvg}
    ${badge}
  </svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size + 10, size + 10),
    anchor: new google.maps.Point((size + 10) / 2, (size + 10) / 2),
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
      bg: 'bg-pink-50 text-pink-600 border-pink-200',
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

const StatusBadge = ({
  status,
  allotmentType,
}: {
  status: string;
  allotmentType?: string;
}) => {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EC407A] text-white">
        <CheckCircle2 className="w-3 h-3" />
        {allotmentType === 'pre-approved' ? 'Pre-Approved' : 'On Request'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <AlertCircle className="w-3 h-3" />
      Not on Platform
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
  const notSignedAssets = tripAssets.filter((a) => a.status === 'not-signed');
  const availableAssets = tripAssets.filter((a) => a.status === 'available');

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
              Review your trip and confirm. AI agents will contact non-partner suppliers automatically.
            </p>
          </div>
        </div>

        {/* Available Assets Summary */}
        {availableAssets.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#EC407A]" />
              Ready to Book ({availableAssets.length})
            </h4>
            <div className="space-y-2">
              {availableAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200"
                >
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-12 h-12 rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-600">{asset.location}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#EC407A]">
                    {(asset as any).value || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not Signed Assets - Will be AI Requested */}
        {notSignedAssets.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              AI Agent Will Contact ({notSignedAssets.length})
            </h4>
            <div className="space-y-2">
              {notSignedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-12 h-12 rounded object-cover grayscale"
                    onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-600">{asset.location}</p>
                  </div>
                  <span className="text-xs text-gray-700 font-medium">
                    AI Request
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What Happens Next */}
        {notSignedAssets.length > 0 && (
          <div className="bg-pink-50 rounded-lg p-4 mb-6 border border-pink-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#EC407A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  What happens next?
                </p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>
                    • AI agents automatically contact {notSignedAssets.length} non-partner supplier{notSignedAssets.length > 1 ? 's' : ''}
                  </li>
                  <li>• Suppliers learn about AirMango and your creator profile</li>
                  <li>• You'll receive notifications when they respond (24-48h typical)</li>
                  <li>• Available assets will be booked immediately</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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

  // Route
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);

  // Image carousel
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // ---- PLACES FETCHING ----

  const normalizePlace = useCallback(
    (place: google.maps.places.PlaceResult, type: PlaceAsset['type']): PlaceAsset => {
      // Randomly assign allotment mode for demo
      const rand = Math.random();
      let allotmentType: PlaceAsset['allotmentType'];
      let status: PlaceAsset['status'];
      if (rand < 0.4) {
        allotmentType = 'pre-approved';
        status = 'available';
      } else if (rand < 0.7) {
        allotmentType = 'on-request';
        status = 'available';
      } else {
        allotmentType = 'not-partner';
        status = 'not-signed';
      }

      // Collect all available photos
      const photos: string[] = [];
      if (place.photos) {
        place.photos.forEach((photo) => {
          photos.push(photo.getUrl({ maxWidth: 800, maxHeight: 500 }));
        });
      }

      return {
        id: place.place_id || `place-${Math.random().toString(36).slice(2)}`,
        type,
        name: place.name || 'Unknown Place',
        location: place.formatted_address || place.vicinity || '',
        coordinates: {
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
        },
        image: photos[0] || '',
        photos,
        rating: place.rating || 0,
        reviews: place.user_ratings_total || 0,
        status,
        allotmentType,
        googlePlaceId: place.place_id || '',
      };
    },
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

    const handleResults = (type: PlaceAsset['type']) => {
      const handler = (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus,
        pagination: google.maps.places.PlaceSearchPagination | null,
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.forEach((r) => {
            if (r.geometry?.location) {
              allResults.push(normalizePlace(r, type));
            }
          });
          // Fetch next page if available (up to 60 per category)
          if (pagination?.hasNextPage) {
            setTimeout(() => pagination.nextPage(), 300);
            return; // Don't call checkComplete yet
          }
        }
        checkComplete();
      };
      return handler;
    };

    // 1. Tourist attractions
    service.textSearch(
      { query: `top tourist attractions in ${destination.name}` },
      handleResults('attraction') as any,
    );

    // 2. Hotels & accommodations
    service.textSearch(
      { query: `best hotels and accommodations in ${destination.name}` },
      handleResults('hotel') as any,
    );

    // 3. Tours & activities
    service.textSearch(
      { query: `tours and activities in ${destination.name}` },
      handleResults('activity') as any,
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
          types: ['geocode'],
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
            // Detect if it's a country-level result → wider zoom
            if (place.types?.includes('country')) {
              newDest.zoom = 5;
            } else if (place.types?.includes('administrative_area_level_1')) {
              newDest.zoom = 6;
            }
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

  // Compute road-based route via Directions API
  useEffect(() => {
    if (tripPath.length < 2 || !isLoaded) {
      setRoutePath([]);
      return;
    }
    const directionsService = new google.maps.DirectionsService();
    const origin = tripPath[0];
    const destination = tripPath[tripPath.length - 1];
    const waypoints = tripPath.slice(1, -1).map((pt) => ({
      location: pt,
      stopover: true,
    }));
    // Google limits to 25 waypoints
    const limitedWaypoints = waypoints.slice(0, 23);

    directionsService.route(
      {
        origin,
        destination,
        waypoints: limitedWaypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        console.log('[Directions API] Status:', status);
        if (status === google.maps.DirectionsStatus.OK && result) {
          const points: google.maps.LatLngLiteral[] = [];
          result.routes[0]?.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              step.path.forEach((pt) => {
                points.push({ lat: pt.lat(), lng: pt.lng() });
              });
            });
          });
          console.log('[Directions API] Got', points.length, 'route points');
          setRoutePath(points);
        } else {
          console.warn('[Directions API] Failed:', status, '- Enable "Directions API" in Google Cloud Console if you see NOT_FOUND or REQUEST_DENIED');
          // Fallback to straight line
          setRoutePath(tripPath);
        }
      },
    );
  }, [tripPath.length, isLoaded, JSON.stringify(tripPath)]);

  // Reset carousel when selecting different asset
  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedAsset?.id]);

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
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${currentDay === day
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
                {/* Create Trip Button with Instructions Dropdown */}
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
                              Click on any marker on the map to view asset details
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              2
                            </span>
                            <span>
                              Add assets to your trip - pink markers are partners, gray ones trigger AI outreach
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              3
                            </span>
                            <span>
                              Review your complete itinerary below the map
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-pink-50 text-[#EC407A] rounded-full flex items-center justify-center text-xs font-bold">
                              4
                            </span>
                            <span>
                              Finalize your trip - AI agents contact non-partners automatically
                            </span>
                          </li>
                        </ul>
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
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md ${filterType === f.key
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
                          isNotPartner: asset.status === 'not-signed',
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

                  {/* Trip Route Polyline (road-based) */}
                  {routePath.length > 1 && (
                    <PolylineF
                      path={routePath}
                      options={{
                        strokeColor: '#EC407A',
                        strokeWeight: 4,
                        strokeOpacity: 0.9,
                        geodesic: false,
                        icons: [
                          {
                            icon: {
                              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                              strokeOpacity: 1,
                              scale: 3,
                              fillColor: '#EC407A',
                              fillOpacity: 1,
                            },
                            offset: '50%',
                            repeat: '150px',
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
                                  className={`w-16 h-16 rounded-lg object-cover flex-shrink-0 ${asset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`}
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                    {asset.name}
                                  </h4>
                                  <p className="text-xs text-gray-600 mb-2">
                                    {asset.location}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CategoryBadge type={asset.type} />
                                    <StatusBadge status={asset.status} allotmentType={asset.allotmentType} />
                                  </div>
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
                    {selectedAsset.photos && selectedAsset.photos.length > 0 ? (
                      <div className="relative w-full h-48 overflow-hidden">
                        <div
                          className="flex transition-transform duration-300 ease-in-out h-full"
                          style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                        >
                          {selectedAsset.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`${selectedAsset.name} ${idx + 1}`}
                              className={`w-full h-48 object-cover flex-shrink-0 ${selectedAsset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`}
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.display = 'none';
                              }}
                            />
                          ))}
                        </div>
                        {/* Carousel Controls */}
                        {selectedAsset.photos.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCarouselIndex(Math.max(0, carouselIndex - 1)); }}
                              className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all ${carouselIndex === 0 ? 'opacity-30' : 'opacity-100'}`}
                              disabled={carouselIndex === 0}
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCarouselIndex(Math.min(selectedAsset.photos.length - 1, carouselIndex + 1)); }}
                              className={`absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all ${carouselIndex >= selectedAsset.photos.length - 1 ? 'opacity-30' : 'opacity-100'}`}
                              disabled={carouselIndex >= selectedAsset.photos.length - 1}
                            >
                              <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                            {/* Dot Indicators */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                              {selectedAsset.photos.slice(0, 10).map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }}
                                  className={`w-2 h-2 rounded-full transition-all ${idx === carouselIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : selectedAsset.image ? (
                      <img
                        src={selectedAsset.image}
                        alt={selectedAsset.name}
                        className={`w-full h-48 object-cover ${selectedAsset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                        }}
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
                      <StatusBadge status={selectedAsset.status} allotmentType={selectedAsset.allotmentType} />
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
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${currentDay === day
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

                    {/* Not a partner yet - Info Box */}
                    {selectedAsset.status === 'not-signed' && (
                      <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-[#EC407A] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 mb-1">
                              Not a partner yet
                            </p>
                            <p className="text-xs text-gray-700">
                              Add to trip &amp; our AI agent will contact them about this request. We will let you know if they join
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                    filteredAssets.map((asset) => {
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
                          className={`bg-white border rounded-lg overflow-hidden hover:border-[#EC407A] transition-all cursor-pointer ${selectedAsset?.id === asset.id
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
                                  className={`w-full h-full object-cover ${asset.status === 'not-signed' ? 'grayscale opacity-70' : ''}`}
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                  }}
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <CategoryBadge type={asset.type} />
                                <StatusBadge status={asset.status} allotmentType={asset.allotmentType} />
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