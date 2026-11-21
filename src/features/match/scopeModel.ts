import type { MatchFilters } from "./types"

export type WorkflowScope = "completed" | "ongoing" | "all"
export interface StatusCounts { completed:number; ongoing:number; cancelled:number; other:number }
export const scopeLabels = {completed:"Completed",ongoing:"Ongoing",all:"All investigations"} as const
export function scopeFilters(filters?:MatchFilters) {
  return {divisions:[...new Set((filters?.divisions??[]).map(value=>value.trim()))].sort(),statuses:[...new Set((filters?.statuses??[]).map(value=>value.trim()))].sort(),record_scope:filters?.record_scope??((filters as {status?:string}|undefined)?.status==="open"?"ongoing":"completed"),include_cancelled:filters?.include_cancelled??false}
}
export const watchScopeKey = (filters?:MatchFilters) => JSON.stringify(scopeFilters(filters))
export function parseScopeFilters(value:Record<string,unknown>) {
  const lists={} as {divisions:string[];statuses:string[]}
  for(const key of ["divisions","statuses"] as const){
    const list=value[key]??[]
    if(!Array.isArray(list)||list.length>50||list.some(v=>typeof v!=="string"||!v.trim()||v.length>200))throw new Error("Invalid division or status scope.")
    lists[key]=list as string[]
  }
  if(value.record_scope!==undefined&&!["completed","ongoing","all"].includes(value.record_scope as string)||value.include_cancelled!==undefined&&typeof value.include_cancelled!=="boolean")throw new Error("Invalid investigation scope.")
  return {...lists,record_scope:(value.record_scope??(value.status==="open"?"ongoing":"completed")) as WorkflowScope,include_cancelled:(value.include_cancelled??false) as boolean}
}
export function parseStatusCounts(value:unknown):StatusCounts|undefined {
  if(value===undefined)return undefined
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid investigation counts.")
  const result={} as StatusCounts
  for(const key of ["completed","ongoing","cancelled","other"] as const){const count=(value as Record<string,unknown>)[key];if(typeof count!=="number"||!Number.isSafeInteger(count)||count<0)throw new Error("Invalid investigation counts.");result[key]=count}
  return result
}
export function workflowState(status:string){
  const value=status.trim().toLowerCase().replace(/[\s\u2010-\u2015_-]+/g," ")
  return value==="closed done"?"completed":/\bcancell?ed\b/.test(value)?"cancelled":!value||value.startsWith("closed")||["unknown","n/a","none"].includes(value)?"other":"ongoing"
}
export function rowMatchesScope(row:{division?:string;status:string},filters:MatchFilters){
  const scope=scopeFilters(filters),state=workflowState(row.status)
  return (!scope.divisions.length||scope.divisions.some(value=>value.toLowerCase()===row.division?.trim().toLowerCase()))&&(!scope.statuses.length||scope.statuses.some(value=>value.toLowerCase()===row.status.trim().toLowerCase()))&&(state==="cancelled"?scope.record_scope==="all"&&scope.include_cancelled:scope.record_scope==="all"||state===scope.record_scope)
}
export function scopeChips(filters:MatchFilters){
  const value=scopeFilters(filters)
  return [
    ...value.divisions.map(value=>({key:"divisions" as const,value,label:`Division: ${value}`})),
    ...value.statuses.map(value=>({key:"statuses" as const,value,label:`Source status: ${value}`})),
    ...(value.record_scope!=="completed"?[{key:"record_scope" as const,value:value.record_scope,label:`Investigation status: ${scopeLabels[value.record_scope]}`}]:[]),
    ...(value.include_cancelled?[{key:"include_cancelled" as const,value:"true",label:"Include cancelled"}]:[]),
  ]
}
