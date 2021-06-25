
const yup = require("yup")

class Interpreter {
    constructor({
        securitySchemes,
        paths,
        tags,

    }){
        this.securitySchemes = securitySchemes || []
        this.paths = paths || {}
        this.tags = tags || []
    }
    _tag_schema_ = yup.object().shape({
        name: yup.string().required(),
        description: yup.string().required()
    })
    add_tag = ({ name, description }) => {
        this._tag_schema_.validateSync({
            name, description
        })
        this.tags.push({
            name, description
        })
    }
    parse_string_field = field => {
        return { type: "string" }
    }
    parse_number_field = field => {
        return { type: "number" }
    }
    parse_meta = ({meta}) => {
        let required_fields = [ "path", "method" ]
        for (let required_field of required_fields) {
            if (Object.keys(meta).indexOf(required_field) === -1){
                throw new Error("parse_meta required field failed on field: ", required_field)
            }
        }
        let tags = [];
        if (meta.tag) tags.push(meta.tag);
        if (meta.tags) tags.push(meta.tags)
        return {
            [meta.path]: { [meta.method]: {
                summary: meta.summary || "No summary",
                description: meta.description || "No description",
                tags,
                security: !meta.security ? undefined :
                [ {
                    [meta.security] : [ ]
                } ],
            }}
        }
    }
    parse_object_field = object_field => {
        let required = []
        let properties = {}
        let fields = Object.keys(object_field.fields);
        for (let field of fields){
            let field_schema = object_field.fields[field];
            if (field_schema.spec && field_schema.spec.presence === "required") required.push(field);
            properties[field] = this.parse_field(field_schema,field);
        }
        let parsed =  {
            type: "object",
            properties,
        }
        if (required.length) parsed.required = required;
        return parsed;
    }
    parse_array_field_whitelist_list = set => {
        let oneOf = []
        for (schema of set.values()) {
            oneOf.push(this.parse_field(schema))
        }
        return { oneOf }
    }
    parse_array_field = object_field => {
        let items;
        if (object_field._whitelist.list.size) {
            items = this.parse_array_field_whitelist_list(
                object_field._whitelist.list
            )
        }
        else if (object_field.innerType) {
            items = { oneOf: [ this.parse_field(object_field.innerType) ]}
        }
        return {
            type: "array",
            items
        }
    }
    parse_query_or_params_or_headers = (in_,schema) => {
        let parameters = [];
        let fields = Object.keys(schema.fields)
        for (field of fields){
            let field_schema = schema.fields[field]
            parameters.push({
                in: in_,
                name: field,
                schema: this.parse_field(field_schema),
                required: field_schema.spec && field_schema.spec.presence === "required",
                description: field_schema.spec && field_schema.spec.meta && field_schema.spec.meta.description
            })
        }
        console.log({parameters})
        return parameters;
    }
    parse_query = query => this.parse_query_or_params_or_headers("query",query)
    parse_params = params => this.parse_query_or_params_or_headers("path",params)
    parse_headers = headers => this.parse_query_or_params_or_headers("header",headers)
    parse_field = (field,field_name) => {
        let { type } = field;
        console.log("DEBUG: parse_field - ",type)
        let schema;
        if (type === "string") schema = this.parse_string_field(field);
        if (type === "boolean") schema = { type: "boolean" }
        else if (type === "number") schema = this.parse_number_field(field);
        else if (type === "array") schema = this.parse_array_field(field);
        else if (type === "object") schema = this.parse_object_field(field);
        if (schema){
            if (field.spec && field.spec.meta) {
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
    parse_request_body = yup_schema => {
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
        requestBody.content["application/json"].schema = this.parse_field(yup_schema);
        return requestBody
    }
    add_path = path_schema => {
        let key = Object.keys(path_schema)[0]
        let a = this.paths[key]
        if (!a) this.paths[key] = {}
        let sub_key = Object.keys(path_schema[Object.keys(path_schema)[0]])[0]
        this.paths[key][sub_key] = path_schema[key][sub_key]
        return true;
    }
    parse_schema = yup_schema => {
        let swagger_path
        console.log(yup_schema._meta,999)
        let meta;
        try {
            let { spec: { meta: _meta_ } } = yup_schema
            meta = _meta_;
        } catch(err){
            meta = yup_schema._meta;
        }
        if (meta) swagger_path = { ...(this.parse_meta({ meta })) }
        else throw new Error("meta is required")

        if (yup_schema.type !== "object"){
            console.log(yup_schema,13)
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
        if (requestBody) inside_path.requestBody = this.parse_request_body(requestBody)
        inside_path.parameters = []
        if (query) inside_path.parameters = inside_path.parameters.concat(this.parse_query(query));
        if (params) inside_path.parameters = inside_path.parameters.concat(this.parse_params(params));
        if (headers) inside_path.parameters = inside_path.parameters.concat(this.parse_headers(headers));
        this.add_path(swagger_path)

        let { responses } = meta;
        if (responses) {
            for (let [statusCode, definition] of Object.entries(responses)) {
                inside_path.responses[statusCode] = definition;
            }
        }

        return swagger_path
    }

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
