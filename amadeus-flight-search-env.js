require('dotenv').config();
const Amadeus = require('amadeus');

// Initialize Amadeus client with credentials from environment variables
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Flight search parameters
const searchParams = {
  originLocationCode: 'TLV',
  destinationLocationCode: 'BER',
  departureDate: '2025-05-28',
  returnDate: '2025-06-03',
  adults: 1,
  travelClass: 'ECONOMY', // Options: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  nonStop: false,
  currencyCode: 'EUR',
  max: 100 // Maximum number of results
};

// Function to format duration from ISO 8601 to readable format
function formatDuration(isoDuration) {
  const matches = isoDuration.match(/PT(\d+H)?(\d+M)?/);
  if (!matches) return isoDuration;
  
  const hours = matches[1] ? parseInt(matches[1]) : 0;
  const minutes = matches[2] ? parseInt(matches[2]) : 0;
  
  return `${hours}h ${minutes}m`;
}

// Function to search for flights
async function searchFlights() {
  try {
    console.log('🔍 Searching for flights from TLV to BER...\n');
    console.log(`📅 Outbound: ${searchParams.departureDate}`);
    console.log(`📅 Return: ${searchParams.returnDate}`);
    console.log(`👤 Passengers: ${searchParams.adults} adult(s)\n`);

    const response = await amadeus.shopping.flightOffersSearch.get(searchParams);

    if (response.data && response.data.length > 0) {
      console.log(`✈️  Found ${response.data.length} flight offers:\n`);
      
      response.data.forEach((offer, index) => {
        console.log(`${'═'.repeat(60)}`);
        console.log(`✈️  Flight Offer ${index + 1}`);
        console.log(`${'═'.repeat(60)}`);
        console.log(`💰 Price: ${offer.price.currency} ${offer.price.total}`);
        console.log(`🪑 Available seats: ${offer.numberOfBookableSeats}`);
        
        // Outbound journey
        console.log('\n🛫 OUTBOUND JOURNEY:');
        const outboundDuration = offer.itineraries[0].duration;
        console.log(`⏱️  Total duration: ${formatDuration(outboundDuration)}`);
        
        offer.itineraries[0].segments.forEach((segment, segIndex) => {
          const departure = new Date(segment.departure.at);
          const arrival = new Date(segment.arrival.at);
          console.log(`\n  Flight ${segIndex + 1}:`);
          console.log(`    ✈️  ${segment.carrierCode} ${segment.number}`);
          console.log(`    📍 ${segment.departure.iataCode} → ${segment.arrival.iataCode}`);
          console.log(`    🕐 Departure: ${departure.toLocaleString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`);
          console.log(`    🕐 Arrival: ${arrival.toLocaleString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`);
          console.log(`    ⏱️  Duration: ${formatDuration(segment.duration)}`);
          console.log(`    🪑 Cabin: ${segment.cabin || 'N/A'}`);
        });
        
        // Return journey
        if (offer.itineraries[1]) {
          console.log('\n🛬 RETURN JOURNEY:');
          const returnDuration = offer.itineraries[1].duration;
          console.log(`⏱️  Total duration: ${formatDuration(returnDuration)}`);
          
          offer.itineraries[1].segments.forEach((segment, segIndex) => {
            const departure = new Date(segment.departure.at);
            const arrival = new Date(segment.arrival.at);
            console.log(`\n  Flight ${segIndex + 1}:`);
            console.log(`    ✈️  ${segment.carrierCode} ${segment.number}`);
            console.log(`    📍 ${segment.departure.iataCode} → ${segment.arrival.iataCode}`);
            console.log(`    🕐 Departure: ${departure.toLocaleString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`);
            console.log(`    🕐 Arrival: ${arrival.toLocaleString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`);
            console.log(`    ⏱️  Duration: ${formatDuration(segment.duration)}`);
            console.log(`    🪑 Cabin: ${segment.cabin || 'N/A'}`);
          });
        }
        
        console.log('\n');
      });
    } else {
      console.log('❌ No flights found for the specified criteria.');
    }
  } catch (error) {
    console.error('❌ Error searching for flights:', error.message);
    if (error.response && error.response.body) {
      console.error('API Error Details:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

// Check if credentials are set
if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
  console.error('❌ Error: Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in your .env file');
  console.log('💡 Tip: Copy .env.example to .env and add your credentials');
  process.exit(1);
}

// Run the search
searchFlights();
