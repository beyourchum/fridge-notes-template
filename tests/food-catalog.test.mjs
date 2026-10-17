import test from 'node:test';
import assert from 'node:assert/strict';
import {combinedMushroomName,defaultFoodUnit,foodOptions,isCombinedMushroomName,normalizeFoodName,seasonalFoodId} from '../app/food-catalog.ts';

test('mushroom inventory uses one combined option',()=>{
  const options=foodOptions('蔬果小格 1');
  assert.ok(options.includes(combinedMushroomName));
  assert.ok(!options.includes('鴻喜菇'));
  assert.ok(!options.includes('美白菇'));
});

test('old mushroom names normalize to the combined record',()=>{
  for(const name of ['鴻喜菇','鴻禧菇','美白菇','鴻喜菇、美白菇','鴻禧菇、美白菇']){
    assert.equal(isCombinedMushroomName(name),true);
    assert.equal(normalizeFoodName(name),combinedMushroomName);
    assert.equal(seasonalFoodId(name),'其他菇');
  }
  assert.equal(defaultFoodUnit(combinedMushroomName),'包');
});
