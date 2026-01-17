# n8n MCP Server Setup - Complete! ✅

## What Was Done

1. **Installed n8n-mcp globally** via npm
2. **Configured VS Code settings** in `.vscode/settings.json` with:
   - Your n8n cloud instance URL
   - Your n8n API key (from backend .env)
   - Proper environment variables for MCP mode

## How to Activate

### Option 1: Restart VS Code (Recommended)
1. Close this VS Code window completely
2. Reopen the workspace
3. The n8n MCP server will automatically load

### Option 2: Reload Window
1. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
2. Type "Developer: Reload Window"
3. Press Enter

## What You Can Do With n8n MCP

Once loaded, Claude Code will have access to **1,084 n8n nodes** and can:

### Workflow Management
- ✅ **List workflows** in your n8n instance
- ✅ **Create new workflows** programmatically
- ✅ **Update existing workflows**
- ✅ **Execute workflows** directly
- ✅ **Get workflow details** and execution history

### Node Operations
- ✅ **Search 1,084+ n8n nodes** (99% coverage)
- ✅ **Get node documentation** and parameter details
- ✅ **Build complex workflows** with proper node configuration
- ✅ **Validate node parameters** before deployment

### Example Commands You Can Use

Once MCP is loaded, you can ask Claude Code:

```
"List all my n8n workflows"
"Create a new workflow that processes PDF uploads"
"Show me the execution history of the knowledge-ingestion workflow"
"What parameters does the HTTP Request node accept?"
"Update my webhook workflow to add email notifications"
```

## Configuration Details

**MCP Server:** n8n-mcp
**Mode:** stdio (JSON-RPC over stdin/stdout)
**n8n Instance:** https://botflowsa.app.n8n.cloud
**API Access:** Configured with your personal API key

## Verifying It's Working

After restart, you can test with:
```
"Hey Claude, can you list my n8n workflows?"
```

If successful, Claude Code will use the MCP tools to query your n8n instance and show you the results!

## Troubleshooting

If you see "MCP not loaded" or similar errors:
1. Check that Node.js v22.20.0 is in your PATH
2. Verify `npx n8n-mcp` runs from command line
3. Check VS Code Output panel for MCP logs
4. Ensure n8n API key hasn't expired (test with curl)

## Security Note

Your n8n API key is now in `.vscode/settings.json`. This file is workspace-specific and should NOT be committed to git. Add it to `.gitignore` if needed:

```bash
echo ".vscode/settings.json" >> .gitignore
```

Alternatively, you can move the API key to an environment variable in your system and reference it as:
```json
"N8N_API_KEY": "${env:N8N_API_KEY}"
```

---

**Next Steps:** Restart VS Code and start managing your n8n workflows directly through Claude Code! 🚀
