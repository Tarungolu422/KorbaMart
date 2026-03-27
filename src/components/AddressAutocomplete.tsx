import React from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { MapPin, Search, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }) => void;
  placeholder?: string;
  defaultValue?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
  onAddressSelect, 
  placeholder = "Search for your address...",
  defaultValue = ""
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      locationBias: { radius: 10000, center: { lat: 22.3595, lng: 82.7501 } }, // Bias towards Korba
      componentRestrictions: { country: "in" },
    },
    debounce: 300,
    defaultValue,
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect(description, { lat, lng });
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-stone-900"
        />
        {!ready && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          </div>
        )}
      </div>

      {status === "OK" && (
        <ul className="absolute z-[100] w-full mt-2 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-stone-100">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-all flex items-center space-x-3 text-sm text-stone-700"
            >
              <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span className="truncate">{description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
