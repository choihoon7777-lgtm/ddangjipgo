import{adapt}from"../../../lib/jitgo-api-adapter";
const handler=require("../../../lib/jitgo-api/land");
export async function GET(request){return adapt(handler,request)}
