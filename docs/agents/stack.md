# Technology Stack

- **Primary engine**: Phaser 4.2.1
- **Secondary engine**: Unity 6.3 LTS (planned migration path: Unity 7)
- **Language**: TypeScript 7 (strict)
- **Build system**: Vite 8
- **Asset pipeline**: code-drawn graphics + Phaser loader (no external art by default)
- **Agent harness**: OpenCode only

Before using engine APIs, read the pinned reference:

- `docs/engine-reference/phaser/VERSION.md`
- `docs/engine-reference/unity/VERSION.md`

Other engines (`godot`, `unreal`, `sfml3`, `raylib`, `bevy`) are not present by
default: their reference docs are installed together with the matching
`engine-*` module. If the directory is missing, the module is not installed.
