class ApiError extends Error{
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        errors =[],
    ){
        super(message),
        this.statusCode = statusCode,
        this.errors = errors,
        this.data = null,
        this.message = message,
        this.success=false
    }
}
module.exports = { ApiError }