/**
 * As stated in {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md}
 * TODO link documentation for each Object / interface
 * TODO missing specification to extend <Entity>Object
 *
 * $ref and ReferenceObject are voluntarily omitted because this description is intended to describe an
 * OpenAPI plain-JSON with no reference in it.
 */
export declare namespace OpenAPI {
    export interface Schema {
        openapi: string;
        info: InfoObject;
        jsonSchemaDialect?: string;
        servers?: ServerObject[];
        paths: PathsObject;
        webhooks?: {
            [key: string]: PathItemObject; // | ReferenceObject
        };
        components: ComponentsObject;
        security?: SecurityRequirementObject[];
        tags?: TagObject[];
        externalDocs?: ExternalDocumentationObject;
    }

    interface TagObject {
        name: string;
        description?: string;
        externalDocs?: ExternalDocumentationObject;
    }

    /**
     * TODO Missing definition from {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#components-object}
     */
    interface ComponentsObject {

    }

    interface XMLObject {
        name?: string;
        namespace?: string;
        prefix?: string;
        attribute?: boolean;
        wrapped?: boolean;
    }

    interface DiscriminatorObject {
        propertyName: string;
        mapping: {
            [payloadKey: string]: string
        }
    }

    interface SchemaObjectJSONSchemaExtended {
        /**
         * {@quote The following properties are taken from the JSON Schema specification but their definitions have been extended by the OAS}
         * from
         * {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
         */
        description?: string;
        format?: string;
    }

    interface SchemaObjectOpenAPISpecification {
        /**
         * {@quote The OpenAPI Specification's base vocabulary is comprised of the following keywords:}
         * from
         * {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
         */
        discriminator?: DiscriminatorObject;
        xml?: XMLObject;
        externalDocs?: ExternalDocumentationObject;
        example?: any;
    }

    /**
     * As described in {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00
     */
    interface SchemaObjectJsonSchemaValidation {
        /**
         * {@quote The value of this keyword MUST be either a string or an array. If it is an array, elements of the array MUST be strings and MUST be unique.}
         * {@quote String values MUST be one of the six primitive types ("null", "boolean", "object", "array", "number", or "string"), or "integer" which matches any number with a zero fractional part.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-6.1.2}
         */
        type: "object" | "array" | "boolean" | "null" | "string" | "number" | [string, ...string[]];
        /**
         * {@quote The value of this keyword MUST be an array. This array SHOULD have at least one element.  Elements in the array SHOULD be unique.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-6.1.2}
         */
        enum?: [string, ...string[]];
        /**
         * {@quote The value of this keyword MAY be of any type, including null.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-6.1.2}
         */
        const?: any
        /**
         * {@quote The value of this keyword MUST be an array. Elements of this array, if any, MUST be strings, and MUST be unique.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-6.5.3}
         */
        required?: string[]
    }

    /**
     * As stated in {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.2.1}
     * from the Appendix A of {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A}
     */
    interface SchemaObjectJsonSchema {
        /**
         * {@quote The value of "properties" MUST be an object.  Each value of this object MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.2.1}
         */
        properties?: { [key: string]: SchemaObject };
        /**
         * {@quote The value of "patternProperties" MUST be an object. Each property name of this object SHOULD be a valid regular expression, according to the ECMA-262 regular expression dialect. Each property value of this object MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.2.2}
         */
        patternProperties?: { [key: string]: SchemaObject };
        /**
         * {@quote The value of "additionalProperties" MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.2.3}
         */
        additionalProperties?: { [key: string]: SchemaObject };
        /**
         * {@quote The value of "propertyNames" MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.2.4}
         */
        propertyNames?: SchemaObject;
        /**
         * {@quote The value of "items" MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.3.1.2}
         */
        items?: SchemaObject;
        /**
         * {@quote This keyword's value MUST be a non-empty array. Each item of the array MUST be a valid JSON Schema.}
         * from
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.2.1.1}
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.2.1.2}
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.2.1.3}
         * {@link https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-10.2.1.4}
         */
        allOf?: SchemaObject;
        oneOf?: SchemaObject;
        anyOf?: SchemaObject;
        not?: SchemaObject;
    }

    /**
     * {@quote This object is a superset of the {@link https://tools.ietf.org/html/draft-bhutton-json-schema-00}}
     * To explicit this, different interfaced has been created
     */
    type SchemaObject = SchemaObjectOpenAPISpecification & SchemaObjectJSONSchemaExtended & SchemaObjectJsonSchema & SchemaObjectJsonSchemaValidation;


    interface HeaderObject {
        name: string;
        description?: string;
        externalDocs?: ExternalDocumentationObject;
    }

    interface EncodingObject {
        contentType?: string;
        headers: {
            [key: string]: HeaderObject;
        };
        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
    }

    interface ExampleObject {
        summary?: string;
        description?: string;
        value?: any;
        externalValue?: string;
    }

    interface MediaTypeObject {
        schema?: SchemaObject;
        example?: any;
        examples?: {
            [exampleKey: string]: ExampleObject
        };
        encoding?: {
            [propertyName: string]: EncodingObject;
        }
    }

    export interface RequestBodyObject {
        description?: string;
        content: {
            [key: string]: MediaTypeObject
        }
        required?: boolean;
    }

    interface ParameterObject {
        name: string;
        in: "query" | "header" | "cookie" | "path";
        description?: string;
        required?: boolean;
        deprecated?: boolean;
        allowEmptyValue?: boolean;

        /**
         *  {@quote Default values (based on value of in): for query - form; for path - simple; for header - simple; for cookie - form}
         *  {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#style-values}
         **/

        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
        schema?: SchemaObject;
        example?: any;
        examples?: {
            [exampleKey: string]: ExampleObject
        };
        content?: {
            [key: string]: MediaTypeObject;
        }
    }

    interface ExternalDocumentationObject {
        decription?: string;
        url: string;
    }

    interface LinkObject {
        operationRef?: string;
        operationId?: string;
        parameters?: {
            [key: string]: any
        };
        requestBody?: any;
        description?: string;
        server: ServerObject;
    }

    export interface ResponseObject {
        description: string;
        headers?: {
            [key: string]: HeaderObject; // | ReferenceObject
        };
        content?: {
            [key: string]: MediaTypeObject;
        };
        links?: {
            [key: string]: LinkObject; // | ReferenceObject
        }
    }

    interface ResponsesObjectPatternedFields {
        /**
         * httpStatusCode are of values stated in {@link https://datatracker.ietf.org/doc/html/rfc7231#section-6}
         */
        [httpStatusCode: string]: ResponseObject; // | ReferenceObject
    }

    interface ResponsesObjectFixedFields {
        default: ResponseObject; // | ReferenceObject
    }

    /**
     * This Typescript solution of type instead of interface has been made to explicitly merge
     * {@link ResponsesObjectFixedFields} and {@link ResponsesObjectPatternedFields}
     */
    type ResponsesObject = ResponsesObjectFixedFields & ResponsesObjectPatternedFields;

    interface CallbackObject {
        [patternedExpression: string]: PathItemObject; // | ReferenceObject
    }

    /**
     * TODO implement stated {@quote Each name MUST correspond to a security scheme which is declared in the Security Schemes under the Components Object.}
     */
    interface SecurityRequirementObject {
        [name: string]: string[]; // | ReferenceObject
    }

    interface OperationObject {
        tags?: string[];
        summary?: string;
        description?: string;
        externalDocs?: ExternalDocumentationObject;
        operationId?: string;
        parameters?: ParameterObject[]; // | ReferenceObject
        requestBody?: RequestBodyObject; // | ReferenceObject
        responses?: ResponsesObject;
        callbacks: {
            [key: string]: CallbackObject; // | ReferenceObject
        };
        deprecated?: boolean;
        security: SecurityRequirementObject;
        servers: ServerObject;
    }

    interface PathItemObject {
        // $ref :string
        summary?: string;
        description?: string;
        get?: OperationObject;
        put?: OperationObject;
        post?: OperationObject;
        delete?: OperationObject;
        options?: OperationObject;
        head?: OperationObject;
        patch?: OperationObject;
        trace?: OperationObject;
        servers?: ServerObject;
        /** {@quote The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. }*/
        parameters?: ParameterObject[]; // | ReferenceObject
    }

    interface PathsObject {
        [path: string]: PathItemObject
    }

    interface ServerObject {
        url: string;
        /** {@quote CommonMark syntax MAY be used for rich text representation.} **/
        description?: string;
        variables?: {
            [name: string]: ServerVariableObject
        }
    }

    interface ServerVariableObject {
        // Non-empty array
        enum?: [string, ...string[]];
        default: string;
        description?: string;
    }

    interface InfoObject {
        title: string;
        version: string;
        summary?: string;
        description?: string;
        termsOfService?: string;
        contact?: ContactObject;
        license?: LicenseObject;
    }

    interface ContactObject {
        name: string;
        url: string;
        email: string;
    }

    interface LicenseObject {
        name: string;
        identifier?: string;
        url?: string;
    }
}
