import { createHash } from "node:crypto"
import type { Pattern } from "../../schema"

type Pack = { name: string; version: string; patterns: Omit<Pattern, "scope" | "provenance">[] }

const packs: readonly Pack[] = [
  {
    name: "bun",
    version: "1.0.0",
    patterns: [
      pattern("bun-lockfile", "error: lockfile had changes, but lockfile is frozen", "Bun's frozen lockfile is stale.", "bun install", false),
      pattern("bun-package-not-found", "error: package [\\\"']([^\\\"']+)[\\\"'] not found", "Bun could not resolve a package.", "bun install $1", false),
    ],
  },
  {
    name: "go",
    version: "1.0.0",
    patterns: [
      pattern("go-missing-sum", "missing go.sum entry for module providing package", "Go needs to refresh module checksums.", "go mod tidy", false),
      pattern("go-test-cache", "go: updates to go.mod needed", "Go module metadata needs updating.", "go mod tidy", false),
    ],
  },
  {
    name: "rust",
    version: "1.0.0",
    patterns: [
      pattern("cargo-package", "error: no matching package named [\\\"']([^\\\"']+)", "Cargo could not resolve a package.", "cargo search $1", true),
      pattern("cargo-lock", "the lock file .* needs to be updated but --locked was passed", "Cargo.lock needs updating.", "cargo update", false),
    ],
  },
  {
    name: "ruby",
    version: "1.0.0",
    patterns: [
      pattern("bundle-missing", "Could not find .* in locally installed gems", "Bundler dependencies are missing.", "bundle install", false),
      pattern("ruby-load-error", "cannot load such file -- ([^\\s]+)", "Ruby could not load a dependency.", "bundle check", true),
    ],
  },
  {
    name: "security-devops",
    version: "1.0.0",
    patterns: [
      pattern("docker-daemon", "Cannot connect to the Docker daemon", "The Docker daemon is unavailable.", "docker info", true),
      pattern("kube-context", "current-context is not set", "kubectl has no active context.", "kubectl config current-context", true),
      pattern("tls-certificate", "certificate (?:has expired|is not yet valid)", "A TLS certificate validity check failed.", "date", true),
    ],
  },
]

export function installed() {
  return packs.flatMap((pack) => {
    const hash = createHash("sha256").update(JSON.stringify(pack)).digest("hex")
    return pack.patterns.map((entry): Pattern => ({
      ...entry,
      scope: "community",
      version: 1,
      provenance: `bundled-pack:${pack.name}@${pack.version}:${hash}`,
    }))
  })
}

export function manifests() {
  return packs.map((pack) => ({
    name: pack.name,
    version: pack.version,
    hash: createHash("sha256").update(JSON.stringify(pack)).digest("hex"),
    patterns: pack.patterns.length,
  }))
}

function pattern(id: string, regex: string, description: string, command: string, trusted: boolean): Omit<Pattern, "scope" | "provenance"> {
  return {
    id,
    regex,
    category: "community",
    description,
    fixes: [{ id: `${id}-fix`, description: command, command, priority: 1, trusted }],
    success: 0,
    failures: 0,
  }
}
