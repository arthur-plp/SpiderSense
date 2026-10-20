declare module "swagger-ui-dist/swagger-ui-es-bundle.js" {
  type SwaggerUIOptions = {
    url?: string;
    spec?: object;
    domNode?: HTMLElement;
    [option: string]: unknown;
  };

  const SwaggerUI: (options: SwaggerUIOptions) => unknown;
  export default SwaggerUI;
}
