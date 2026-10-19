import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sceneRoot = path.join(root, "public/intro-scene");
const runtime = path.join(sceneRoot, "runtime");
const digest = bytes => createHash("sha256").update(bytes).digest("hex").slice(0, 12);

/** Build-time work only: browsers receive minified, content-addressed assets. */
export async function buildIntro() {
  await mkdir(runtime, { recursive: true });
  const definitions = {
    model: ["assets/algolab-robot-demo.glb", "robot"],
    landscape: ["assets/landscape/cloudy-mountains-cc0.jpg", "landscape"],
    brand: ["assets/algolab-brand.png", "brand"],
    soundtrack: ["../media/intro/algolab-soundtrack.mp3", "soundtrack"],
  };
  const assets = {};
  const replacements = new Map();
  for (const [key, [source, name]] of Object.entries(definitions)) {
    const bytes = await readFile(path.join(sceneRoot, source));
    const filename = `${name}-${digest(bytes)}${path.extname(source)}`;
    await writeFile(path.join(runtime, filename), bytes);
    assets[key] = `/intro-scene/runtime/${filename}`;
    replacements.set(`../${source}`, assets[key]);
  }
  const result = await build({
    absWorkingDir: root,
    entryPoints: ["public/intro-scene/src/film.js"],
    outdir: runtime,
    bundle: true,
    minify: true,
    treeShaking: true,
    format: "esm",
    splitting: true,
    target: ["es2020"],
    entryNames: "film-[hash]",
    chunkNames: "chunk-[hash]",
    legalComments: "linked",
    write: false,
    metafile: true,
    // Addons and authored code must share exactly one copy of Three.js.
    alias: { three: path.join(sceneRoot, "assets/vendor/three.module.js") },
    plugins: [{
      name: "content-addressed-intro-assets",
      setup(builder) {
        builder.onLoad({ filter: /[/\\]intro-scene[/\\]src[/\\].*\.js$/ }, async ({ path: filename }) => {
          const source = await readFile(filename, "utf8");
          const contents = source.replace(/new URL\('([^']+)',\s*import\.meta\.url\)\.href/g, (expression, asset) => {
            return replacements.has(asset) ? JSON.stringify(replacements.get(asset)) : expression;
          });
          return { contents, loader: "js", resolveDir: path.dirname(filename) };
        });
      },
    }],
  });
  for (const file of result.outputFiles) await writeFile(file.path, file.contents);
  const outputs = Object.entries(result.metafile.outputs);
  const entry = outputs.find(([, value]) => value.entryPoint?.endsWith("/src/film.js"));
  if (!entry) throw new Error("Missing intro entry point");
  const modules = new Set();
  const include = filename => {
    if (modules.has(filename)) return;
    modules.add(filename);
    for (const dependency of result.metafile.outputs[filename]?.imports ?? []) {
      if (dependency.kind === "import-statement" && !dependency.external) include(dependency.path);
    }
  };
  include(entry[0]);
  const url = filename => "/" + path.relative(path.join(root, "public"), path.resolve(root, filename)).split(path.sep).join("/");
  const modulePreloads = [...modules].map(url);
  const version = digest(JSON.stringify({ modulePreloads, assets }));
  const manifest = { version, ...assets, modulePreloads, scene: `/intro-scene/index.html?site=1&v=${version}` };
  const template = await readFile(new URL("./intro-index.template.html", import.meta.url), "utf8");
  const preloads = modulePreloads.map(href => `<link rel="modulepreload" href="${href}">`).join("\n ")
    + `\n <link rel="preload" href="${assets.model}" as="fetch" crossorigin="anonymous">`
    + `\n <link rel="preload" href="${assets.landscape}" as="image">`
    + `\n <link rel="preload" href="${assets.brand}" as="image">`;
  await writeFile(path.join(sceneRoot, "index.html"), template.replace("<!-- INTRO_PRELOADS -->", preloads).replace("INTRO_ENTRY", url(entry[0])));
  await mkdir(path.join(root, "src/generated"), { recursive: true });
  await writeFile(path.join(root, "src/generated/intro-assets.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { manifest, javascriptBytes: [...modules].reduce((sum, filename) => sum + result.metafile.outputs[filename].bytes, 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildIntro()));
}
