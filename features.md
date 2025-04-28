# Stock Watcher Features

## Core Features

### Stock Tracking
- Search for stocks by symbol or company name
- View detailed stock information including price, change percentage, volume, and market cap
- Support for simulated stock data with realistic pricing and movements
- Auto-refreshing data (every 5 minutes) to keep prices current

### Watchlist Management
- Add stocks to your personal watchlist for quick access
- Remove stocks from watchlist
- Persistent watchlist storage using AsyncStorage
- Default watchlist with popular stocks (AAPL, MSFT, GOOGL, AMZN, META)
- Events system to notify components about watchlist changes

### User Interface
- Clean, modern UI design
- Dark mode support with automatic theme detection
- iOS-specific optimizations:
  - Tab bar with blur effect
  - SFSymbols for icons
  - Haptic feedback on tab selection
- Custom themed components for consistent styling

## Screens

### Watchlist Screen
- Display all saved stocks with current prices and performance
- Each stock shows symbol, name, current price, and change percentage
- Color-coded price changes (green for positive, red for negative)
- Pull-to-refresh functionality to update stock data
- Empty state with guidance when watchlist is empty

### Explore Screen
- Search interface for finding new stocks
- Real-time search results as you type
- Detailed stock card view with comprehensive information
- One-touch "Add to Watchlist" functionality
- Clear user feedback via alerts when adding stocks

### Settings Screen
- Toggle between real and dummy data providers
- Tiingo API key configuration for live market data
- Instructions for obtaining API credentials
- Persistent settings storage

## Technical Features

### Data Management
- Modular services architecture (StockService, SettingsService)
- Multiple data provider options:
  - Dummy provider with simulated stock data
  - Tiingo API integration for real market data (when configured)
- AsyncStorage for persistent data storage
- Event emitter system for cross-component communication

### UI Components
- `StockCard`: Detailed view of stock information
- `StockListItem`: Compact list view of stock information
- `StockSearch`: Search interface with real-time results
- `ThemedText` and `ThemedView`: Theme-aware base components
- `HapticTab`: Enhanced tab bar with haptic feedback
- Custom icons with platform-specific implementation

### Navigation
- Tab-based navigation using Expo Router
- Stack navigation for future detail screens
- Deep linking support through Expo's URL scheme

### Styling and Theming
- Consistent color scheme defined in constants
- Dynamic theme switching (light/dark) based on system preference
- Platform-specific UI optimizations
- Custom font loading

## Available Mock Stocks
- AAPL (Apple Inc.)
- MSFT (Microsoft Corporation)
- GOOGL (Alphabet Inc.)
- AMZN (Amazon.com, Inc.)
- META (Meta Platforms, Inc.)
- TSLA (Tesla, Inc.)
- NVDA (NVIDIA Corporation)
- NFLX (Netflix, Inc.)
- JPM (JPMorgan Chase & Co.)
- V (Visa Inc.)

## Extended Features

### StockService Capabilities
- Stock search by name or symbol
- Individual stock quotes with comprehensive data
- Batch quote retrieval for efficient watchlist updates
- Market data formatting and normalization

### Platform Support
- iOS
- Android
- Web

### Performance Optimizations
- Efficient data loading with loading indicators
- Minimal re-renders with state management
- Automated cleanup of event listeners
