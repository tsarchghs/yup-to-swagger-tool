const yup = require("yup")

function Interpreter() {
};

Interpreter.prototype.parse_object_field = object_field => {
    let required = []
    let properties = {}
    let fields = Object.keys(object_field.fields);
    for (field of fields) {
        let field_schema = object_field.fields[field];
        if (field_schema.spec.presence === "required") required.push(field);
        properties[field] = Interpreter.prototype.parseField(field_schema, field);
    }
    let parsed = {
        type: "object",
        properties,
    }
    if (required.length) parsed.required = required;
    return parsed;
}

Interpreter.prototype.parseField = (field, fieldName) => {
    let {type, format} = field;
    console.log("DEBUG: parse_field - ", type)
    let schema;

    if (type === "string") {
        if (field.spec.meta && field.spec.meta.format) {
            schema = {type: "string", format: field.spec.meta.format}
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
        if (field._whitelist.list.size) {
            items = field._whitelist.list.values().map(value => Interpreter.prototype.parseField(value));
        } else if (field.innerType) {
            items = Interpreter.prototype.parseField(object_field.innerType)
        }
        schema = {type: "array", items: items};
    } else if (type === "object") schema = Interpreter.prototype.parse_object_field(field);
    if (!schema) throw new Error("parse_field failed: unsupported type: ", type)
    if (field.spec.meta && field.spec.meta.example) {
        try {
            console.debug("Validating", fieldName, field.spec.meta.example, field)
            field.validateSync(field.spec.meta.example, {strict: true})
        } catch (err) {
            throw new Error(`Example for field: ${fieldName || "<anonymous_field>"} is invalid: \n${JSON.stringify(err.errors).replace("this", fieldName || "<anonymous_field>")}`)
        }
        schema.example = field.spec.meta.example
    }
    return schema;
}

Interpreter.prototype.parse_request_body = yup_schema => {
    let requestBody = {
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {}
                }
            }
        }
    }
    requestBody.content["application/json"].schema = Interpreter.prototype.parseField(yup_schema);
    return requestBody
}
Interpreter.prototype.parse_meta = ({meta}) => {
    let required_fields = ["path", "method"]
    for (required_field of required_fields) {
        if (Object.keys(meta).indexOf(required_field) === -1) {
            throw new Error("parse_meta required field failed on field: ", required_field)
        }
    }
    return {
        [meta.path]: {
            [meta.method]: {
                summary: meta.summary || "No summary",
                description: meta.description || "No description",
            }
        }
    }
}

Interpreter.prototype.parse_query_or_params_or_headers = (in_, schema) => {
    let parameters = [];
    let fields = Object.keys(schema.fields)
    for (field of fields) {
        let field_schema = schema.fields[field]
        parameters.push({
            in: in_,
            name: field,
            schema: Interpreter.prototype.parseField(field_schema),
            required: field_schema.spec.presence === "required",
            description: field_schema.spec.meta && field_schema.spec.meta.description
        })
    }
    console.log({parameters})
    return parameters;
}

Interpreter.prototype.parse_query = query => Interpreter.prototype.parse_query_or_params_or_headers("query", query)
Interpreter.prototype.parse_params = params => Interpreter.prototype.parse_query_or_params_or_headers("path", params)
Interpreter.prototype.parse_headers = headers => Interpreter.prototype.parse_query_or_params_or_headers("header", headers)

Interpreter.prototype.parse_schema = yup_schema => {
    let openAPI_definition
    let {spec: {meta}} = yup_schema
    if (meta) openAPI_definition = {...(Interpreter.prototype.parse_meta({meta}))}
    else throw new Error("meta is required")

    if ((yup_schema instanceof yup.object) === false) {
        throw new Error("Schema must be a object")
    }

    let inside_path = openAPI_definition[Object.keys(openAPI_definition)[0]][meta.method]
    let errors = []
    try {
        yup_schema.fields.requestBody.validateSync({}, {abortEarly: false, strict: true})
    } catch (err) {
        errors = err.errors
    }
    inside_path.responses = {
        200: {description: "success"},
        403: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    schema: {
                        type: "object", properties: {
                            code: {type: "number", example: 403},
                            message: {type: "string", example: "error"},
                            errors: {
                                type: "array",
                                items: {oneOf: [{type: "string"}]},
                                example: errors
                            },
                        }
                    }
                }
            }
        }
    }
    let {requestBody, query, params, headers} = yup_schema.fields;
    if (requestBody) inside_path.requestBody = Interpreter.prototype.parse_request_body(requestBody)
    inside_path.parameters = []
    if (query) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_query(query));
    if (params) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_params(params));
    if (headers) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_headers(headers));

    let {responses} = meta;
    if (responses) {
        for (let [statusCode, definition] of Object.entries(responses)) {
            inside_path.responses[statusCode] = definition;
        }
    }

    return openAPI_definition
}

Interpreter.prototype.createResponseObject = (responseDescription, responseNumber, bodyProperties) => {
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

module.exports = {Interpreter}
