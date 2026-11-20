export function downloadJson(name:string,value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json;charset=utf-8"}))
  const anchor=document.createElement("a")
  anchor.href=url;anchor.download=name.replace(/[^A-Za-z0-9_.-]/g,"_")
  anchor.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
