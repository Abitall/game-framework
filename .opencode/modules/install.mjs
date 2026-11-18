#!/usr/bin/env node
/**
 * Compatibility shim.
 *
 * The installer lives at .framework/install.mjs. This path is kept because it
 * appears in AGENTS.md, docs and habit:
 *
 *   node .opencode/modules/install.mjs add core
 */
import "../../.framework/install.mjs"
