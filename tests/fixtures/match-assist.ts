import { explorerResponse, explorerRows } from "./match-explorer"
import { emptyFilters } from "../../src/features/match/searchModel"
import { snapshotId } from "./match-dataset"
export const token="a".repeat(32)
export function assisted(body:any, id=token) {
  const base=explorerResponse({...body,query:"",top_k:10})
  return {...base,query:body.query,search_mode:"hybrid",total_matches:null,has_more:false,
    results:base.results.map(row=>({...row,match_kind:"hybrid",match_score:.72,relevance_score:.7,rank_fusion:true})),
    interpretation:{query:"HPLC calibration drift and verification failures",origin:"llm"},
    submitted_criteria:{query:body.query,site:null,all_sites:true,top_k:10,mode:"auto",offset:0,filters:emptyFilters(),assist:true,...body},summary_id:id}
}
export function overview(id=token) {
  const refs=[explorerRows[0].pr_id]
  return {search_id:id,source_snapshot_id:snapshotId,reviewed_ids:refs,returned_count:3,lines:[
    {text:"Fictional historical records describe HPLC calibration issues.",references:refs},
    {text:"Fictional source findings distinguish verification drift from other mechanisms.",references:refs},
    {text:"The fictional linked CAPA status requires source review before reuse.",references:refs},
  ]}
}
