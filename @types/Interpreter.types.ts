import {AnyObject} from "yup/lib/types";
import {OpenAPI} from "./openapi";
import {BaseSchema} from "yup";
import Schema = OpenAPI.Schema;
import ResponsesObject = OpenAPI.ResponsesObject;

export interface YUPMetaObject {
    path: string;
    method: "get" | "put" | "post" | "delete" | "options" | "head" | "patch";
    summary?: string;
    description?: string;
    responses?: ResponsesObject;
}

interface Parser {
    parse_schema<TCast = any, TContext = AnyObject, TOutput = any>(yup_schema?: BaseSchema<TCast, TContext, TOutput>): Schema;

    parse_meta(meta: object): Schema;
}
