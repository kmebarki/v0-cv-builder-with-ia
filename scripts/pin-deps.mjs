// scripts/pin-deps.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// mini parser YAML ultra-simple (pnpm-lock.yaml n'utilise pas d'ancres complexes pour les champs utilisés ici)
function parseYaml(yaml) {
  const lines = yaml.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "    ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)[0].length;
    // remet la pile au bon niveau
    while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;

    // entrée type "key: value" ou "key:"
    const m = line.trim().match(/^([^:]+):(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();

    if (val === "") {
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      // valeur scalaire -> string/number/bool simple
      const unquoted = val.replace(/^['"]|['"]$/g, "");
      if (unquoted === "true") parent[key] = true;
      else if (unquoted === "false") parent[key] = false;
      else if (!Number.isNaN(Number(unquoted)) && /^\d+(\.\d+)?$/.test(unquoted)) parent[key] = Number(unquoted);
      else parent[key] = unquoted;
    }
  }
  return root;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "..", "package.json");
const lockPath = resolve(__dirname, "..", "pnpm-lock.yaml");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const lockRaw = readFileSync(lockPath, "utf8");
const lock = parseYaml(lockRaw);

// 1) Construire une map "nom@specifier" -> version résolue depuis le lockfile
//    Dans pnpm-lock v9+, les résolutions se trouvent sous "packages" et "importers".
function buildResolvedMap(lock) {
  const map = new Map();

  // `importers` -> récupère les specifiers déclarés pour le projet racine
  const importers = lock.importers || {};
  const root = importers["."] || {};
  const sections = ["dependencies", "devDependencies", "optionalDependencies"];
  const specifiers = {};
  for (const sec of sections) {
    Object.assign(specifiers, root[sec] || {});
  }

  // `packages` contient les noeuds avec versions réelles
  // clés du type "/nom@version" ou "/scope/nom@version"
  const packages = lock.packages || {};
  // index par nom -> Set(versions)
  const byName = new Map();
  for (const fullKey of Object.keys(packages)) {
    const key = fullKey.startsWith("/") ? fullKey.slice(1) : fullKey;
    // sépare "name@version" (attention aux scopes)
    const at = key.lastIndexOf("@");
    if (at <= 0) continue;
    const name = key.slice(0, at);
    const version = key.slice(at + 1);
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(version);
  }

  // Pour chaque dépendance déclarée, choisir la version réellement installée.
  for (const [name, wanted] of Object.entries(specifiers)) {
    const versions = byName.get(name);
    if (!versions || versions.size === 0) continue;
    // cas simple : s'il n'y a qu'une version, on la prend
    if (versions.size === 1) {
      const only = [...versions][0];
      map.set(name, only);
      continue;
    }
    // sinon, on tente de matcher la "version voulue" (si exacte), sinon on choisit la plus récente lexicalement
    if (/^\d/.test(wanted)) {
      // version exacte (ex: "1.2.3") ?
      if (versions.has(wanted)) {
        map.set(name, wanted);
        continue;
      }
    }
    // fallback : tri décroissant lexical (suffisant ici)
    const sorted = [...versions].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    map.set(name, sorted[0]);
  }

  return map;
}

const resolved = buildResolvedMap(lock);

function pinSection(section) {
  if (!section) return section;
  const out = {};
  for (const [name, spec] of Object.entries(section)) {
    const pinned = resolved.get(name);
    if (pinned) out[name] = pinned; // version exacte du lockfile
    else {
      // si on ne trouve pas (rare), enlève les opérateurs ^ ~ latest
      out[name] = String(spec).replace(/^[\^~]/, "").replace(/^latest$/i, "*");
    }
  }
  return out;
}

pkg.dependencies = pinSection(pkg.dependencies);
pkg.devDependencies = pinSection(pkg.devDependencies);
pkg.optionalDependencies = pinSection(pkg.optionalDependencies);

// on peut aussi pinner "overrides" s'il y a des opérateurs, mais on conserve tel quel par sécurité
writeFileSync(pkgPath.replace(/package\.json$/, "package.pinned.json"), JSON.stringify(pkg, null, 2), "utf8");
console.log("✅ package.pinned.json généré avec versions figées depuis pnpm-lock.yaml");
