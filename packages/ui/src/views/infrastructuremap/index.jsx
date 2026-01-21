import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Typography, Chip, Switch, FormGroup, FormControlLabel, Paper, Grid } from '@mui/material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Import infrastructure data
import {
    militaryBases,
    powerPlants,
    electricalSubstations,
    gasInfrastructure,
    waterInfrastructure,
    dataCenterSites,
    categoryColors
} from '@/data/infrastructureData'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

// Create custom colored markers
const createColoredIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    })
}

// Component to handle map centering
const MapCenter = ({ center }) => {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom())
        }
    }, [center, map])
    return null
}

const InfrastructureMap = () => {
    const [selectedLayers, setSelectedLayers] = useState({
        militaryBases: true,
        powerPlants: true,
        electricalSubstations: true,
        gasInfrastructure: true,
        waterInfrastructure: true,
        dataCenterSites: true
    })
    const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]) // Center of US
    const [selectedFeature, setSelectedFeature] = useState(null)

    const handleLayerToggle = (layer) => {
        setSelectedLayers((prev) => ({
            ...prev,
            [layer]: !prev[layer]
        }))
    }

    const handleFeatureClick = (feature) => {
        setSelectedFeature(feature)
        setMapCenter([feature.coordinates[0], feature.coordinates[1]])
    }

    // Render markers based on selected layers
    const renderMarkers = () => {
        const markers = []

        if (selectedLayers.militaryBases) {
            militaryBases.forEach((base) => {
                markers.push(
                    <Marker
                        key={base.id}
                        position={base.coordinates}
                        icon={createColoredIcon(categoryColors[base.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(base)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{base.name}</strong>
                                <br />
                                <em>{base.category}</em>
                                <br />
                                State: {base.state}
                                <br />
                                Land Area: {base.landArea} sq mi
                                <br />
                                Power Capacity: {base.powerCapacity} MW
                                <br />
                                Water Access: {base.waterAccess}
                                <br />
                                <small>{base.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        if (selectedLayers.powerPlants) {
            powerPlants.forEach((plant) => {
                markers.push(
                    <Marker
                        key={plant.id}
                        position={plant.coordinates}
                        icon={createColoredIcon(categoryColors[plant.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(plant)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{plant.name}</strong>
                                <br />
                                <em>{plant.category}</em>
                                <br />
                                State: {plant.state}
                                <br />
                                Capacity: {plant.capacity} MW
                                <br />
                                Fuel Type: {plant.fuelType}
                                <br />
                                <small>{plant.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        if (selectedLayers.electricalSubstations) {
            electricalSubstations.forEach((substation) => {
                markers.push(
                    <Marker
                        key={substation.id}
                        position={substation.coordinates}
                        icon={createColoredIcon(categoryColors[substation.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(substation)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{substation.name}</strong>
                                <br />
                                <em>{substation.category}</em>
                                <br />
                                State: {substation.state}
                                <br />
                                Voltage: {substation.voltage} kV
                                <br />
                                <small>{substation.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        if (selectedLayers.gasInfrastructure) {
            gasInfrastructure.forEach((gas) => {
                markers.push(
                    <Marker
                        key={gas.id}
                        position={gas.coordinates}
                        icon={createColoredIcon(categoryColors[gas.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(gas)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{gas.name}</strong>
                                <br />
                                <em>{gas.category}</em>
                                <br />
                                State: {gas.state}
                                <br />
                                {gas.capacity && (
                                    <>
                                        Capacity: {gas.capacity} MMcf/day
                                        <br />
                                    </>
                                )}
                                <small>{gas.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        if (selectedLayers.waterInfrastructure) {
            waterInfrastructure.forEach((water) => {
                markers.push(
                    <Marker
                        key={water.id}
                        position={water.coordinates}
                        icon={createColoredIcon(categoryColors[water.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(water)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{water.name}</strong>
                                <br />
                                <em>{water.category}</em>
                                <br />
                                State: {water.state}
                                <br />
                                Capacity: {water.capacity} cfs
                                <br />
                                <small>{water.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        if (selectedLayers.dataCenterSites) {
            dataCenterSites.forEach((site) => {
                markers.push(
                    <Marker
                        key={site.id}
                        position={site.coordinates}
                        icon={createColoredIcon(categoryColors[site.category])}
                        eventHandlers={{
                            click: () => handleFeatureClick(site)
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{site.name}</strong>
                                <br />
                                <em>{site.category}</em>
                                <br />
                                State: {site.state}
                                <br />
                                Score: {site.score}/100
                                <br />
                                Power: {site.powerAvailability}
                                <br />
                                Water: {site.waterAvailability}
                                <br />
                                Fiber: {site.fiberConnectivity}
                                <br />
                                Nearby Military: {site.nearbyMilitary}
                                <br />
                                <small>{site.notes}</small>
                            </div>
                        </Popup>
                    </Marker>
                )
            })
        }

        return markers
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h2" sx={{ mb: 3 }}>
                US Military & Infrastructure Map
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                Interactive map showing military bases and critical infrastructure for data center and power generation site analysis
            </Typography>

            <Grid container spacing={3}>
                {/* Layer Controls */}
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h4" sx={{ mb: 2 }}>
                            Layers
                        </Typography>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.militaryBases}
                                        onChange={() => handleLayerToggle('militaryBases')}
                                        color="primary"
                                    />
                                }
                                label="Military Bases"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.powerPlants}
                                        onChange={() => handleLayerToggle('powerPlants')}
                                        color="primary"
                                    />
                                }
                                label="Power Plants"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.electricalSubstations}
                                        onChange={() => handleLayerToggle('electricalSubstations')}
                                        color="primary"
                                    />
                                }
                                label="Electrical Substations"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.gasInfrastructure}
                                        onChange={() => handleLayerToggle('gasInfrastructure')}
                                        color="primary"
                                    />
                                }
                                label="Gas Infrastructure"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.waterInfrastructure}
                                        onChange={() => handleLayerToggle('waterInfrastructure')}
                                        color="primary"
                                    />
                                }
                                label="Water Infrastructure"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={selectedLayers.dataCenterSites}
                                        onChange={() => handleLayerToggle('dataCenterSites')}
                                        color="primary"
                                    />
                                }
                                label="Potential DC Sites"
                            />
                        </FormGroup>

                        {/* Legend */}
                        <Typography variant="h4" sx={{ mt: 3, mb: 2 }}>
                            Legend
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {Object.entries(categoryColors).map(([category, color]) => (
                                <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            backgroundColor: color,
                                            border: '2px solid white',
                                            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                                        }}
                                    />
                                    <Typography variant="body2">{category}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Selected Feature Details */}
                    {selectedFeature && (
                        <Paper sx={{ p: 2, mt: 2 }}>
                            <Typography variant="h4" sx={{ mb: 2 }}>
                                Details
                            </Typography>
                            <Typography variant="h5">{selectedFeature.name}</Typography>
                            <Chip label={selectedFeature.category} size="small" sx={{ mt: 1, mb: 2 }} />
                            <Typography variant="body2">
                                <strong>State:</strong> {selectedFeature.state}
                            </Typography>
                            {selectedFeature.landArea && (
                                <Typography variant="body2">
                                    <strong>Land Area:</strong> {selectedFeature.landArea} sq mi
                                </Typography>
                            )}
                            {selectedFeature.powerCapacity && (
                                <Typography variant="body2">
                                    <strong>Power Capacity:</strong> {selectedFeature.powerCapacity} MW
                                </Typography>
                            )}
                            {selectedFeature.capacity && (
                                <Typography variant="body2">
                                    <strong>Capacity:</strong> {selectedFeature.capacity}{' '}
                                    {selectedFeature.category.includes('Power') ? 'MW' : 'units'}
                                </Typography>
                            )}
                            {selectedFeature.waterAccess && (
                                <Typography variant="body2">
                                    <strong>Water Access:</strong> {selectedFeature.waterAccess}
                                </Typography>
                            )}
                            {selectedFeature.score && (
                                <Typography variant="body2">
                                    <strong>Site Score:</strong> {selectedFeature.score}/100
                                </Typography>
                            )}
                            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', fontSize: '0.875rem' }}>
                                {selectedFeature.notes}
                            </Typography>
                        </Paper>
                    )}
                </Grid>

                {/* Map */}
                <Grid item xs={12} md={9}>
                    <Card>
                        <CardContent>
                            <Box sx={{ height: '800px', width: '100%' }}>
                                <MapContainer
                                    center={[39.8283, -98.5795]}
                                    zoom={5}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapCenter center={mapCenter} />
                                    {renderMarkers()}
                                </MapContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    )
}

export default InfrastructureMap
