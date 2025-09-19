// cspell:ignore supercluster Supercluster bbox
declare module 'supercluster' {
  import type { GeoJsonProperties, Feature, Point } from 'geojson';
  interface SuperclusterPointProps extends GeoJsonProperties { species?: string }
  interface ClusterProperties extends GeoJsonProperties { cluster?: boolean; point_count?: number; point_count_abbreviated?: number; species?: string }
  type ClusterFeature = Feature<Point, ClusterProperties>;
  interface Options { radius?: number; maxZoom?: number }
  class Supercluster {
    constructor(options?: Options);
    load(points: Feature<Point, SuperclusterPointProps>[]): this;
    getClusters(bbox: [number, number, number, number], zoom: number): ClusterFeature[];
  }
  export default Supercluster;
}
