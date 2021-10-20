import {OpenAPI} from "../@types/openapi";
import {ObjectSchema} from "yup";
import {AnyObject} from "yup/es/types";
import {SchemaSpec} from "yup/es/schema";
import {YUPMetaObject} from "../@types/Interpreter.types";
import {ObjectShape} from "yup/es/object";
import BaseSchema from "yup/lib/schema";
import ResponseObject = OpenAPI.ResponseObject;
import SchemaObject = OpenAPI.SchemaObject;
import PathsObject = OpenAPI.PathsObject;
import OperationObject = OpenAPI.OperationObject;
import ParameterObject = OpenAPI.ParameterObject;
import ResponsesObject = OpenAPI.ResponsesObject;

class Interpreter {
    parseObjectField(objectField: ObjectSchema<any>): SchemaObject {
        let required: string[] = [];
        let properties: { [key: string]: SchemaObject } = {};

        let fields: string[] = Object.keys(objectField.fields);
        for (const field of fields) {
            let fieldSchema = objectField.fields[field];
            if (fieldSchema.spec.presence === "required") required.push(field);
            properties[field] = this.parseSchemaObject(fieldSchema, field);
        }

        return {
            type: "object",
            properties: properties,
            required: required
        };
    }

    /**
     *
     * @param field
     * @param fieldName used just for debug
     */
    parseSchemaObject(field: any, fieldName?: string): SchemaObject {
        let {type, spec}: { type: string, spec: SchemaSpec<any> } = field;

        let schema: SchemaObject;
        if (type === "string") {
            if (spec.meta && spec.meta.format) {
                schema = {type: "string", format: spec.meta.format}
            } else {
                schema = {type: "string"};
            }
        } else if (type === "boolean") {
            schema = {type: "boolean"};
        } else if (type === "date") {
            /**
             * As stated in openAPI 3.0 and JSON Schema Validation documentation,
             * a date can be described as a string with specified format
             * @param field
             * @returns {{format: string, type: string}}
             */
            schema = {type: "string", format: "date-time"};
        } else if (type === "number") {
            schema = {type: "number"}
        } else if (type === "array") {
            let items;
            // TODO required cast since _whitelist is protected
            if ((field as any)._whitelist.list.size) {
                items = (field as any)._whitelist.list.values().map((value: unknown) => {
                    if (value instanceof BaseSchema)
                        return this.parseSchemaObject(value as BaseSchema);
                    return value;
                });
            } else if ((field as any).innerType) {
                items = this.parseSchemaObject((field as any).innerType);
            }
            schema = {type: "array", items: items};
        } else if (type === "object") {
            schema = this.parseObjectField(field as ObjectSchema<any>);
        }
        if (!schema) throw new Error("parse_field failed: unsupported type: " + type);
        if (spec.meta && spec.meta.example) {
            try {
                console.debug("Validating", fieldName, spec.meta.example, field)
                field.validateSync(spec.meta.example, {strict: true})
            } catch (err) {
                throw new Error(`Example for field: ${fieldName || "<anonymous_field>"} is invalid: \n${JSON.stringify(err.errors).replace("this", fieldName || "<anonymous_field>")}`)
            }
            schema.example = spec.meta.example;
        }
        return schema;
    }

    parseQueryOrParamsOrHeaders(_in: "query" | "header" | "cookie" | "path", schema: any): ParameterObject[] {
        let parameters: ParameterObject[] = [];
        let fields = Object.keys(schema.fields);
        for (const field of fields) {
            let field_schema: any = schema.fields[field]
            parameters.push({
                in: _in,
                name: field,
                schema: this.parseSchemaObject(field_schema),
                required: field_schema.spec.presence === "required",
                description: field_schema.spec.meta && field_schema.spec.meta.description
            })
        }
        return parameters;
    }

    parseSchema<S extends ObjectSchema<any, AnyObject, any>>(YUPSchema?: S): PathsObject {
        /**
         * FIXME is this validateSync necessary?
         */
        let errors: any[];
        try {
            (YUPSchema as any).fields.requestBody.validateSync({}, {abortEarly: false, strict: true})
        } catch (err: any) {
            errors = err.errors;
        }
        const standardResponse: ResponsesObject = {
            200: {description: "success"},
            403: {
                description: "Validation error",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                code: {type: "number", example: 403},
                                message: {type: "string", example: "error"},
                                errors: {
                                    type: "array",
                                    items: {type: "string"},
                                    example: errors
                                },
                            }
                        }
                    }
                }
            },
            default: {description: "Some error may have occured"}
        };

        // Parse ObjectSchema
        let insidePath: OperationObject;
        let {requestBody, query, params, headers}: ObjectShape = YUPSchema.fields;
        if (requestBody)
            insidePath.requestBody = {
                content: {
                    "application/json": {
                        schema: this.parseSchemaObject(requestBody)
                    }
                }
            };
        if (query) insidePath.parameters = this.parseQueryOrParamsOrHeaders("query", query);
        if (params) insidePath.parameters = insidePath.parameters.concat(this.parseQueryOrParamsOrHeaders("path", params));
        if (headers) insidePath.parameters = insidePath.parameters.concat(this.parseQueryOrParamsOrHeaders("header", headers));


        // Obtain meta information
        let {spec}: { spec: SchemaSpec<any> } = YUPSchema;
        if (!spec.meta) throw new Error("meta data for schema is missing");
        if (!spec.meta.path || !spec.meta.method) throw new Error("meta data for schema has missing information (required: path - method): " + {YUPSchema});
        let {meta}: { meta: YUPMetaObject } = spec.meta;

        let responses: ResponsesObject = meta.responses;
        if (responses) {
            for (let [statusCode, definition] of Object.entries(responses)) {
                insidePath.responses[statusCode] = definition;
            }
        }
        return {
            [meta.path]: {
                [meta.method]: {
                    ...{
                        // Default parsed object
                        summary: meta.summary || "No summary",
                        description: meta.description || "No description",
                        responses: standardResponse
                    },
                    ...insidePath
                }
            }
        };
    }
}

const createResponseObject = (responseDescription: string, responseNumber: any, bodyProperties: { [key: string]: SchemaObject }): ResponseObject => {
    return {
        description: responseDescription,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        statusCode: {
                            type: "number",
                            example: responseNumber
                        },
                        ...(bodyProperties && {
                            body: {
                                type: "object",
                                properties: bodyProperties
                            }
                        })
                    }
                }
            }
        }
    }
}
export {
    Interpreter,
    createResponseObject
}
