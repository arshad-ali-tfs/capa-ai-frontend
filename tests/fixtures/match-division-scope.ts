import type {Page} from "@playwright/test"
import {emptyFilters} from "../../src/features/match/searchModel"
import {scopeFilters,workflowState,rowMatchesScope} from "../../src/features/match/scopeModel"
import {index,details,snapshotId} from "./match-dataset"
import {explorerRows} from "./match-explorer"

export const scopeRows=[
  {...explorerRows[0],division:"DPD",status:"Closed - Done"},
  {...explorerRows[1],division:"DSD",status:"Closed - Done"},
  {...explorerRows[2],division:"Global",status:"Closed - Done"},
  {...explorerRows[0],pr_id:"DEV-CTD-1",division:"CTD",status:"Closed - Done"},
  {...explorerRows[0],pr_id:"DEV-OPEN-1",division:"DSD",status:"Open - Investigation"},
  {...explorerRows[0],pr_id:"DEV-CANCEL-1",division:"DPD",status:"Closed - Cancelled"},
]
const counts=(rows:typeof scopeRows)=>{const c={completed:0,ongoing:0,cancelled:0,other:0};for(const row of rows)c[workflowState(row.status)]++;return c}
export async function installScopeAPI(page:Page,active=true){
  const rows=scopeRows.filter(row=>active||workflowState(row.status)!=="ongoing")
  const requests:any[]=[];const watchRequests:URL[]=[]
  const selected=(body:any)=>rows.filter(row=>(!body.site||row.site===body.site)&&rowMatchesScope(row,{...emptyFilters(),...body.filters}))
  await page.route("**/api/v1/match/index",route=>route.fulfill({json:{...index,searchable_records:rows.length,allowed_sites:[...new Set(rows.map(row=>row.site))].map(site=>({site,deviation_count:rows.filter(row=>row.site===site).length})),division_scope:["CTD","DPD","DSD","Global"],status_counts:counts(rows),semantic_state:"ready"}}))
  await page.route("**/api/v1/match/facets",route=>{
    const body=route.request().postDataJSON(),f={...emptyFilters(),...body.filters},facets:any={}
    for(const [key,field] of Object.entries({divisions:"division",statuses:"status",years:"date_opened",criticalities:"criticality",dr_types:"dr_type",departments:"responsible_department"})){
      const groups=new Map<string|number,number>()
      for(const row of rows.filter(row=>(!body.site||row.site===body.site)&&rowMatchesScope(row,{...f,[key]:[]}))){const value=key==="years"?Number(row.date_opened.slice(0,4)):(row as any)[field];groups.set(value,(groups.get(value)||0)+1)}
      facets[key]=[...groups].map(([value,count])=>({value,count}))
    }
    return route.fulfill({json:{source_snapshot_id:snapshotId,site:body.site||"All sites",all_sites:!body.site,filters:f,facets,scope_record_count:rows.length,eligible_record_count:selected(body).length,missing_opened_dates:0,status_counts:counts(rows.filter(row=>!f.divisions.length||f.divisions.includes(row.division)))}})
  })
  await page.route("**/api/v1/match/search",route=>{
    const body=route.request().postDataJSON();requests.push(body)
    const all=selected(body),matched=body.query?all.filter(row=>row.pr_id===body.query||row.matched_excerpt.toLowerCase().includes(body.query.toLowerCase())):all
    const kind=body.query?"keyword":"browse",offset=body.offset||0,limit=body.top_k||10,results=matched.slice(offset,offset+limit).map(row=>({...row,match_score:null,match_kind:kind,matched_spans:[],match_reasons:["Matches the applied filters"]}))
    return route.fulfill({json:{query:body.query,site:body.site||"All sites",all_sites:!body.site,source_snapshot_id:snapshotId,mock_embeddings:false,requested_mode:body.mode,search_mode:kind,filters:{...emptyFilters(),...body.filters},scope_record_count:rows.length,eligible_record_count:all.length,total_matches:matched.length,result_count:results.length,offset,limit,has_more:false,results}})
  })
  await page.route("**/api/v1/match/matched-records/*?*",route=>{
    const url=new URL(route.request().url()),id=decodeURIComponent(url.pathname.split("/").pop()!),row=rows.find(row=>row.pr_id===id)!
    return route.fulfill({json:{...details[0],...row,source_snapshot_id:snapshotId,original_field_texts:{DETAILED_DESCRIPTION:"FICTIONAL EQ-104 calibration failed."},related_capas:[]}})
  })
  await page.route("**/api/v1/match/matched-records/*/watchlist?*",route=>{
    const url=new URL(route.request().url());watchRequests.push(url)
    const id=decodeURIComponent(url.pathname.split("/").at(-2)!),selectedRow=rows.find(row=>row.pr_id===id)!
    const f={...emptyFilters(),divisions:url.searchParams.getAll("divisions"),statuses:url.searchParams.getAll("statuses"),record_scope:url.searchParams.get("record_scope") as any,include_cancelled:url.searchParams.get("include_cancelled")==="true"}
    const scope=rows.filter(row=>row.site===selectedRow.site&&rowMatchesScope(row,f)),other=scope.filter(row=>row.pr_id!==id),text="FICTIONAL EQ-104 calibration failed.",proof={field:"DETAILED_DESCRIPTION",start:0,end:text.length,quote:text}
    return route.fulfill({json:{version:"match-watchlist-division-status-v2",pr_id:id,site:selectedRow.site,source_snapshot_id:snapshotId,method:"deterministic",as_of:url.searchParams.get("as_of"),recent_from:"2025-11-21",scope:"same_site_indexed_history",scope_record_count:scope.length,other_record_count:other.length,selected_in_scope:scope.some(row=>row.pr_id===id),filters:scopeFilters(f),status_counts:counts(scope),available_status_counts:counts(rows),opened_from:"2020-01-01",opened_to:"2026-01-01",undated_count:0,future_dated_count:0,available_signals:1,interpretation:"Fictional scoped history.",signals:[{key:"equipment:eq104",kind:"equipment",label:"EQ-104",other_record_count:other.length,failure_indicator_count:0,last_12_months:0,last_opened:other.length?"2026-01-01":null,year_counts:[],status_counts:counts(other),evidence:other.slice(0,5).map(row=>({...row,...proof})),seed_evidence:proof,search_query:"EQ-104"}]}})
  })
  return {requests,watchRequests}
}
