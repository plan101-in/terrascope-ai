import forestTile from '../assets/images/satellite_sample_forest_1793622550237.jpg';
import agriTile from '../assets/images/satellite_sample_agriculture_1793622550913.jpg';
import urbanTile from '../assets/images/satellite_sample_urban_1793622550415.jpg';

export interface SampleTile {
  id: string;
  label: string;
  description: string;
  imageSrc: string;
  sourceInfo: string;
  suggestedIllustrativeClass: string;
}

export const SAMPLE_TILES: SampleTile[] = [
  {
    id: 'sample-forest',
    label: 'River & Forest Canopy',
    description: 'Meandering river traversing dense tropical & temperate canopy',
    imageSrc: forestTile,
    sourceInfo: 'High-res multispectral orthophoto (Simulated Sentinel-2 nadir tile)',
    suggestedIllustrativeClass: 'Forest',
  },
  {
    id: 'sample-agri',
    label: 'Agricultural Parcels',
    description: 'Geometric crop parcels, circular pivot irrigation, and varied crop stages',
    imageSrc: agriTile,
    sourceInfo: 'Orthorectified cropland tile (Simulated Sentinel-2 parcel grid)',
    suggestedIllustrativeClass: 'Agriculture',
  },
  {
    id: 'sample-urban',
    label: 'High-Density Built-up',
    description: 'Metropolitan transport arteries, commercial roofs, and urban street grid',
    imageSrc: urbanTile,
    sourceInfo: 'Urban core nadir aerial perspective (Paved & structural footprint)',
    suggestedIllustrativeClass: 'Built-up',
  },
];
