import {
    militaryBases,
    powerPlants,
    electricalSubstations,
    gasInfrastructure,
    waterInfrastructure,
    dataCenterSites,
    allInfrastructure
} from '@/data/infrastructureData'

// API functions for infrastructure data
// Currently using static data, but can be extended to fetch from backend

const getAllInfrastructure = () => {
    return Promise.resolve(allInfrastructure)
}

const getMilitaryBases = () => {
    return Promise.resolve(militaryBases)
}

const getPowerPlants = () => {
    return Promise.resolve(powerPlants)
}

const getElectricalSubstations = () => {
    return Promise.resolve(electricalSubstations)
}

const getGasInfrastructure = () => {
    return Promise.resolve(gasInfrastructure)
}

const getWaterInfrastructure = () => {
    return Promise.resolve(waterInfrastructure)
}

const getDataCenterSites = () => {
    return Promise.resolve(dataCenterSites)
}

const getInfrastructureByType = (type) => {
    switch (type) {
        case 'military':
            return getMilitaryBases()
        case 'power':
            return getPowerPlants()
        case 'electrical':
            return getElectricalSubstations()
        case 'gas':
            return getGasInfrastructure()
        case 'water':
            return getWaterInfrastructure()
        case 'datacenter':
            return getDataCenterSites()
        default:
            return getAllInfrastructure()
    }
}

const getInfrastructureById = (id) => {
    const item = allInfrastructure.find((item) => item.id === id)
    return Promise.resolve(item)
}

// Future: Add functions to fetch from backend API
// const getAllInfrastructure = () => client.get('/api/v1/infrastructure')
// const getMilitaryBases = () => client.get('/api/v1/infrastructure/military')
// etc.

export default {
    getAllInfrastructure,
    getMilitaryBases,
    getPowerPlants,
    getElectricalSubstations,
    getGasInfrastructure,
    getWaterInfrastructure,
    getDataCenterSites,
    getInfrastructureByType,
    getInfrastructureById
}
