const yup = require("yup");

module.exports = yup.object().shape({
    requestBody: yup.object().shape({
        name: yup.string().required()
    })
})