import * as React from "react";
import {
	Image,
	StyleSheet,
	Text,
	View,
	TextInput,
	Pressable,
	TouchableWithoutFeedback,
	Keyboard,
	ScrollView,
	Animated,
	SafeAreaView,
	TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import Toggle from "../../../../components/common/Toggle";
import CustomSlider from "../../../../components/common/Slider";
import QuestionnaireHeader from "../../../../components/headers/QuestionnaireHeader";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import Svg, { Path } from "react-native-svg";
import * as Location from "expo-location";
import { useDispatch } from "react-redux";
import { setLocationPreferences } from "../../../../store/slices/profileSlice";
import { LocationGeocodedLocation } from "expo-location";
import Autocomplete from "../../../../components/common/Autocomplete";

// Interface for extended location data including city, region, and postal code
interface ExtendedLocation extends LocationGeocodedLocation {
	city?: string;
	region?: string;

	postalCode?: string;
}

// SVG icon component for location marker
const locationIcon = (
	<Svg width="27" height="28" viewBox="0 0 27 28" fill="none">
		<Path
			d="M13.6472 27.1514V25.1182C10.8514 24.8463 8.54313 23.7663 6.7225 21.8783C4.90097 19.9893 3.85958 17.5951 3.59834 14.6957H1.63635V13.3041H3.59834C3.85958 10.4047 4.90097 8.01098 6.7225 6.12291C8.54403 4.23485 10.8523 3.15489 13.6472 2.88305V0.848389H14.9892V2.88305C17.785 3.15396 20.0932 4.23392 21.9138 6.12291C23.7345 8.0119 24.7763 10.4056 25.0393 13.3041H27V14.6957H25.0393C24.7772 17.5951 23.7358 19.9888 21.9152 21.8769C20.0937 23.7659 17.785 24.8463 14.9892 25.1182V27.1514H13.6472ZM14.3182 23.7418C16.9127 23.7418 19.127 22.7908 20.961 20.8888C22.7951 18.9868 23.7121 16.6905 23.7121 13.9999C23.7121 11.3093 22.7951 9.013 20.961 7.11101C19.127 5.20903 16.9127 4.25804 14.3182 4.25804C11.7237 4.25804 9.50937 5.20903 7.67531 7.11101C5.84126 9.013 4.92423 11.3093 4.92423 13.9999C4.92423 16.6905 5.84126 18.9868 7.67531 20.8888C9.50937 22.7908 11.7237 23.7418 14.3182 23.7418ZM14.3182 18.175C13.2115 18.175 12.2636 17.7663 11.4745 16.9489C10.6854 16.1315 10.2913 15.1485 10.2922 13.9999C10.2931 12.8513 10.6872 11.8683 11.4745 11.0509C12.2618 10.2335 13.2097 9.82482 14.3182 9.82482C15.4267 9.82482 16.3745 10.2335 17.1618 11.0509C17.9492 11.8683 18.3432 12.8513 18.3441 13.9999C18.345 15.1485 17.9509 16.1315 17.1618 16.9489C16.3728 17.7663 15.4249 18.175 14.3182 18.175Z"
			fill="black"
		/>
	</Svg>
);

const Frame = () => {
	// State management for form fields and UI controls
	const router = useRouter();
	const [location, setLocation] = useState(""); // Stores selected location text
	const [locationTypes, setLocationTypes] = useState<
		("onsite" | "remote" | "hybrid")[]
	>([]); // Work type preferences
	const [isRelocating, setIsRelocating] = useState(false); // Toggle for relocation preference
	const slideAnimation = React.useRef(new Animated.Value(0)).current; // Animation for toggle switch
	const [commuteDistance, setCommuteDistance] = useState(0); // Maximum commute distance in miles
	const { firstName } = useSelector((state: RootState) => state.profile);
	const dispatch = useDispatch();

	// State for location search functionality
	const [searchResults, setSearchResults] = useState<ExtendedLocation[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Validates if form can be submitted
	const isFormComplete = () => {
		return location.trim().length > 0 && locationTypes.length > 0;
	};

	// Handles the relocation toggle animation and state
	const toggleSwitch = () => {
		const toValue = isRelocating ? 0 : 1;
		Animated.spring(slideAnimation, {
			toValue,
			useNativeDriver: true,
			speed: 20,
			bounciness: 0,
		}).start();
		setIsRelocating(!isRelocating);
	};

	// Gets user's current location using device GPS
	const getLocation = async () => {
		try {
			// Request location permissions
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				alert("Permission to access location was denied");
				return;
			}

			// Get current coordinates and convert to address
			let currentLocation = await Location.getCurrentPositionAsync({});
			let result = await Location.reverseGeocodeAsync({
				latitude: currentLocation.coords.latitude,
				longitude: currentLocation.coords.longitude,
			});

			if (result.length > 0) {
				const address = result[0];
				setLocation(`${address.city || ""} ${address.postalCode || ""}`.trim());
			}
		} catch (error) {
			console.error("Error getting location:", error);
			alert("Error getting location. Please try again.");
		}
	};

	// Handles location search as user types
	const handleLocationSearch = async (searchText: string) => {
		setLocation(searchText);

		// Don't search for very short inputs
		if (searchText.length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		try {
			// Search for locations matching input
			const results = await Location.geocodeAsync(searchText);
			if (results.length > 0) {
				// Get detailed address info for each result
				const detailedResults: ExtendedLocation[] = await Promise.all(
					results.map(async (result) => {
						const address = await Location.reverseGeocodeAsync({
							latitude: result.latitude,
							longitude: result.longitude,
						});
						return {
							...result,
							city: address[0]?.city || "",
							region: address[0]?.region || "",
							postalCode: address[0]?.postalCode || "",
						};
					})
				);
				setSearchResults(detailedResults);
			}
		} catch (error) {
			console.error("Location search error:", error);
		} finally {
			setIsSearching(false);
		}
	};

	// Handles selection from search results dropdown
	const handleLocationSelect = (result: ExtendedLocation) => {
		const addressText =
			`${result.city} ${result.region} ${result.postalCode}`.trim();
		setLocation(addressText);
		setSearchResults([]);
	};

	// Saves form data to Redux store and navigates to next screen
	const handleContinue = () => {
		dispatch(
			setLocationPreferences({
				location,
				workTypePreferences: locationTypes,
				maxCommuteDistance: commuteDistance,
				isOpenToRelocating: isRelocating,
			})
		);
		router.push("/CreateProfile3");
	};

	return (
		<SafeAreaView style={styles.container}>
			<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
				<View style={{ flex: 1 }}>
					<View style={styles.questionnaireHeader}>
						<QuestionnaireHeader
							currentStep={2}
							totalSteps={6}
							workspaceText="Select your location"
							headerText={`Welcome, ${firstName}!`}
							showSubHeaderText={true}
							subHeaderText="Select your location preferences to work where you thrive."
							onBackPress={() => router.back()}
							onClosePress={() => router.push("/NextSteps")}
							backOpacity={1}
						/>
					</View>
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollViewContent}
					>
						<View
							style={[styles.textInputFieldParent, styles.slider1SpaceBlock]}
						>
							<View style={styles.textInputField}>
								<Text style={[styles.fieldLabel, styles.fieldLabelTypo]}>
									Location
								</Text>
								<Autocomplete
									placeholder="City or ZIP code"
									icon={locationIcon}
									onSelect={(selectedLocation) => {
										setLocation(selectedLocation);
										setSearchResults([]);
									}}
								/>
							</View>

							{/* next section*/}

							<View style={styles.sliderSpaceBlock}>
								<Text style={[styles.fieldLabel, styles.fieldLabelTypo]}>
									Work type preference
								</Text>
								<View style={styles.iconButtonParent}>
									<Pressable
										onPress={() => {
											if (locationTypes.includes("onsite")) {
												setLocationTypes(
													locationTypes.filter((type) => type !== "onsite")
												);
											} else {
												setLocationTypes([...locationTypes, "onsite"]);
											}
										}}
										style={[
											styles.iconLayout,
											locationTypes.includes("onsite")
												? styles.iconButton
												: styles.iconButton1,
										]}
									>
										<Image
											style={styles.binocularsIcon}
											resizeMode="cover"
											source={require("../../../../assets/Office.png")}
										/>
										<Text style={[styles.buttonText, styles.buttonTypo]}>
											Onsite
										</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											if (locationTypes.includes("remote")) {
												setLocationTypes(
													locationTypes.filter((type) => type !== "remote")
												);
											} else {
												setLocationTypes([...locationTypes, "remote"]);
											}
										}}
										style={[
											styles.iconLayout,
											locationTypes.includes("remote")
												? styles.iconButton
												: styles.iconButton1,
											styles.marginLeft12,
										]}
									>
										<Image
											style={styles.binocularsIcon}
											resizeMode="cover"
											source={require("../../../../assets/House.png")}
										/>
										<Text style={[styles.buttonText, styles.buttonTypo]}>
											Remote
										</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											if (locationTypes.includes("hybrid")) {
												setLocationTypes(
													locationTypes.filter((type) => type !== "hybrid")
												);
											} else {
												setLocationTypes([...locationTypes, "hybrid"]);
											}
										}}
										style={[
											styles.iconLayout,
											locationTypes.includes("hybrid")
												? styles.iconButton
												: styles.iconButton1,
											styles.marginLeft12,
										]}
									>
										<Image
											style={styles.binocularsIcon}
											resizeMode="cover"
											source={require("../../../../assets/Binoculars.png")}
										/>
										<Text style={[styles.buttonText, styles.buttonTypo]}>
											Hybrid
										</Text>
									</Pressable>
								</View>
							</View>

							{/*  location slider*/}
							<View style={[styles.slider, styles.sliderSpaceBlock]}>
								<Text style={[styles.fieldLabel, styles.fieldLabelTypo]}>
									Maximum commute distance
								</Text>
								<View style={styles.sliderMargin}>
									<CustomSlider
										value={commuteDistance}
										onValueChange={setCommuteDistance}
										minValue={0}
										maxValue={100}
										step={1}
										label="miles"
									/>
								</View>
								<Toggle
									label="I'm open to relocating"
									isEnabled={isRelocating}
									onValueChange={toggleSwitch}
								/>
							</View>
						</View>
					</ScrollView>
					<View style={[styles.frameContainer, styles.slider1SpaceBlock]}>
						<View style={[styles.buttonWrapper, styles.buttonWrapperFlexBox]}>
							<Pressable
								style={[
									styles.button,
									!isFormComplete() && styles.buttonDisabled,
								]}
								disabled={!isFormComplete()}
								onPress={handleContinue}
							>
								<Text
									style={[
										styles.buttonText3,
										styles.buttonTypo,
										!isFormComplete() && styles.buttonTextDisabled,
									]}
								>
									Continue
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</TouchableWithoutFeedback>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	textTypo: {
		textAlign: "center",
		fontFamily: "Avenir",
		fontSize: 16,
	},
	iconLayout1: {
		height: 28,
		width: 28,
		overflow: "hidden",
	},
	childLayout: {
		borderRadius: 100,
		overflow: "hidden",
	},
	slider1SpaceBlock: {
		marginTop: 10,
		alignSelf: "stretch",
	},
	fieldLabelTypo: {
		fontFamily: "Avenir",
		textAlign: "left",
	},
	textSpaceBlock: {
		marginTop: 4,
		alignSelf: "stretch",
	},
	iconLayout: {
		padding: 12,
		height: 110,
		borderRadius: 25,
		borderWidth: 1,
		borderStyle: "solid",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(255, 255, 255, 0.70)",
		overflow: "hidden",
		flex: 1,
	},
	buttonTypo: {
		fontWeight: "800",
		textAlign: "center",
		fontFamily: "Avenir",
	},
	sliderSpaceBlock: {
		marginTop: 24,
		alignSelf: "stretch",
	},
	sliderFlexBox: {
		paddingBottom: 9,
		justifyContent: "flex-end",
		flex: 1,
	},
	frameLayout: {
		height: 5,
		alignSelf: "stretch",
		overflow: "hidden",
	},
	frameGroupSpaceBlock: {
		marginLeft: -1,
		alignSelf: "stretch",
	},
	textBorder: {
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "rgba(0, 0, 0, 0.2)",
		overflow: "hidden",
	},
	buttonBg: {
		backgroundColor: "#01815b",
		borderRadius: 100,
	},
	buttonWrapperFlexBox: {
		justifyContent: "flex-end",
		alignSelf: "stretch",
		alignItems: "center",
	},
	createNewWorkspace: {
		display: "flex",
		marginLeft: 28,
		color: "rgba(0, 0, 0, 0.65)",
		justifyContent: "center",
		alignSelf: "stretch",
		alignItems: "center",
		flex: 1,
	},
	tablerxIcon: {
		marginLeft: 28,
	},
	tablerchevronRightParent: {
		flexDirection: "row",
		justifyContent: "center",
		alignSelf: "stretch",
		alignItems: "center",
	},
	frameWrapper: {
		justifyContent: "center",
		alignSelf: "stretch",
	},
	progressBarChild: {
		backgroundColor: "#df79bf",
		alignSelf: "stretch",
		flex: 1,
	},
	progressBarItem: {
		marginLeft: 4,
		backgroundColor: "rgba(0, 0, 0, 0.1)",
		alignSelf: "stretch",
		flex: 1,
	},
	progressBar: {
		height: 6,
		marginTop: 12,
		flexDirection: "row",
		alignSelf: "stretch",
		overflow: "hidden",
	},
	frameParent: {
		alignSelf: "stretch",
		alignItems: "center",
	},
	questionAboutThe: {
		fontSize: 26,
		fontWeight: "500",
		fontFamily: "Rubik-Medium",
		textAlign: "left",
		color: "rgba(0, 0, 0, 0.85)",
		alignSelf: "stretch",
	},
	selectYourLocation: {
		fontSize: 18,
		textAlign: "left",
		color: "rgba(0, 0, 0, 0.65)",
		fontFamily: "Avenir",
	},
	questionnaireHeader: {
		paddingHorizontal: 20,
		alignItems: "center",
	},
	fieldLabel: {
		fontSize: 18,
		textAlign: "left",
		color: "rgba(0, 0, 0, 0.85)",
		alignSelf: "stretch",
	},
	placeholder: {
		color: "rgba(0, 0, 0, 0)",
		fontSize: 18,
		textAlign: "left",
		overflow: "hidden",
		flex: 1,
	},
	textBox: {
		borderRadius: 11,
		backgroundColor: "rgba(255, 255, 255, 0.7)",
		paddingHorizontal: 14,
		height: 48,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "rgba(0, 0, 0, 0.2)",
		overflow: "hidden",
		paddingVertical: 0,
	},
	textInputField: {
		alignSelf: "stretch",
	},
	binocularsIcon: {
		width: 40,
		height: 40,
	},
	buttonText: {
		marginTop: 4,
		alignSelf: "stretch",
		fontSize: 18,
		color: "rgba(0, 0, 0, 0.65)",
	},
	iconButton: {
		backgroundColor: "#dbf6da",
		borderColor: "#66be89",
	},
	iconButton1: {
		borderColor: "rgba(0, 0, 0, 0.2)",
	},
	iconButtonParent: {
		marginTop: 8,
		flexDirection: "row",
		alignSelf: "stretch",
	},
	frameChild: {
		borderTopLeftRadius: 100,
		borderBottomLeftRadius: 100,
		backgroundColor: "#66be89",
	},
	sliderInner: {
		alignSelf: "stretch",
	},
	text: {
		color: "rgba(0, 0, 0, 0.85)",
	},
	textWrapper: {
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 3,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
	},
	frameItem: {
		height: 24,
		marginTop: 7,
		width: 24,
		overflow: "hidden",
	},
	frameGroup: {
		width: 60,
		alignItems: "center",
	},
	frameInner: {
		borderTopRightRadius: 100,
		borderBottomRightRadius: 100,
		backgroundColor: "rgba(0, 0, 0, 0.1)",
	},
	sliderChild: {
		paddingBottom: 9,
		justifyContent: "flex-end",
		flex: 1,
	},
	slider1: {
		height: 59,
		alignItems: "flex-end",
		flexDirection: "row",
		justifyContent: "center",
	},
	slider: {
		justifyContent: "center",
	},
	frameChild1: {
		width: 21,
		height: 21,
		backgroundColor: "#fffbef",
	},
	toggleInner: {
		backgroundColor: "rgba(0, 0, 0, 0.2)",
		width: 42,
		padding: 2,
		flexDirection: "row",
		alignItems: "center",
	},
	toggleText: {
		marginLeft: 16,
		textAlign: "left",
		color: "rgba(0, 0, 0, 0.85)",
		fontSize: 18,
		fontFamily: "Avenir",
	},
	toggle: {
		flexDirection: "row",
		alignItems: "center",
	},
	textInputFieldParent: {
		paddingVertical: 0,
		paddingHorizontal: 20,
	},
	buttonText3: {
		fontSize: 20,
		fontWeight: "800",
		color: "#fffbef",
		textAlign: "center",
		fontFamily: "Avenir",
	},
	buttonDisabled: {
		backgroundColor: "rgba(1, 129, 91, 0.5)",
	},
	buttonTextDisabled: {
		color: "rgba(255, 251, 239, 0.7)",
	},
	button: {
		height: 48,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "stretch",
		backgroundColor: "#01815b",
		borderRadius: 100,
	},
	buttonWrapper: {
		paddingHorizontal: 16,
		paddingBottom: 20,
		flex: 1,
	},
	iphoneBottomHandleChild: {
		backgroundColor: "#000",
		width: 120,

		height: 4,
	},
	iphoneBottomHandle: {
		height: 30,
		paddingHorizontal: 10,
		paddingBottom: 10,
	},
	frameContainer: {
		flex: 1,
	},
	container: {
		flex: 1,
		backgroundColor: "#fffbef",
	},
	marginLeft12: {
		marginLeft: 12,
	},
	toggleContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginLeft: 12, // Added margin to create some space from the label
	},
	scrollView: {
		flex: 0,
	},
	scrollViewContent: {
		paddingBottom: 10,
	},
	toggleInnerActive: {
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	sliderMargin: {
		marginTop: 8,
	},
	searchDropdown: {
		position: "absolute",
		top: "100%",
		left: 0,
		right: 0,
		backgroundColor: "white",
		borderRadius: 8,
		marginTop: 4,
		maxHeight: 200,
		zIndex: 1000,
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	searchResults: {
		flex: 1,
	},
	searchResultItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0, 0, 0, 0.1)",
	},
	searchResultText: {
		fontSize: 16,
		color: "rgba(0, 0, 0, 0.85)",
		fontFamily: "Avenir",
	},
});

export default Frame;