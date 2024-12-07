import React, { useState } from "react";
import {
	View,
	TextInput,
	ScrollView,
	Text,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import * as Location from "expo-location";

interface ExtendedLocation extends Location.LocationGeocodedLocation {
	city?: string | null;
	region?: string | null;
	postalCode?: string | null;
	country?: string | null;
}

interface AutocompleteProps {
	placeholder?: string;
	icon?: JSX.Element;
	onSelect: (location: string) => void;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
	placeholder = "Search location",
	icon,
	onSelect,
}) => {
	const [searchText, setSearchText] = useState("");
	const [searchResults, setSearchResults] = useState<ExtendedLocation[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	const handleLocationSearch = async (text: string) => {
		setSearchText(text);

		if (text.length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		try {
			const results = await Location.geocodeAsync(text);

			const detailedResults = await Promise.all(
				results.map(async (result) => {
					const address = await Location.reverseGeocodeAsync({
						latitude: result.latitude,
						longitude: result.longitude,
					});
					return {
						city: address[0]?.city || null,
						region: address[0]?.region || null,
						postalCode: address[0]?.postalCode || null,
						country: address[0]?.country || null,
						latitude: result.latitude,
						longitude: result.longitude,
					};
				})
			);

			const filteredResults = detailedResults.filter(
				(result) => result.city || result.region
			);

			setSearchResults(filteredResults.slice(0, 10)); // Limit to 10 results
		} catch (error) {
			console.error("Error fetching locations:", error);
		} finally {
			setIsSearching(false);
		}
	};

	const handleSelect = (result: ExtendedLocation) => {
		const address = `${result.city || "City"}, ${result.region || "State"}, ${
			result.country || "Country"
		}`.trim();
		setSearchText(address);
		setSearchResults([]);
		onSelect(address);
	};

	const fetchUserLocation = async () => {
		try {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				alert("Permission to access location was denied");
				return;
			}

			let currentLocation = await Location.getCurrentPositionAsync({});
			let result = await Location.reverseGeocodeAsync({
				latitude: currentLocation.coords.latitude,
				longitude: currentLocation.coords.longitude,
			});

			if (result.length > 0) {
				const address = result[0];
				const locationString = `${address.city || "City"}, ${
					address.region || "State"
				}, ${address.country || "Country"}`.trim();
				setSearchText(locationString);
				setSearchResults([]);
				onSelect(locationString);
			}
		} catch (error) {
			console.error("Error getting location:", error);
			alert("Error getting location. Please try again.");
		}
	};

	return (
		<View>
			<View style={styles.inputContainer}>
				<TextInput
					style={styles.input}
					placeholder={placeholder}
					placeholderTextColor="rgba(0, 0, 0, 0.4)"
					value={searchText}
					onChangeText={handleLocationSearch}
				/>
				{icon && (
					<TouchableOpacity style={styles.icon} onPress={fetchUserLocation}>
						{icon}
					</TouchableOpacity>
				)}
			</View>
			{isSearching && <Text style={styles.loadingText}>Searching...</Text>}
			{searchResults.length > 0 && (
				<ScrollView style={styles.dropdown}>
					{searchResults.map((result, index) => (
						<TouchableOpacity
							key={index}
							style={[
								styles.resultItem,
								index === searchResults.length - 1 && styles.lastResultItem,
							]}
							onPress={() => handleSelect(result)}
						>
							<Text style={styles.resultCity}>
								{result.city || "City"}, {result.region || "State"},{" "}
								{result.country || "Country"}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(0, 0, 0, 0.2)",
		borderRadius: 11,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		paddingHorizontal: 14,
		height: 48,
		zIndex: 1000, // Ensure dropdown stays on top
	},
	input: {
		flex: 1,
		fontSize: 18,
		color: "rgba(0, 0, 0, 0.85)",
	},
	icon: {
		marginLeft: 8,
	},
	dropdown: {
		marginTop: 8,
		borderRadius: 11,
		backgroundColor: "#fff",
		borderWidth: 1,
		borderColor: "rgba(0, 0, 0, 0.1)",
		paddingVertical: 8,
		maxHeight: 200,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 2,
		zIndex: 999, // Show above other components
	},
	resultItem: {
		width: 299,
		height: 23,
		paddingVertical: 0,
		paddingHorizontal: 14,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0, 0, 0, 0.1)",
	},
	lastResultItem: {
		borderBottomWidth: 0,
	},
	resultCity: {
		fontFamily: "Avenir",
		fontWeight: "400",
		fontSize: 18,
		lineHeight: 23.4,
		color: "#000000",
	},
	loadingText: {
		marginTop: 8,
		fontSize: 14,
		color: "rgba(0, 0, 0, 0.6)",
		textAlign: "center",
	},
});

export default Autocomplete;
