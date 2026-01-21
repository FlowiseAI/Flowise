# Infrastructure Map Feature

## Overview

The Infrastructure Map is an interactive mapping application that visualizes military bases and critical infrastructure across the United States. This tool is designed for data center and power generation site analysis.

## Features

- **Interactive Map**: Built with React-Leaflet and OpenStreetMap
- **Multiple Infrastructure Layers**:
  - Military Bases (Air Force, Army, Navy, Marine Corps)
  - Power Plants (Nuclear, Fossil Fuel, Hydroelectric, Wind, Solar)
  - Electrical Substations (High-voltage transmission)
  - Natural Gas Infrastructure (Hubs and Pipelines)
  - Water Supply Infrastructure (Aqueducts and water systems)
  - Potential Data Center Sites (Pre-analyzed optimal locations)

- **Layer Controls**: Toggle visibility of different infrastructure types
- **Color-Coded Markers**: Each category has a distinct color for easy identification
- **Interactive Popups**: Click on markers to view detailed information
- **Side Panel Details**: Selected feature details displayed in dedicated panel
- **Legend**: Visual guide to marker colors and categories

## Data Context

All data is provided in the context of:
- Data center site selection
- Power generation facility planning
- Infrastructure proximity analysis
- Land availability assessment
- Utility access evaluation

## File Structure

```
src/
├── views/
│   └── infrastructuremap/
│       ├── index.jsx          # Main map component
│       └── README.md          # This file
├── data/
│   └── infrastructureData.js  # Static infrastructure data
└── api/
    └── infrastructure.js      # API module for data access
```

## Usage

Navigate to `/infrastructure` route to access the map. Use the layer controls on the left to toggle different infrastructure types on and off.

## Data Sources

Current implementation uses static data for demonstration purposes. Data includes:
- 14 major military installations
- 5 major power generation facilities
- 3 electrical substations
- 3 gas infrastructure points
- 3 water infrastructure systems
- 3 potential data center sites

## Future Enhancements

- Real-time data integration from government APIs
- Advanced filtering and search capabilities
- Distance calculations and proximity analysis
- Export functionality for reports
- Integration with ML models for site optimization
- Historical data and trend analysis

## Technical Details

- **Framework**: React 18
- **Mapping Library**: React-Leaflet 4.2.1 with Leaflet 1.9.4
- **UI Components**: Material-UI (MUI) v5
- **Map Tiles**: OpenStreetMap
- **Data Format**: GeoJSON-compatible coordinate arrays

## Dependencies

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1"
}
```

## Notes

- Map center defaults to center of continental United States (39.8283°N, 98.5795°W)
- Zoom level starts at 5 for country-wide view
- All coordinates use [latitude, longitude] format
- Power capacities in MW (megawatts)
- Land areas in square miles
