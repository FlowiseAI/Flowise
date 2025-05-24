---
sidebar_position: 8
title: BraveSearch MCP
description: Use BraveSearch MCP to perform internet searches using Brave Search
---

# BraveSearch MCP for Answer Agent

This documentation outlines how to use the Brave Search Model Context Protocol (MCP) integration with Answer Agent. The MCP allows Answer Agent to perform web searches using Brave Search API, providing up-to-date information from the internet through natural language.

## Setting Up Credentials

To use the BraveSearch MCP, you'll need to configure the following credentials:

### Obtaining Credentials

1. **Brave Search API Key**:
    - Go to [https://brave.com/search/api/](https://brave.com/search/api/)
    - Sign up for an API key
    - Complete the registration process
    - Copy your API key from the developer dashboard

### Configuration

You can provide these credentials in one of two ways:

1. **During conversation**: Answer Agent will prompt you for your credentials if not already configured.

2. **Via configuration file**: You can set up a permanent configuration by creating a file with:
    ```
    BRAVE_SEARCH_API_KEY=your_api_key_here
    ```

> ⚠️ **Warning**: Your API key has usage limits based on your subscription plan. Monitor your usage to avoid unexpected charges.

## Available Tools

_Full documentation for BraveSearch MCP tools is coming soon._

## Common Workflows

_Sample workflows for BraveSearch MCP are coming soon._
