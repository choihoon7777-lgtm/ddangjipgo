import{adapt}from"../../../lib/jitgo-api-adapter";
const handler=require("../../../lib/jitgo-api/building-envelope");
export async function GET(request){return adapt(handler,request)}
