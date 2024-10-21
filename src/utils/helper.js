import {isPointWithinRadius} from 'geolib';

export const pointWithinRadius = (pointToCheck, centerPoint, radius) => {
  const isWithinRadius = isPointWithinRadius(pointToCheck, centerPoint, radius);
  return isWithinRadius;
};

const pointInPolygon = () => {
  geolib.isPointInPolygon({latitude: 51.5125, longitude: 7.485}, [
    {latitude: 51.5, longitude: 7.4},
    {latitude: 51.555, longitude: 7.4},
    {latitude: 51.555, longitude: 7.625},
    {latitude: 51.5125, longitude: 7.625},
  ]);
};
