import { LandUseClass } from '../types/prediction';

export const INITIAL_LAND_USE_CLASSES: LandUseClass[] = [
  {
    id: 'forest',
    name: 'Forest',
    description: 'Dense canopy, woodlands, natural vegetation reserves, and timber parcels',
    colorHex: '#24845A', // Forest green
  },
  {
    id: 'water',
    name: 'Water',
    description: 'Inland rivers, reservoirs, wetlands, irrigation canals, and open water bodies',
    colorHex: '#1779B8', // Satellite blue
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Cultivated crop parcels, irrigated cropland, orchards, and managed pasture',
    colorHex: '#D5A23D', // Agricultural amber
  },
  {
    id: 'built_up',
    name: 'Built-up',
    description: 'Urban infrastructure, commercial zones, paved roads, and residential developments',
    colorHex: '#102B46', // Deep navy
  },
];

export const POTENTIAL_ADDITIONAL_CLASSES: LandUseClass[] = [
  {
    id: 'barren',
    name: 'Barren Land',
    description: 'Exposed rock, sandy tracts, dry riverbeds, and uncultivated soil',
    colorHex: '#8C7853',
  },
  {
    id: 'wetland',
    name: 'Wetland / Mangrove',
    description: 'Seasonally flooded basins, marshlands, and coastal estuarine vegetation',
    colorHex: '#2E7D6F',
  },
  {
    id: 'shrubland',
    name: 'Shrubland / Scrub',
    description: 'Low woody vegetation, arid scrub, and mixed transitional open ground',
    colorHex: '#7C8C56',
  },
];
