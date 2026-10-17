import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipeText,parseIngredient,parseStep,normalizeOcrText} from '../app/import-recipe.ts';
import {validateRecipeUrl,extractRecipePage,fetchRecipePage} from '../lib/recipe-web.ts';

test('parses portions and explicit equipment without inventing missing quantities',()=>{
  const result=parseRecipeText('蒸蛋\n材料\n雞蛋 2 顆\n水 100 毫升\n鹽 少許\n做法\n1. 攪拌均勻\n2. 放入微波爐加熱 3 分鐘\n備註：每次依狀況調整');
  assert.equal(result.recipe.name,'蒸蛋');assert.equal(result.recipe.materials[0].amount,2);assert.equal(result.recipe.materials[1].unit,'毫升');assert.equal(result.recipe.materials[2].amount,null);assert.equal(result.recipe.materials[2].name,'鹽 少許');
  assert.equal(result.recipe.instructions[0].minutes,null);assert.equal(result.recipe.instructions[0].appliance,'');assert.equal(result.recipe.instructions[1].minutes,3);assert.equal(result.recipe.instructions[1].appliance,'微波爐');assert.deepEqual(result.unassigned,['備註：每次依狀況調整']);
});
test('handles fractions and refuses ambiguous ranges or multiple timers',()=>{
  assert.equal(parseIngredient('豆腐 1/2 盒').amount,0.5);assert.equal(parseIngredient('兩顆雞蛋').amount,2);assert.equal(parseIngredient('鹽 1 至 2 茶匙').amount,null);assert.equal(parseIngredient('鹽 0.0001 克').amount,null);
  assert.equal(parseStep('微波爐 2 至 3 分鐘').minutes,null);assert.equal(parseStep('攪拌 2 分鐘，微波爐 3 分鐘').minutes,null);assert.equal(parseStep('氣炸鍋 30 秒').minutes,0.5);
});
test('unsupported text stays available for review and oversized input is rejected',()=>{
  const r=parseRecipeText('我的料理\n自由敘述沒有材料表，也沒有份量。');assert.equal(r.recipe.materials.length,0);assert.equal(r.unassigned.length,1);assert(r.warnings.length>0);assert.throws(()=>parseRecipeText('x'.repeat(30001)));
});
test('extracts recipe JSON-LD and ordered HowToSection content',()=>{
  const r=extractRecipePage('<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Recipe',name:'測試食譜',recipeIngredient:['雞蛋 2 顆','水 100 毫升'],recipeInstructions:[{'@type':'HowToSection',itemListElement:[{'@type':'HowToStep',text:'混合材料'},{'@type':'HowToStep',text:'微波爐 3 分鐘'}]}]}]})+'</script>');
  assert.equal(r.method,'網頁食譜資料');assert(r.text.includes('混合材料\n微波爐 3 分鐘'));
});
test('video descriptions are explicitly distinguished from watching video',()=>{
  const r=extractRecipePage('<script>var ytInitialPlayerResponse = '+JSON.stringify({videoDetails:{title:'料理',shortDescription:'材料\n雞蛋 2 顆\n做法\n拌勻'}})+';</script>');assert.equal(r.method,'影片說明欄');assert(r.warnings[0].includes('未分析影片'));assert.throws(()=>extractRecipePage('<html>請登入</html>'));
});
test('private addresses, credentials, unsupported hosts and redirect escapes are blocked',async()=>{
  for(const url of ['http://youtube.com/a','https://127.0.0.1','https://[::1]','https://youtube.com.evil.invalid','https://user:pass@youtube.com/a','https://youtube.com:8443/a','file:///etc/passwd'])assert.throws(()=>validateRecipeUrl(url));
  let calls=0;await assert.rejects(fetchRecipePage('https://youtu.be/example',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});}),/目前支援/);assert.equal(calls,1);
});
test('fetch errors and large content do not become successful imports',async()=>{
  await assert.rejects(fetchRecipePage('https://www.youtube.com/watch?v=example',async()=>new Response('login',{status:403})),/不允許/);
  await assert.rejects(fetchRecipePage('https://icook.tw/recipes/example',async()=>new Response('x'.repeat(2500001),{headers:{'content-type':'text/html'}})),/頁面過大/);
});
test('OCR Chinese character spacing is normalized before section and timer detection',()=>{
  const original='圖 片 食 譜\n材 料\n雞 蛋 2 顆\n做 法\n1. 微波 爐 加 熱 3 分 鐘';
  const parsed=parseRecipeText(normalizeOcrText(original));assert.equal(parsed.recipe.materials[0].name,'雞蛋');assert.equal(parsed.recipe.instructions[0].appliance,'微波爐');assert.equal(parsed.recipe.instructions[0].minutes,3);
});
