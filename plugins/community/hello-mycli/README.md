# @community/hello-mycli

Example **community plugin** for MyCLI. Use this as a template when authoring plugins with `my plugin create`.

## Install locally

```bash
my plugin install @community/hello-mycli --path ./plugins/community/hello-mycli
```

Or from a project directory after building:

```bash
pnpm --filter @community/plugin-hello-mycli build
my plugin install @community/hello-mycli --path plugins/community/hello-mycli
```

## What it does

- `install()` writes `HELLO_MYCLI.txt` and enables the `hello-mycli` feature flag
- Registers a stub `hello` command

## Publish to marketplace

```bash
my plugin publish ./plugins/community/hello-mycli --dry-run
```

See [PLUGIN_GUIDE.md](../../../PLUGIN_GUIDE.md) and [docs/plugins.md](../../../docs/plugins.md).
