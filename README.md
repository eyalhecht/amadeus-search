# Amadeus Flight Search

A Node.js application to search for flights using the Amadeus API.

## Features

- Search for round-trip flights between Tel Aviv (TLV) and Berlin (BER)
- Display detailed flight information including:
  - Price and currency
  - Flight numbers and carriers
  - Departure and arrival times
  - Flight duration
  - Available seats
  - Cabin class

## Prerequisites

- Node.js (v12 or higher)
- Amadeus API credentials (API Key and Secret)

## Installation

1. Clone or download this project

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your Amadeus credentials:
   
   **Option 1: Direct method (quick testing)**
   - Edit `amadeus-flight-search.js`
   - Replace `'YOUR_AMADEUS_API_KEY'` with your actual API key
   - Replace `'YOUR_AMADEUS_API_SECRET'` with your actual API secret

   **Option 2: Environment variables (recommended)**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your credentials:
     ```
     AMADEUS_CLIENT_ID=your_amadeus_api_key_here
     AMADEUS_CLIENT_SECRET=your_amadeus_api_secret_here
     ```
   - Run the environment-based version:
     ```bash
     node amadeus-flight-search-env.js
     ```

## Usage

Run the application:

```bash
# If using direct credentials in the file:
npm start
# or
node amadeus-flight-search.js

# If using environment variables:
node amadeus-flight-search-env.js
```

## Configuration

You can modify the search parameters in the `searchParams` object:

- `originLocationCode`: Origin airport IATA code (default: 'TLV')
- `destinationLocationCode`: Destination airport IATA code (default: 'BER')
- `departureDate`: Outbound date in YYYY-MM-DD format (default: '2025-05-28')
- `returnDate`: Return date in YYYY-MM-DD format (default: '2025-06-03')
- `adults`: Number of adult passengers (default: 1)
- `travelClass`: Cabin class - ECONOMY, PREMIUM_ECONOMY, BUSINESS, or FIRST (default: 'ECONOMY')
- `nonStop`: Set to true for direct flights only (default: false)
- `currencyCode`: Currency for prices (default: 'EUR')
- `max`: Maximum number of results to return (default: 10)

## Getting Amadeus API Credentials

1. Sign up for a free account at [Amadeus for Developers](https://developers.amadeus.com)
2. Create a new app in your dashboard
3. Copy your API Key and API Secret
4. Use these credentials in the application

## Output

The application will display:
- Total number of flight offers found
- For each flight offer:
  - Price in the specified currency
  - Number of available seats
  - Detailed outbound journey information
  - Detailed return journey information
  - Flight segments with times, duration, and cabin class

## Error Handling

The application includes error handling for:
- Missing API credentials
- Network errors
- API response errors
- No flights found scenarios

## License

ISC
