declare module 'supercluster' {
  interface SuperclusterOptions {
    radius?: number;
    maxZoom?: number;
    extent?: number;
    nodeSize?: number;
  }

  class SuperclusterClass {
    constructor(options?: SuperclusterOptions);
    load(points: unknown[]): void;
    getClusters(bbox: [number, number, number, number], zoom: number): unknown[];
  }

  export default SuperclusterClass;
}
