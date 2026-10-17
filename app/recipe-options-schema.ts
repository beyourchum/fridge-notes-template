import {z} from 'zod';

export const ingredientSchema=z.object({
  id:z.string().min(1).max(100),
  name:z.string().trim().min(1).max(10000),
  amount:z.number().finite().positive().max(100000).nullable(),
  unit:z.string().trim().min(1).max(20),
});
export const optionalGroupsSchema=z.array(z.object({
  id:z.string().min(1).max(100),
  name:z.string().trim().min(1).max(100),
  mode:z.enum(['one','any']),
  options:z.array(ingredientSchema).min(1).max(200)
    .refine(options=>new Set(options.map(option=>option.id)).size===options.length),
})).max(50).refine(groups=>new Set(groups.map(group=>group.id)).size===groups.length);
