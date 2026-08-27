const c=require("./client.js");
const PUUID="01a03fd3-3f64-7cc7-8fd6-8e95b30434d6";
const PMRN="or2796-fake-010b7d3f-a8dc-44aa-9540-f6f3838b37f7";
(async()=>{
  await c.login("admin","admin");
  const start = new Date(Date.now() - 4*3600*1000).toISOString();
  const r = await c.json("POST",`/api/admin/patients/${PUUID}/operations/create`,{startTime:start,procedureTypes:[{id:"p-appendectomy"}]},"demo-demo");
  console.log("createOperation", r.status, r.body);
})().catch(e=>console.log("ERR",e));
