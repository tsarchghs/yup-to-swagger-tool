const yup = require("yup")

function Interpreter() {};

Interpreter.prototype.parse_string_field = field => {
    return { type: "string" }
}

/**
 * As stated in openAPI 3.0 and JSON Schema Validation documentation,
 * a date can be described as a string with specified format
 * @param field
 * @returns {{format: string, type: string}}
 */
Interpreter.prototype.parse_date_time_field = field => {
    return { type: "string", format: "date-time" }
}

Interpreter.prototype.parse_string_format_field = format => {
    return { type: "string", format: format }
}

Interpreter.prototype.parse_number_field = field => {
    return { type: "number" }
}

Interpreter.prototype.parse_object_field = object_field => {
    let required = []
    let properties = {}
    let fields = Object.keys(object_field.fields);
    for (field of fields){
        let field_schema = object_field.fields[field];
        if (field_schema.spec.presence === "required") required.push(field);
        properties[field] = Interpreter.prototype.parse_field(field_schema,field);
    }
    let parsed =  {
        type: "object",
        properties,
    }
    if (required.length) parsed.required = required;
    return parsed;
}

Interpreter.prototype.parse_array_field_whitelist_list = set => {
    let oneOf = []
    for (schema of set.values()) {
        oneOf.push(Interpreter.prototype.parse_field(schema))
    }
    return { oneOf }
}

Interpreter.prototype.parse_array_field = object_field => {
    let items;
    if (object_field._whitelist.list.size) {
        items = Interpreter.prototype.parse_array_field_whitelist_list(
            object_field._whitelist.list
        )
    }
    else if (object_field.innerType) {
        items = { oneOf: [ Interpreter.prototype.parse_field(object_field.innerType) ]}
    }
    return {
        type: "array",
        items
    }
}

Interpreter.prototype.parse_field = (field,field_name) => {
    let { type, format } = field;
    console.log("DEBUG: parse_field - ",type)
    let schema;
    if (type === "string") {
        if (field.spec.meta && field.spec.meta.format) schema = Interpreter.prototype.parse_string_format_field(field.spec.meta.format);
        else schema = Interpreter.prototype.parse_string_field(field);
    }
    else if (type === "boolean") schema = { type: "boolean" };
    else if (type === "date") schema = Interpreter.prototype.parse_date_time_field(field);
    else if (type === "number") schema = Interpreter.prototype.parse_number_field(field);
    else if (type === "array") schema = Interpreter.prototype.parse_array_field(field);
    else if (type === "object") schema = Interpreter.prototype.parse_object_field(field);
    if (schema){
        if (field.spec.meta) {
            if (field.spec.meta.example){
                try {
                    console.log("Validating",field_name,field.spec.meta.example,field)
                    field.validateSync(field.spec.meta.example, { strict: true })
                } catch(err){
                    throw new Error(`Example for field: ${field_name || "<anonymous_field>"} is invalid: \n${JSON.stringify(err.errors).replace("this",field_name || "<anonymous_field>")}`)
                }
            }
            schema.example = field.spec.meta.example
        }
        return schema;
    }
    throw new Error("parse_field failed: unsupported type: ", type)
}

Interpreter.prototype.parse_request_body = yup_schema => {
    let requestBody = {
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {

                    }
                }
            }
        }
    }
    requestBody.content["application/json"].schema = Interpreter.prototype.parse_field(yup_schema);
    return requestBody
}
Interpreter.prototype.parse_meta = ({meta}) => {
    let required_fields = [ "path", "method" ]
    for (required_field of required_fields) {
        if (Object.keys(meta).indexOf(required_field) === -1){
            throw new Error("parse_meta required field failed on field: ", required_field)
        }
    }
    return {
        [meta.path]: { [meta.method]: {
                summary: meta.summary || "No summary",
                description: meta.description || "No description",
            }}
    }
}

Interpreter.prototype.parse_query_or_params_or_headers = (in_,schema) => {
    let parameters = [];
    let fields = Object.keys(schema.fields)
    for (field of fields){
        let field_schema = schema.fields[field]
        parameters.push({
            in: in_,
            name: field,
            schema: Interpreter.prototype.parse_field(field_schema),
            required: field_schema.spec.presence === "required",
            description: field_schema.spec.meta && field_schema.spec.meta.description
        })
    }
    console.log({parameters})
    return parameters;
}

Interpreter.prototype.parse_query = query => Interpreter.prototype.parse_query_or_params_or_headers("query",query)
Interpreter.prototype.parse_params = params => Interpreter.prototype.parse_query_or_params_or_headers("path",params)
Interpreter.prototype.parse_headers = headers => Interpreter.prototype.parse_query_or_params_or_headers("header",headers)

Interpreter.prototype.parse_schema = yup_schema => {
    let swagger_path
    let { spec: { meta } } = yup_schema
    if (meta) swagger_path = { ...(Interpreter.prototype.parse_meta({ meta })) }
    else throw new Error("meta is required")

    if ((yup_schema instanceof yup.object) === false){
        throw new Error("Schema must be a object")
    }

    let inside_path = swagger_path[Object.keys(swagger_path)[0]][meta.method]
    let errors = []
    try {
        yup_schema.fields.requestBody.validateSync({}, { abortEarly: false, strict: true })
    } catch(err) {
        errors = err.errors
    }
    inside_path.responses = {
        200: { description: "success" },
        403: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    schema: { type: "object", properties: {
                            code: { type: "number", example: 403 },
                            message: { type: "string", example: "error" },
                            errors: {
                                type: "array",
                                items: { oneOf: [ { type: "string" } ] },
                                example: errors
                            },
                        }}
                }
            }
        }
    }
    let { requestBody, query, params, headers } = yup_schema.fields;
    if (requestBody) inside_path.requestBody = Interpreter.prototype.parse_request_body(requestBody)
    inside_path.parameters = []
    if (query) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_query(query));
    if (params) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_params(params));
    if (headers) inside_path.parameters = inside_path.parameters.concat(Interpreter.prototype.parse_headers(headers));

    let { responses } = meta;
    if (responses) {
        for (let [statusCode, definition] of Object.entries(responses)) {
            inside_path.responses[statusCode] = definition;
        }
    }

    return swagger_path
}

let createResponseObject = (responseDescription, responseNumber, bodyProperties) => {
    return {
        "description": responseDescription,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "statusCode": {
                            "type": "number",
                            "example": responseNumber
                        },
                        ...(bodyProperties && {
                            "body": {
                                "type": "object",
                                "properties": bodyProperties
                            }
                        })
                    }
                }
            }
        }
    };
};

module.exports = { Interpreter, createResponseObject }
