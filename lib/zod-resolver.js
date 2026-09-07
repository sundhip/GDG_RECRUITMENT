export function zodResolver(schema) {
  return async (values) => {
    try {
      const parsed = schema.safeParse(values);
      if (parsed.success) {
        return { values: parsed.data, errors: {} };
      }
      const errors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = { type: issue.code, message: issue.message };
        }
      }
      return { values: {}, errors };
    } catch (err) {
      return { values: {}, errors: { root: { message: err.message } } };
    }
  };
}
