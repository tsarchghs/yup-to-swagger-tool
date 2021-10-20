"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponseObject = exports.Interpreter = void 0;
const schema_1 = require("yup/lib/schema");
class Interpreter {
    parseObjectField(objectField) {
        let required = [];
        let properties = {};
        let fields = Object.keys(objectField.fields);
        for (const field of fields) {
            let fieldSchema = objectField.fields[field];
            if (fieldSchema.spec.presence === "required")
                required.push(field);
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
    parseSchemaObject(field, fieldName) {
        let { type, spec } = field;
        let schema;
        if (type === "string") {
            if (spec.meta && spec.meta.format) {
                schema = { type: "string", format: spec.meta.format };
            }
            else {
                schema = { type: "string" };
            }
        }
        else if (type === "boolean") {
            schema = { type: "boolean" };
        }
        else if (type === "date") {
            /**
             * As stated in openAPI 3.0 and JSON Schema Validation documentation,
             * a date can be described as a string with specified format
             * @param field
             * @returns {{format: string, type: string}}
             */
            schema = { type: "string", format: "date-time" };
        }
        else if (type === "number") {
            schema = { type: "number" };
        }
        else if (type === "array") {
            let items;
            // TODO required cast since _whitelist is protected
            if (field._whitelist.list.size) {
                items = field._whitelist.list.values().map((value) => {
                    if (value instanceof schema_1.default)
                        return this.parseSchemaObject(value);
                    return value;
                });
            }
            else if (field.innerType) {
                items = this.parseSchemaObject(field.innerType);
            }
            schema = { type: "array", items: items };
        }
        else if (type === "object") {
            schema = this.parseObjectField(field);
        }
        if (!schema)
            throw new Error("parse_field failed: unsupported type: " + type);
        if (spec.meta && spec.meta.example) {
            try {
                console.debug("Validating", fieldName, spec.meta.example, field);
                field.validateSync(spec.meta.example, { strict: true });
            }
            catch (err) {
                throw new Error(`Example for field: ${fieldName || "<anonymous_field>"} is invalid: \n${JSON.stringify(err.errors).replace("this", fieldName || "<anonymous_field>")}`);
            }
            schema.example = spec.meta.example;
        }
        return schema;
    }
    parseQueryOrParamsOrHeaders(_in, schema) {
        let parameters = [];
        let fields = Object.keys(schema.fields);
        for (const field of fields) {
            let field_schema = schema.fields[field];
            parameters.push({
                in: _in,
                name: field,
                schema: this.parseSchemaObject(field_schema),
                required: field_schema.spec.presence === "required",
                description: field_schema.spec.meta && field_schema.spec.meta.description
            });
        }
        return parameters;
    }
    parseSchema(YUPSchema) {
        /**
         * FIXME is this validateSync necessary?
         */
        let errors;
        try {
            YUPSchema.fields.requestBody.validateSync({}, { abortEarly: false, strict: true });
        }
        catch (err) {
            errors = err.errors;
        }
        const standardResponse = {
            200: { description: "success" },
            403: {
                description: "Validation error",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                code: { type: "number", example: 403 },
                                message: { type: "string", example: "error" },
                                errors: {
                                    type: "array",
                                    items: { type: "string" },
                                    example: errors
                                },
                            }
                        }
                    }
                }
            },
            default: { description: "Some error may have occured" }
        };
        // Parse ObjectSchema
        let insidePath;
        let { requestBody, query, params, headers } = YUPSchema.fields;
        if (requestBody)
            insidePath.requestBody = {
                content: {
                    "application/json": {
                        schema: this.parseSchemaObject(requestBody)
                    }
                }
            };
        if (query)
            insidePath.parameters = this.parseQueryOrParamsOrHeaders("query", query);
        if (params)
            insidePath.parameters = insidePath.parameters.concat(this.parseQueryOrParamsOrHeaders("path", params));
        if (headers)
            insidePath.parameters = insidePath.parameters.concat(this.parseQueryOrParamsOrHeaders("header", headers));
        // Obtain meta information
        let { spec } = YUPSchema;
        if (!spec.meta)
            throw new Error("meta data for schema is missing");
        if (!spec.meta.path || !spec.meta.method)
            throw new Error("meta data for schema has missing information (required: path - method): " + { YUPSchema });
        let { meta } = spec.meta;
        let responses = meta.responses;
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
exports.Interpreter = Interpreter;
const createResponseObject = (responseDescription, responseNumber, bodyProperties) => {
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
    };
};
exports.createResponseObject = createResponseObject;
