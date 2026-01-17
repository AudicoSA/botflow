# NotebookLM MCP Setup Guide

## Overview

NotebookLM MCP server has been successfully installed and configured for your BotFlow project. This allows you to interact with Google's NotebookLM service directly from VS Code and Claude Code.

## Installation Details

**Package:** `notebooklm-mcp`
**Installed:** Globally via npm
**Configuration:** [.vscode/settings.json](.vscode/settings.json)

## Configuration

The MCP server has been added to your VS Code settings with the following configuration:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "notebooklm-mcp",
      "args": [],
      "env": {
        "NOTEBOOKLM_AUTO_MODE": "true"
      }
    }
  }
}
```

## Features

The NotebookLM MCP server provides ~31 tools for:

1. **Document Management**
   - Upload documents to NotebookLM
   - Create and manage notebooks
   - List existing notebooks
   - Navigate between notebooks

2. **AI Interaction**
   - Send chat messages to NotebookLM
   - Receive AI responses with citations
   - Get grounded, citation-backed answers from Gemini
   - Zero hallucinations using your knowledge base

3. **Research Automation**
   - Let AI agents (Claude Code) research documentation directly
   - Persistent authentication
   - Library management
   - Cross-client sharing

## Authentication

**Auto Mode** is enabled (`NOTEBOOKLM_AUTO_MODE: true`), which means:
- Chrome will be launched automatically on first use
- You'll be prompted to log in to your Google account
- Authentication will be saved for future sessions

## Using NotebookLM with Your Phase 2 Week 5 Guide

### Step 1: Upload the Guide to NotebookLM

1. Open [NotebookLM](https://notebooklm.google.com) in your browser
2. Create a new notebook called "BotFlow Phase 2 Week 5"
3. Upload the file: `PHASE2_WEEK5_GUIDE.md`
4. Let NotebookLM process the document

### Step 2: Access via MCP

Once configured, you can:
- Ask Claude Code to query the NotebookLM notebook
- Get AI-generated insights with citations
- Research specific sections of the guide
- Cross-reference with other documentation

### Example Queries

```
"Query my NotebookLM notebook about the database schema for conversation metrics"

"What does the Phase 2 Week 5 guide say about WebSocket integration?"

"Find information about the MetricsService implementation"
```

## Available MCP Tools

The NotebookLM MCP server provides tools for:
- `create_notebook` - Create a new notebook
- `list_notebooks` - List all notebooks
- `upload_source` - Upload a document
- `send_message` - Chat with NotebookLM
- `get_response` - Get AI-generated responses
- And ~26 more tools...

## How to Use in VS Code

### Option 1: Claude Code Extension
If you're using the Claude Code extension:
1. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
2. The MCP server will be available automatically
3. Ask Claude Code to interact with NotebookLM

### Option 2: Command Palette
1. Open Command Palette (Ctrl+Shift+P)
2. Search for "MCP" commands
3. Select "Connect to MCP Server"
4. Choose "notebooklm"

### Option 3: Direct Integration
The MCP server runs in the background and Claude Code can access it automatically.

## Troubleshooting

### Chrome Not Launching
If auto-mode fails:
```bash
# Manually set your browser path
export CHROME_PATH="/path/to/chrome"
```

### Authentication Issues
1. Delete cached credentials
2. Restart VS Code
3. Let the MCP server re-authenticate

### Connection Problems
```bash
# Test the MCP server directly
notebooklm-mcp --help

# Check if it's running
tasklist | findstr notebooklm
```

## Integration with Your Workflow

### Phase 2 Week 5 Use Cases

1. **Real-Time Dashboard Documentation**
   - Upload the Week 5 guide to NotebookLM
   - Ask for implementation details while coding
   - Get code examples with proper citations

2. **Metrics Service Design**
   - Query the guide for metrics collection patterns
   - Get recommendations for Redis caching strategies
   - Understand WebSocket integration requirements

3. **Chart Components**
   - Research Recharts implementation examples
   - Get guidance on responsive design
   - Find best practices for data visualization

## Next Steps

1. ✅ MCP server installed
2. ✅ VS Code configured
3. 📝 Upload PHASE2_WEEK5_GUIDE.md to NotebookLM
4. 🚀 Start using NotebookLM with Claude Code

## Additional Resources

- [NotebookLM MCP GitHub](https://github.com/PleasePrompto/notebooklm-mcp)
- [NotebookLM by khengyun](https://www.pulsemcp.com/servers/khengyun-notebooklm)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Google NotebookLM](https://notebooklm.google.com)

## Related Files

- [PHASE2_WEEK5_GUIDE.md](./PHASE2_WEEK5_GUIDE.md) - The guide to upload
- [.vscode/settings.json](./.vscode/settings.json) - MCP configuration
- [CLAUDE.md](./CLAUDE.md) - Project documentation

---

**Created:** 2026-01-17
**Status:** ✅ Ready to Use
**Next Action:** Upload PHASE2_WEEK5_GUIDE.md to NotebookLM

---

> "Transform your documentation into an intelligent research assistant!" 📚✨
