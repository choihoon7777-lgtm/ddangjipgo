import{adapt}from"../../../lib/jitgo-api-adapter";
import{landWithFailover}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/land-transactions");
export async function GET(request){return landWithFailover(request,"land-transactions",handler,"DATA_GO_KR_SERVICE_KEY",adapt)}
