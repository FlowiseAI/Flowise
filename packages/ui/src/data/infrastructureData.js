// Infrastructure data for military bases and utilities in the United States
// Data context: for siting data centers and power generation facilities

export const militaryBases = [
    // Major Air Force Bases
    {
        id: 'afb-1',
        name: 'Edwards Air Force Base',
        type: 'military',
        category: 'Air Force Base',
        coordinates: [34.9054, -117.8837],
        state: 'California',
        landArea: 470.5, // square miles
        powerCapacity: 150, // MW
        waterAccess: 'Limited',
        notes: 'Large test facility, desert location, excellent for renewable energy'
    },
    {
        id: 'afb-2',
        name: 'Nellis Air Force Base',
        type: 'military',
        category: 'Air Force Base',
        coordinates: [36.2361, -115.0342],
        state: 'Nevada',
        landArea: 14.0,
        powerCapacity: 120,
        waterAccess: 'Moderate',
        notes: 'Near Las Vegas, good power infrastructure'
    },
    {
        id: 'afb-3',
        name: 'Wright-Patterson Air Force Base',
        type: 'military',
        category: 'Air Force Base',
        coordinates: [39.8261, -84.0483],
        state: 'Ohio',
        landArea: 12.7,
        powerCapacity: 200,
        waterAccess: 'High',
        notes: 'Major research center, excellent infrastructure'
    },
    {
        id: 'afb-4',
        name: 'Travis Air Force Base',
        type: 'military',
        category: 'Air Force Base',
        coordinates: [38.2627, -121.9272],
        state: 'California',
        landArea: 10.5,
        powerCapacity: 180,
        waterAccess: 'High',
        notes: 'Northern California, good fiber connectivity'
    },
    // Army Bases
    {
        id: 'army-1',
        name: 'Fort Bragg (Fort Liberty)',
        type: 'military',
        category: 'Army Base',
        coordinates: [35.1391, -79.0061],
        state: 'North Carolina',
        landArea: 251.0,
        powerCapacity: 250,
        waterAccess: 'High',
        notes: 'Largest military installation by population'
    },
    {
        id: 'army-2',
        name: 'Fort Hood',
        type: 'military',
        category: 'Army Base',
        coordinates: [31.1350, -97.7759],
        state: 'Texas',
        landArea: 339.7,
        powerCapacity: 300,
        waterAccess: 'Moderate',
        notes: 'Large land area, Texas power grid access'
    },
    {
        id: 'army-3',
        name: 'Fort Campbell',
        type: 'military',
        category: 'Army Base',
        coordinates: [36.6584, -87.4886],
        state: 'Kentucky/Tennessee',
        landArea: 164.0,
        powerCapacity: 200,
        waterAccess: 'High',
        notes: 'Straddles state border, good infrastructure'
    },
    {
        id: 'army-4',
        name: 'Fort Benning',
        type: 'military',
        category: 'Army Base',
        coordinates: [32.3557, -84.8897],
        state: 'Georgia',
        landArea: 285.0,
        powerCapacity: 220,
        waterAccess: 'High',
        notes: 'Large training facility'
    },
    // Naval Bases
    {
        id: 'navy-1',
        name: 'Naval Base San Diego',
        type: 'military',
        category: 'Naval Base',
        coordinates: [32.6761, -117.1273],
        state: 'California',
        landArea: 5.7,
        powerCapacity: 180,
        waterAccess: 'Seawater',
        notes: 'Pacific coast, cooling water available'
    },
    {
        id: 'navy-2',
        name: 'Naval Station Norfolk',
        type: 'military',
        category: 'Naval Base',
        coordinates: [36.9465, -76.3288],
        state: 'Virginia',
        landArea: 8.0,
        powerCapacity: 200,
        waterAccess: 'Seawater',
        notes: 'Largest naval base in the world, Atlantic coast'
    },
    {
        id: 'navy-3',
        name: 'Naval Air Station Pensacola',
        type: 'military',
        category: 'Naval Base',
        coordinates: [30.3528, -87.3086],
        state: 'Florida',
        landArea: 8.4,
        powerCapacity: 150,
        waterAccess: 'Seawater',
        notes: 'Gulf coast location'
    },
    // Marine Corps Bases
    {
        id: 'mc-1',
        name: 'Marine Corps Base Camp Pendleton',
        type: 'military',
        category: 'Marine Corps Base',
        coordinates: [33.3815, -117.3144],
        state: 'California',
        landArea: 200.0,
        powerCapacity: 180,
        waterAccess: 'Seawater',
        notes: 'Southern California, large land area'
    },
    {
        id: 'mc-2',
        name: 'Marine Corps Base Camp Lejeune',
        type: 'military',
        category: 'Marine Corps Base',
        coordinates: [34.6700, -77.3458],
        state: 'North Carolina',
        landArea: 240.0,
        powerCapacity: 160,
        waterAccess: 'Seawater',
        notes: 'Atlantic coast, large facility'
    }
]

export const powerPlants = [
    {
        id: 'power-1',
        name: 'Palo Verde Nuclear Generating Station',
        type: 'infrastructure',
        category: 'Nuclear Power',
        coordinates: [33.3883, -112.8614],
        state: 'Arizona',
        capacity: 3937, // MW
        fuelType: 'Nuclear',
        notes: 'Largest nuclear plant in US, near Phoenix'
    },
    {
        id: 'power-2',
        name: 'W.A. Parish Electric Generating Station',
        type: 'infrastructure',
        category: 'Fossil Fuel Power',
        coordinates: [29.4856, -95.6383],
        state: 'Texas',
        capacity: 3653,
        fuelType: 'Natural Gas/Coal',
        notes: 'Near Houston, major capacity'
    },
    {
        id: 'power-3',
        name: 'Grand Coulee Dam',
        type: 'infrastructure',
        category: 'Hydroelectric Power',
        coordinates: [47.9552, -118.9811],
        state: 'Washington',
        capacity: 6809,
        fuelType: 'Hydroelectric',
        notes: 'Largest US hydroelectric facility'
    },
    {
        id: 'power-4',
        name: 'Alta Wind Energy Center',
        type: 'infrastructure',
        category: 'Wind Power',
        coordinates: [34.6041, -118.2736],
        state: 'California',
        capacity: 1548,
        fuelType: 'Wind',
        notes: 'Major wind farm'
    },
    {
        id: 'power-5',
        name: 'Solar Star',
        type: 'infrastructure',
        category: 'Solar Power',
        coordinates: [34.9394, -119.8861],
        state: 'California',
        capacity: 579,
        fuelType: 'Solar',
        notes: 'Large solar facility'
    }
]

export const electricalSubstations = [
    {
        id: 'sub-1',
        name: 'Malin Substation',
        type: 'infrastructure',
        category: 'Electrical Substation',
        coordinates: [42.0067, -121.4067],
        state: 'Oregon',
        voltage: 500, // kV
        notes: 'Major Pacific Intertie hub'
    },
    {
        id: 'sub-2',
        name: 'Adelanto Substation',
        type: 'infrastructure',
        category: 'Electrical Substation',
        coordinates: [34.5828, -117.4094],
        state: 'California',
        voltage: 500,
        notes: 'High desert location, near major transmission lines'
    },
    {
        id: 'sub-3',
        name: 'Alturas Substation',
        type: 'infrastructure',
        category: 'Electrical Substation',
        coordinates: [41.4871, -120.5436],
        state: 'California',
        voltage: 500,
        notes: 'Northern California grid connection'
    }
]

export const gasInfrastructure = [
    {
        id: 'gas-1',
        name: 'Henry Hub',
        type: 'infrastructure',
        category: 'Natural Gas Hub',
        coordinates: [29.9647, -92.7564],
        state: 'Louisiana',
        capacity: 1800000, // MMcf/day
        notes: 'Major natural gas pricing point and distribution hub'
    },
    {
        id: 'gas-2',
        name: 'Transco Pipeline',
        type: 'infrastructure',
        category: 'Gas Pipeline',
        coordinates: [32.7767, -96.7970], // Dallas area
        state: 'Texas',
        notes: 'Major interstate natural gas pipeline'
    },
    {
        id: 'gas-3',
        name: 'Texas Eastern Pipeline',
        type: 'infrastructure',
        category: 'Gas Pipeline',
        coordinates: [40.7128, -74.0060], // NYC area endpoint
        state: 'New York',
        notes: 'Major gas pipeline serving Northeast'
    }
]

export const waterInfrastructure = [
    {
        id: 'water-1',
        name: 'Colorado River Aqueduct',
        type: 'infrastructure',
        category: 'Water Supply',
        coordinates: [33.9425, -114.6239],
        state: 'California/Arizona',
        capacity: 1600, // cubic feet per second
        notes: 'Major water supply for Southern California'
    },
    {
        id: 'water-2',
        name: 'California Aqueduct',
        type: 'infrastructure',
        category: 'Water Supply',
        coordinates: [35.3733, -119.0187],
        state: 'California',
        capacity: 4600,
        notes: 'State Water Project main conveyance'
    },
    {
        id: 'water-3',
        name: 'Central Arizona Project',
        type: 'infrastructure',
        category: 'Water Supply',
        coordinates: [33.4484, -112.0740],
        state: 'Arizona',
        capacity: 3000,
        notes: 'Major water supply for Phoenix and Tucson'
    }
]

// Data center optimal site scores
export const dataCenterSites = [
    {
        id: 'site-1',
        name: 'Potential Site: Northern Virginia',
        type: 'potential-site',
        category: 'Data Center Site',
        coordinates: [38.9072, -77.0369],
        state: 'Virginia',
        score: 95,
        powerAvailability: 'Excellent',
        waterAvailability: 'Good',
        fiberConnectivity: 'Excellent',
        nearbyMilitary: 'Pentagon, Naval Station Norfolk',
        notes: 'Existing data center hub, excellent infrastructure'
    },
    {
        id: 'site-2',
        name: 'Potential Site: Dallas-Fort Worth',
        type: 'potential-site',
        category: 'Data Center Site',
        coordinates: [32.7767, -96.7970],
        state: 'Texas',
        score: 90,
        powerAvailability: 'Excellent',
        waterAvailability: 'Moderate',
        fiberConnectivity: 'Excellent',
        nearbyMilitary: 'Fort Worth Naval Air Station',
        notes: 'Texas power grid, fiber crossroads'
    },
    {
        id: 'site-3',
        name: 'Potential Site: Phoenix Area',
        type: 'potential-site',
        category: 'Data Center Site',
        coordinates: [33.4484, -112.0740],
        state: 'Arizona',
        score: 85,
        powerAvailability: 'Excellent',
        waterAvailability: 'Limited',
        fiberConnectivity: 'Good',
        nearbyMilitary: 'Luke Air Force Base',
        notes: 'Nuclear power nearby, cooling water concerns'
    }
]

// Combine all infrastructure for easy access
export const allInfrastructure = [
    ...militaryBases,
    ...powerPlants,
    ...electricalSubstations,
    ...gasInfrastructure,
    ...waterInfrastructure,
    ...dataCenterSites
]

// Category colors for map markers
export const categoryColors = {
    'Air Force Base': '#1976d2',
    'Army Base': '#2e7d32',
    'Naval Base': '#0288d1',
    'Marine Corps Base': '#c62828',
    'Nuclear Power': '#ff6f00',
    'Fossil Fuel Power': '#5d4037',
    'Hydroelectric Power': '#0097a7',
    'Wind Power': '#689f38',
    'Solar Power': '#fbc02d',
    'Electrical Substation': '#7b1fa2',
    'Natural Gas Hub': '#e64a19',
    'Gas Pipeline': '#d32f2f',
    'Water Supply': '#0277bd',
    'Data Center Site': '#00897b'
}

export default {
    militaryBases,
    powerPlants,
    electricalSubstations,
    gasInfrastructure,
    waterInfrastructure,
    dataCenterSites,
    allInfrastructure,
    categoryColors
}
