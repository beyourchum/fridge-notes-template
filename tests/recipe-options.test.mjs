import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeStock,recipeMaterials,materialSummary,toggleOptionalSelection} from '../app/kitchen.ts';
import {optionalGroupsSchema} from '../app/recipe-options-schema.ts';

const egg={id:'egg',name:'雞蛋',amount:2,unit:'顆'};
const corn={id:'corn',name:'玉米',amount:null,unit:'克'};
const cheese={id:'cheese',name:'起司',amount:1,unit:'片'};
const group={id:'extras',name:'加料',mode:'any',options:[corn,cheese]};
const recipe={id:'recipe',name:'蒸蛋',ingredients:'雞蛋',steps:'拌勻',materials:[egg],optionalGroups:[group]};

test('optional choices never prevent stocked required ingredients from being ready',()=>{
  const items=[{id:'stock',name:'雞蛋',qty:2}];
  assert.equal(recipeStock(recipe,items).status,'ready');
  assert.deepEqual(recipeStock(recipe,[]).missing,['雞蛋']);
  assert.equal(recipeStock({...recipe,materials:[]},[]).status,'unknown');
  assert.match(materialSummary(recipe),/選配：加料（玉米／起司）/);
});
test('one-choice groups replace the prior choice and allow choosing none',()=>{
  const one={...group,mode:'one'};
  assert.deepEqual(toggleOptionalSelection(one,['corn'],'cheese'),['cheese']);
  assert.deepEqual(toggleOptionalSelection(one,['corn'],'corn'),[]);
});
test('free-choice groups allow multiple selections, removal, and ignore stale IDs',()=>{
  assert.deepEqual(toggleOptionalSelection(group,['corn'],'cheese'),['corn','cheese']);
  assert.deepEqual(toggleOptionalSelection(group,['corn','cheese'],'corn'),['cheese']);
  assert.deepEqual(toggleOptionalSelection(group,['deleted'],'corn'),['corn']);
  assert.deepEqual(toggleOptionalSelection(group,['corn'],'unknown'),['corn']);
});
test('saved groups round-trip with modes, quantities and custom units; malformed groups fail',()=>{
  const groups=[group,{...group,id:'one',mode:'one',options:[{...corn,unit:'碗'}]}];
  assert.deepEqual(optionalGroupsSchema.parse(JSON.parse(JSON.stringify(groups))),groups);
  for(const invalid of [
    {...group,mode:'invalid'}, {...group,name:' '}, {...group,options:[]},
    {...group,options:[corn,corn]}, {...group,options:[{...corn,amount:-1}]},
    {...group,options:[{...corn,name:' '}]},
  ])assert.equal(optionalGroupsSchema.safeParse([invalid]).success,false);
  assert.equal(optionalGroupsSchema.safeParse([group,group]).success,false);
  assert.deepEqual(optionalGroupsSchema.parse([]),[]);
});
test('existing structured and legacy recipes keep required material behavior',()=>{
  assert.deepEqual(recipeMaterials({...recipe,optionalGroups:undefined}),[egg]);
  const legacy={id:'old',name:'舊食譜',ingredients:'雞蛋\n水',steps:'拌勻'};
  assert.deepEqual(recipeMaterials(legacy).map(m=>m.name),['雞蛋','水']);
  assert.deepEqual(recipeStock(legacy,[]).missing,['雞蛋','水']);
});
