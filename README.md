# yup-to-swagger-tool
<warning>- Early version: Being actively developed and tested on a real project</warning>

<h3>Idea</h3>
<h5>Being able to validate request data using yup and a middleware per route, and also getting auto-generated swagger docs along with it</h5>

<h3>Installation:<h3> 
<h6><code>npm install yup-to-swagger-tool</code></h6>

<h3>Usage:</h3>

<code>yts_interpreter.js</code>
```
  const { Interpreter: YtsInterpreter } = require("yup-to-swagger-tool") 

  const yts_interpreter = new YtsInterpreter({
      securitySchemes: [
          {
              "jwt_auth" : {
                  "description" : "Example value: \"Bearer <jwt_token>\"",
                  "type" : "apiKey",
                  "name" : "Authorization",
                  "in" : "header"
              }
          }
      ]
  });

  module.exports = jts_interpreter
```
<code>YtsInterpreter constructors accepts securitySchemes, paths, tags optional arguments</code><br/>
<code>You can add tags outside constructors, using: <b>.add_tag</b></code><br/>
<code>Initialization</code>
``` 
const { Interpreter: YtsInterpreter } = require("./yts_interpreter.js") 

let interpreter = new Interpreter();
```

<code>parse_schema</code>
```
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
    }).meta({ 
        path: "/users/{user_id}",
        security: "jwt_auth", 
        method: "post", 
        summary: "Update a user", 
        description: "Update a user",
        responses: {
            200: createResponseObject("Return the updated user", 200, {"id": {"type":"string"}, "name": {"type":"string"}})
        }
    })
)
console.log(JSON.stringify(result))
```

<code>Result is appended to yts interpreter instance <b>.paths</b> property automatically</code><br/>
<code>Accessing all paths created from .parse_schema: yts_interpreter.paths</code>

<h1>Express Possible usa-case</h1>
<code>./middlewares/validateRequest.js</code><br/>

```
const { ErrorHandler } = require("../utils/error")
const jts_interpreter = require("../jts_interpreter")

module.exports = (yupSchema,options) => {
    if (options && options.auto_docs_enabled){
        jts_interpreter.parse_schema(yupSchema)
        console.log(jts_interpreter.paths)
    }
    return async (req,res,next) => {
       try {
           await yupSchema.validate({
                requestBody: req.body.body ? req.body.body : req.body,
                query: req.query,
                params: req.params
           }, { abortEarly: false, strict: (options.strict === undefined) ? true : options.strict  })
       } catch (err) {
           let errors = req.query.err_per_field ? err.inner : err.errors
           throw new ErrorHandler(403,"Validation error",errors)
       }
        next()
    }
}
```
<code>./utils/errors.js</code><br/>
```
  class ErrorHandler extends Error {
      constructor(code, message, errors) {
          super();
          this.code = code;
          this.message = message;
          this.errors = errors;
      }
  }

  ErrorHandler.get404 = function(type){
      return new ErrorHandler(404, `${type} not found`)
  }

  const handleError = (err, res) => {
      const { code, message, errors } = err;
      return res.status(code || 500).json({
          status: "error",
          code,
          message,
          errors
      });
  };

  module.exports = {
      ErrorHandler,
      handleError
  }
```

<code>Now on routes</code><br/>

```
  app.get('/auth', [
      ...
      validateRequest(
          yup.object().meta({ path: "/auth", method: "get", security: "jwt_auth", tag: "Auth" })
      ,true, { auto_docs_enabled: true })
  ], async (req, res) => {
      ...
  });

  app.post('/auth', validateRequest(
      yup.object().shape({
          requestBody: yup.object().shape({
              email: email.required(),
              password: password.required(),
          }).required()
      }).meta({ path: "/auth", method: "post", tag: "Auth" })
      ,true, { auto_docs_enabled: true }), async (req, res) => {
      ...
  });
```

Result: We get request data validated, and with a little more effort we have generated swagger with it.
Then you can pass <b>.paths</b> to swaggerDocument.<br/>
Auto-generated docs with help of yup-to-swagger-tool: 
![image](https://user-images.githubusercontent.com/24304449/111078484-ef34c900-84f5-11eb-9a25-c12703c3d067.png)
