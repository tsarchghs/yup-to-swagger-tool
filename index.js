
const fs = require("fs")
const server_docs = require("./server-docs")
const YAML = require("yamljs")

class DocsCollector {
    constructor(swagger_definition_abs_file,output_swagger_definition_abs_file){
        this.output_swagger_definition_abs_file = output_swagger_definition_abs_file
        let swaggerDocumentJSON = fs.readFileSync(swagger_definition_abs_file, 'utf8');
        this.swaggerDocument = JSON.parse(swaggerDocumentJSON);
    }
    addPath({ 
        path, request_type, tags, security, 
        summary, operationId, responses, requestBody 
    }) {
        let path_definition = {
            [request_type]: {
                tags, security, summary, 
                operationId, responses, requestBody
            } 
        }
        if (!this.swaggerDocument.paths[path]) this.swaggerDocument.paths[path] = {}
        this.swaggerDocument.paths[path] = { 
            ...this.swaggerDocument.paths[path],
            ...path_definition
        }

        // let path_definition_responses = path_definition[path][requestBody].responses;
        // this.addResponses(path_definition_responses)
        // return path_definition_responses
    }
    addPaths(paths){
        for (let path of Object.keys(paths)){
            for (let request_type of Object.keys(paths[path])){
                this.addPath({ 
                    path, request_type, ...paths[path][request_type] 
                })
            }
        }
    }
    addPathsYAML(paths_file_abs_path){
        let { paths } = YAML.load(paths_file_abs_path)
        this.addPaths(paths);
    }
    addScheme({ name, required, type, properties }){
        this.swaggerDocument.components.schemas[name] = {
            required, type, properties
        }
    }
    addSchemas(schemas){
        for (let name of Object.keys(schemas)){
            this.addScheme({ name, ...schemas[name]});
        }
    }
    addSchemasYAML(schemas_file_abs_path){
        let { schemas } = YAML.load(schemas_file_abs_path)
        this.addSchemes(schemas)
    }
    generalAddYAML(file_abs_path){
        let { schemas, paths } = YAML.load(file_abs_path)
        if (schemas) this.addSchemas(schemas)
        if (paths) this.addPaths(paths)
    }
    generateSwaggerDocument(output_swagger_definition_abs_file){
        fs.writeFileSync(
            this.output_swagger_definition_abs_file,
            JSON.stringify(this.swaggerDocument)
        )
    }
    getExpressApp(){
        this.generateSwaggerDocument(this.output_swagger_definition_abs_file);
        return server_docs(this.output_swagger_definition_abs_file)
    }
}

// let swagger_file = __dirname + "/swagger.json"
// let swagger_file_output = __dirname + "/swagger_output.json"
// let docs_collector = new DocsCollector(swagger_file,swagger_file_output);
// // docs_collector.addPath({ 
// //     path: "/auth", request_type: "post",
// //     summary:" SUMMARRY ", 
// //     // operationId, responses, requestBody, tags, security,  
// // })
// docs_collector.generalAddYAML(__dirname + "/users_swagger.yaml")
// let app = docs_collector.getExpressApp()

// app.listen(4000, () => console.log("Listening on port 4000"))
// // global.docs_collector = docs_collector;

module.exports = DocsCollector