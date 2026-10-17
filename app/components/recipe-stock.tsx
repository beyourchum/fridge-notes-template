import {recipeStock,type Recipe,type Item} from '../kitchen';

export function RecipeStock({recipe,items}:{recipe:Recipe;items:Item[]}) {
  const stock=recipeStock(recipe,items);
  if(stock.status==='unknown')return <span className="stock-badge">{recipe.optionalGroups?.some(g=>g.options.length)?'材料皆為選配':'尚未填寫材料'}</span>;
  return <div className="recipe-stock">
    <span className={'stock-badge '+stock.status}>{stock.status==='ready'?'✅ 食材齊全':stock.status==='near'?`🛒 只差 ${stock.missing.length} 樣`:`還缺 ${stock.missing.length} 樣`}</span>
    {stock.missing.length>0&&<span className="stock-missing">缺少：{stock.missing.join('、')}</span>}
  </div>;
}
