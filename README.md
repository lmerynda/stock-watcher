# Stock Watcher

A React Native mobile app for tracking stock prices and managing your personal watchlist.

## Features

- Search for stocks by symbol or company name
- View simulated stock data including price, change, and volume
- Add stocks to your personal watchlist
- Auto-refreshing data to keep prices current
- Clean, modern UI with dark mode support

## Technologies Used

- React Native with Expo
- Mock stock data with simulated price movements
- AsyncStorage for persisting watchlist data
- React Navigation for tab-based navigation

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Follow the instructions in the terminal to run the app on your preferred platform (iOS, Android, or web)

## Screens

- **Watchlist**: View your saved stocks with current prices and performance
- **Explore**: Search for new stocks and add them to your watchlist

## Demo Mode

This app uses simulated stock data rather than live API calls. This is because the Yahoo Finance API has CORS restrictions that prevent it from being used directly in browser/mobile environments.

Available mock stocks in the demo:
- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Alphabet)
- AMZN (Amazon)
- META (Meta Platforms)
- TSLA (Tesla)
- NVDA (NVIDIA)
- NFLX (Netflix)
- JPM (JPMorgan Chase)
- V (Visa)

## License

This project is MIT licensed.
