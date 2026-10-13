import{adapt}from"../../../lib/jitgo-api-adapter";
import{landWithFailover}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/land-regulation");
export async function GET(request){return landWithFailover(request,"land-regulation",handler,"VWORLD_API_KEY",adapt)}
