import {fetchRecipePage} from '../../../lib/recipe-web';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  const headers={'Cache-Control':'no-store'};
  if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'無效的請求來源。'},{status:403,headers});
  try{const body=await request.text();if(body.length>5000)return Response.json({error:'連結過長。'},{status:413,headers});const input=JSON.parse(body) as {url?:unknown};if(typeof input.url!=='string'||input.url.length>2048)return Response.json({error:'請提供有效連結。'},{status:400,headers});return Response.json(await fetchRecipePage(input.url),{headers});}
  catch(e){return Response.json({error:e instanceof SyntaxError?'無效的請求內容。':e instanceof Error?e.message:'讀取失敗，請改貼食譜文字。'},{status:422,headers});}
}
