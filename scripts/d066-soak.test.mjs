import { test } from "node:test";
import { strict as assert } from "node:assert";
import { evaluateSoak, median, p95 } from "./d066-soak.mjs";
const M=1024*1024;
const samples=(base=100*M,final=120*M)=>[
  ...Array.from({length:9},(_,i)=>({sec:60+i*15,rss:base})),
  ...Array.from({length:20},(_,i)=>({sec:1500+i*15,rss:final}))
];
test("median and p95 handle numerically sorted positive series",()=>{
  assert.equal(median([3,1,2]),2);
  assert.equal(median([1,5,3,7]),4);
  assert.equal(p95([1,2,3,4,5]),5);
});
test("steady server RSS passes bounded 30min evaluation",()=>assert.equal(evaluateSoak(samples(),1800).passed,true));
test("sustained 180MiB growth fails conservative 30min bound",()=>assert.equal(evaluateSoak(samples(100*M,280*M),1800).passed,false));
test("soak cannot be shortened to 10 seconds for acceptance",()=>assert.throws(()=>evaluateSoak(samples(),10),/30 minutes/));
test("insufficient final or baseline evidence is failure",()=>assert.throws(()=>evaluateSoak(samples().slice(0,9),1800),/Insufficient/));
