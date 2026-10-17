export function orderProduce<T extends {id:string}>(items:T[],manual:string[]|undefined,rank:(item:T)=>number):T[]{
  const positions=new Map((manual??[]).map((id,index)=>[id,index]));
  return [...items].sort((a,b)=>manual
    ?(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity)
    :rank(a)-rank(b));
}
export function moveProduce(order:string[],id:string,targetId:string):string[]{
  const from=order.indexOf(id),to=order.indexOf(targetId);
  if(from<0||to<0||from===to)return order;
  const next=[...order];next.splice(from,1);next.splice(to,0,id);return next;
}
