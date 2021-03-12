
const express = require("express");
const swaggerUi = require('swagger-ui-express');
const fs = require("fs")

module.exports = (absolute_path) => {
    const app = express();
    const swaggerDocument = JSON.parse(
        fs.readFileSync(absolute_path, 'utf8')
    )
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));    
    return app
}