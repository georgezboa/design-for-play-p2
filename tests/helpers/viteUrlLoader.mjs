// Node module hooks for tests that import browser modules using Vite's
// `?url` asset imports: the import resolves to a module exporting the path.
// Register with `register(new URL('./helpers/viteUrlLoader.mjs', import.meta.url))`.

export async function resolve(specifier, context, next) {
  if (specifier.includes('?url')) {
    const url = new URL(specifier, context.parentURL);
    return { url: `vite-url:${url.pathname}`, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith('vite-url:')) {
    return { format: 'module', source: `export default ${JSON.stringify(url.slice('vite-url:'.length))};`, shortCircuit: true };
  }
  return next(url, context);
}
