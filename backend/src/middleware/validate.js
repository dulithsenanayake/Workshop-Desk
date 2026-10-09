/** Validates req[source] with a zod schema; parsed (coerced, stripped) data lands in req.validated[source]. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req.validated = { ...req.validated, [source]: result.data };
  return next();
};
