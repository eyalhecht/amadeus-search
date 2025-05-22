const axios = require('axios');

class AmadeusFlightSearch {
    constructor(apiKey, apiSecret, isTestEnvironment = false) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.baseURL = isTestEnvironment ? 'https://test.api.amadeus.com' : 'https://api.amadeus.com';
        this.isTest = isTestEnvironment;
    }

    // Get access token
    async getAccessToken() {
        console.log(`Attempting authentication with ${this.isTest ? 'TEST' : 'PRODUCTION'} environment`);
        console.log(`URL: ${this.baseURL}/v1/security/oauth2/token`);
        console.log(`API Key: ${this.apiKey.substring(0, 8)}...`);

        try {
            const response = await axios.post(`${this.baseURL}/v1/security/oauth2/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.apiKey,
                    client_secret: this.apiSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Token expires in 30 minutes, set expiry time
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('✓ Token received successfully');
            return this.accessToken;
        } catch (error) {
            console.log('❌ Authentication failed');
            console.log('Status:', error.response?.status);
            console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
            throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
        }
    }

    // Check if token is valid
    async ensureValidToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            await this.getAccessToken();
        }
    }

    // Search for flights
    async searchFlights(searchParams) {
        await this.ensureValidToken();

        const {
            originLocationCode,
            destinationLocationCode,
            departureDate,
            returnDate,
            adults = 1,
            children = 0,
            infants = 0,
            travelClass = 'ECONOMY',
            includedAirlineCodes,
            excludedAirlineCodes,
            nonStop,
            currencyCode = 'EUR',
            maxPrice,
            max = 10
        } = searchParams;

        // Build query parameters
        const params = new URLSearchParams({
            originLocationCode,
            destinationLocationCode,
            departureDate,
            adults: adults.toString()
        });

        // Add optional parameters
        if (returnDate) params.append('returnDate', returnDate);
        if (children > 0) params.append('children', children.toString());
        if (infants > 0) params.append('infants', infants.toString());
        if (travelClass) params.append('travelClass', travelClass);
        if (includedAirlineCodes) params.append('includedAirlineCodes', includedAirlineCodes);
        if (excludedAirlineCodes) params.append('excludedAirlineCodes', excludedAirlineCodes);
        if (nonStop) params.append('nonStop', nonStop.toString());
        if (currencyCode) params.append('currencyCode', currencyCode);
        if (maxPrice) params.append('maxPrice', maxPrice.toString());
        if (max) params.append('max', max.toString());

        try {
            const response = await axios.get(`${this.baseURL}/v2/shopping/flight-offers?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Flight search failed: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
        }
    }

    // Format flight details for easier reading
    formatFlightDetails(flightData) {
        if (!flightData.data || flightData.data.length === 0) {
            return { message: 'No flights found', flights: [] };
        }

        const flights = flightData.data.map((offer, index) => {
            return {
                id: offer.id,
                price: {
                    total: offer.price.total,
                    currency: offer.price.currency,
                    base: offer.price.base
                },
                outbound: this.formatItinerary(offer.itineraries[0], flightData.dictionaries),
                return: offer.itineraries[1] ? this.formatItinerary(offer.itineraries[1], flightData.dictionaries) : null,
                validatingAirline: flightData.dictionaries.carriers[offer.validatingAirlineCodes[0]],
                bookableSeats: offer.numberOfBookableSeats,
                lastTicketingDate: offer.lastTicketingDate
            };
        });

        return {
            totalResults: flightData.meta.count,
            flights: flights
        };
    }

    // Format individual itinerary
    formatItinerary(itinerary, dictionaries) {
        return {
            duration: itinerary.duration,
            segments: itinerary.segments.map(segment => ({
                departure: {
                    airport: segment.departure.iataCode,
                    terminal: segment.departure.terminal,
                    time: segment.departure.at,
                    city: dictionaries.locations[segment.departure.iataCode]?.cityCode,
                    country: dictionaries.locations[segment.departure.iataCode]?.countryCode
                },
                arrival: {
                    airport: segment.arrival.iataCode,
                    terminal: segment.arrival.terminal,
                    time: segment.arrival.at,
                    city: dictionaries.locations[segment.arrival.iataCode]?.cityCode,
                    country: dictionaries.locations[segment.arrival.iataCode]?.countryCode
                },
                airline: {
                    code: segment.carrierCode,
                    name: dictionaries.carriers[segment.carrierCode]
                },
                flightNumber: segment.number,
                aircraft: {
                    code: segment.aircraft.code,
                    name: dictionaries.aircraft[segment.aircraft.code]
                },
                duration: segment.duration,
                stops: segment.numberOfStops
            }))
        };
    }

    // Filter flights by time constraints
    filterFlightsByTime(flights, constraints) {
        const {
            minDepartureTime, // "17:00" format
            maxArrivalTime,   // "08:00" format
            departureDate,    // "2025-05-28" format
            arrivalDate       // "2025-06-04" format
        } = constraints;

        return flights.filter(flight => {
            let meetsCriteria = true;

            // Check outbound departure time
            if (minDepartureTime && flight.outbound?.segments?.[0]) {
                const depTime = new Date(flight.outbound.segments[0].departure.time);
                const depTimeStr = depTime.toTimeString().substring(0, 5); // "HH:MM"
                if (depTimeStr < minDepartureTime) {
                    meetsCriteria = false;
                }
            }

            // Check return arrival time and date
            if (maxArrivalTime && arrivalDate && flight.return?.segments) {
                const lastSegment = flight.return.segments[flight.return.segments.length - 1];
                const arrTime = new Date(lastSegment.arrival.time);
                const arrDateStr = arrTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
                const arrTimeStr = arrTime.toTimeString().substring(0, 5); // "HH:MM"

                // Must arrive before maxArrivalTime on arrivalDate or earlier
                if (arrDateStr > arrivalDate || (arrDateStr === arrivalDate && arrTimeStr >= maxArrivalTime)) {
                    meetsCriteria = false;
                }
            }

            return meetsCriteria;
        });
    }
}

// Example usage function
async function searchTelAvivBerlinFlights() {
    // Replace with your actual API credentials
    const API_KEY = 'hWI62YL2jSXaZyH7SjBW0aEddoYoqPyU';
    const API_SECRET = 'PiD83YndfGKgQPdT';

    const flightSearch = new AmadeusFlightSearch(API_KEY, API_SECRET);

    try {
        console.log('Searching for flights...');

        // Search parameters
        const searchParams = {
            originLocationCode: 'TLV',
            destinationLocationCode: 'BER',
            departureDate: '2025-05-28',
            returnDate: '2025-06-03',
            adults: 1,
            travelClass: 'ECONOMY',
            max: 15
        };

        // Get flight data
        const rawFlightData = await flightSearch.searchFlights(searchParams);
        const formattedFlights = flightSearch.formatFlightDetails(rawFlightData);

        console.log(`Found ${formattedFlights.totalResults} flights`);

        // Filter flights by your time constraints
        const timeConstraints = {
            minDepartureTime: '17:00',  // Must depart after 5 PM
            maxArrivalTime: '08:00',    // Must arrive before 8 AM
            arrivalDate: '2025-06-04'   // On June 4th
        };

        const validFlights = flightSearch.filterFlightsByTime(formattedFlights.flights, timeConstraints);

        console.log(`\nFlights meeting your time requirements: ${validFlights.length}`);

        // Display valid flights
        validFlights.forEach((flight, index) => {
            console.log(`\n--- Flight Option ${index + 1} ---`);
            console.log(`Price: ${flight.price.total} ${flight.price.currency}`);
            console.log(`Airline: ${flight.validatingAirline}`);

            console.log('\nOutbound:');
            flight.outbound.segments.forEach((segment, i) => {
                console.log(`  ${i + 1}. ${segment.departure.airport} ${segment.departure.time} → ${segment.arrival.airport} ${segment.arrival.time}`);
                console.log(`     ${segment.airline.name} ${segment.flightNumber} (${segment.aircraft.name})`);
            });

            if (flight.return) {
                console.log('\nReturn:');
                flight.return.segments.forEach((segment, i) => {
                    console.log(`  ${i + 1}. ${segment.departure.airport} ${segment.departure.time} → ${segment.arrival.airport} ${segment.arrival.time}`);
                    console.log(`     ${segment.airline.name} ${segment.flightNumber} (${segment.aircraft.name})`);
                });
            }
        });

        // Also search excluding Aegean Airlines
        console.log('\n\n=== Searching other carriers (excluding Aegean) ===');

        const searchParamsExcludeAegean = {
            ...searchParams,
            excludedAirlineCodes: 'A3'
        };

        const otherCarriersData = await flightSearch.searchFlights(searchParamsExcludeAegean);
        const otherCarriersFormatted = flightSearch.formatFlightDetails(otherCarriersData);
        const otherValidFlights = flightSearch.filterFlightsByTime(otherCarriersFormatted.flights, timeConstraints);

        console.log(`Found ${otherValidFlights.length} additional flights from other carriers`);

        otherValidFlights.forEach((flight, index) => {
            console.log(`\n--- Other Carrier Option ${index + 1} ---`);
            console.log(`Price: ${flight.price.total} ${flight.price.currency}`);
            console.log(`Airline: ${flight.validatingAirline}`);
            // Add similar detailed output as above if needed
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Export the class for use in other modules
module.exports = AmadeusFlightSearch;

// Run the example if this file is executed directly
if (require.main === module) {
    searchTelAvivBerlinFlights();
}