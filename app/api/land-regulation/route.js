import{adapt}from"../../../lib/jitgo-api-adapter";
const handler=require("../../../lib/jitgo-api/land-regulation");
export async function GET(request){return adapt(handler,request)}
