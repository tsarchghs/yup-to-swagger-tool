
const yup = require("yup")

function Interpreter() {};

Interpreter.prototype.parse_string_field = field => {
    return { type: "string" }
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
    let { type } = field;
    console.log("DEBUG: parse_field - ",type)
    let schema; 
    if (type === "string") schema = Interpreter.prototype.parse_string_field(field);
    if (type === "boolean") schema = { type: "boolean" }
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

    return swagger_path
}

let interpreter = new Interpreter();


let result = interpreter.parse_schema(
    yup.object().shape({
        requestBody: yup.object().shape({
            name: yup.string().required().meta({ example: "Gjergj"}),
            user: yup.object().shape({
                id: yup.number().integer().required()
            }).required().meta({ example: { id: 1 }}),
            items: yup.array().of(yup.number()).required().meta({ example: [1,2,3] }),
            items_2: yup.array().of(yup.string()).required().meta({ example:  [ "SDDSA", "SDAASD" ] }),
            required: yup.boolean().required().meta({ example: true })
        }),
        query: yup.object().shape({
            err_per_field: yup.boolean()
        }),
        params: yup.object().shape({
            user_id: yup.number().integer().required()
        }),
        headers: yup.object().shape({
            Authorization: yup.string().required()
        })
    }).meta({ path: "/users/{user_id}", method: "post", summary: "Update a user", description: "Update a user" })
)

console.log(interpreter.paths)

console.log(JSON.stringify(result,null,' '));

module.exports = { Interpreter }