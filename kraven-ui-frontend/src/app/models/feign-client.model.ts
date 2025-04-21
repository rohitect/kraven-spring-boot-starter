/**
 * Represents a Feign client.
 */
export interface FeignClient {
  /**
   * The name of the Feign client.
   */
  name: string;

  /**
   * The URL of the Feign client.
   */
  url: string;

  /**
   * The path of the Feign client.
   */
  path: string;

  /**
   * The fully qualified class name of the Feign client interface.
   */
  className: string;

  /**
   * The methods of the Feign client.
   */
  methods: FeignMethod[];

  /**
   * The configuration class for the Feign client.
   */
  configuration: string;

  /**
   * The fallback class for the Feign client.
   */
  fallback: string;

  /**
   * The fallback factory class for the Feign client.
   */
  fallbackFactory: string;

  /**
   * Additional properties of the Feign client.
   */
  properties: { [key: string]: string };
}

/**
 * Represents a Feign client method.
 */
export interface FeignMethod {
  /**
   * The name of the method.
   */
  name: string;

  /**
   * The HTTP method (GET, POST, PUT, DELETE, etc.).
   */
  httpMethod: string;

  /**
   * The path of the method.
   */
  path: string;

  /**
   * The return type of the method.
   */
  returnType: string;

  /**
   * The parameters of the method.
   */
  parameters: FeignParameter[];

  /**
   * The headers of the method.
   */
  headers: string[];

  /**
   * The produces media type of the method.
   */
  produces: string[];

  /**
   * The consumes media type of the method.
   */
  consumes: string[];

  /**
   * Whether the method is expanded in the UI.
   */
  isExpanded: boolean;

  /**
   * Whether the try-it-out section is visible.
   */
  showTryItOut?: boolean;
}

/**
 * Represents a Feign client method parameter.
 */
export interface FeignParameter {
  /**
   * The name of the parameter.
   */
  name: string;

  /**
   * The type of the parameter.
   */
  type: string;

  /**
   * The annotation type of the parameter (e.g., PathVariable, RequestParam, RequestBody).
   */
  annotationType: string;

  /**
   * Whether the parameter is required.
   */
  required: boolean;

  /**
   * The default value of the parameter.
   */
  defaultValue: string;

  /**
   * The value of the parameter for try-it-out.
   */
  value?: any;
}
