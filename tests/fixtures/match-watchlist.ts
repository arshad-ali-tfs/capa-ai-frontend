import {snapshotId,details} from "./match-dataset"
export const quote="Fictional EQ-001 calibration failed; the analyst corrected the instrument setup."
export function watchlist(prId=details[0].pr_id,site=details[0].site,asOf="2026-11-21",label="EQ-001") {
  const proof={field:"DETAILED_DESCRIPTION",start:0,end:Array.from(quote).length,quote}
  const reference=(id:string,opened:string)=>({...proof,pr_id:id,site,record_name:`Fictional ${label} calibration record`,date_opened:opened,criticality:"Minor",status:"Closed - Done"})
  return {version:"match-watchlist-v1",pr_id:prId,site,source_snapshot_id:snapshotId,method:"deterministic",as_of:asOf,recent_from:`${Number(asOf.slice(0,4))-1}${asOf.slice(4)}`,scope:"same_site_indexed_history",scope_record_count:4,other_record_count:3,opened_from:"2020-01-01",opened_to:"2026-01-01",undated_count:0,future_dated_count:0,available_signals:1,interpretation:"Distinct other indexed deviations at this site.",signals:[{
    key:"equipment:eq001",kind:"equipment",label,other_record_count:2,failure_indicator_count:1,last_12_months:1,last_opened:"2026-01-01",year_counts:[{year:2021,count:1},{year:2026,count:1}],evidence:[reference("HISTORY-1","2026-01-01"),reference("HISTORY-2","2021-01-01")],seed_evidence:proof,search_query:label,
  }]}
}
