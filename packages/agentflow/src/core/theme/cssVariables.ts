/**
 * CSS Variables Generator
 *
 * Generates CSS custom properties from design tokens.
 * These variables are used in canvas.css for ReactFlow styling.
 */

import { tokens } from './tokens'

export function generateCSSVariables(isDarkMode: boolean): string {
    const mode = isDarkMode ? 'dark' : 'light'

    return `
    /* Background colors */
    --agentflow-canvas-bg: ${tokens.colors.background.canvas[mode]};
    --agentflow-card-bg: ${tokens.colors.background.card[mode]};
    --agentflow-card-bg-hover: ${tokens.colors.background.cardHover[mode]};
    --agentflow-palette-bg: ${tokens.colors.background.palette[mode]};
    --agentflow-header-bg: ${tokens.colors.background.header[mode]};

    /* Border colors */
    --agentflow-border: ${tokens.colors.border.default[mode]};
    --agentflow-border-hover: ${tokens.colors.border.hover[mode]};

    /* Text colors */
    --agentflow-text-primary: ${tokens.colors.text.primary[mode]};
    --agentflow-text-secondary: ${tokens.colors.text.secondary[mode]};
    --agentflow-text-tertiary: ${tokens.colors.text.tertiary[mode]};

    /* Semantic colors */
    --agentflow-success: ${tokens.colors.semantic.success};
    --agentflow-error: ${tokens.colors.semantic.error};
    --agentflow-warning: ${tokens.colors.semantic.warning};
    --agentflow-info: ${tokens.colors.semantic.info};

    /* Node-specific colors */
    --agentflow-sticky-note-bg: ${tokens.colors.nodes.stickyNote};
    --agentflow-iteration-border: ${tokens.colors.nodes.iteration};

    /* ReactFlow colors */
    --agentflow-minimap-node: ${tokens.colors.reactflow.minimap.node[mode]};
    --agentflow-minimap-node-stroke: ${tokens.colors.reactflow.minimap.nodeStroke[mode]};
    --agentflow-minimap-bg: ${tokens.colors.reactflow.minimap.background[mode]};
    --agentflow-bg-dots: ${tokens.colors.reactflow.background.dots[mode]};

    /* Spacing */
    --agentflow-spacing-xs: ${tokens.spacing.xs}px;
    --agentflow-spacing-sm: ${tokens.spacing.sm}px;
    --agentflow-spacing-md: ${tokens.spacing.md}px;
    --agentflow-spacing-lg: ${tokens.spacing.lg}px;
    --agentflow-spacing-xl: ${tokens.spacing.xl}px;
    --agentflow-spacing-xxl: ${tokens.spacing.xxl}px;

    /* Shadows */
    --agentflow-shadow-card: ${tokens.shadows.card};
    --agentflow-shadow-toolbar: ${tokens.shadows.toolbar[mode]};
    --agentflow-shadow-minimap: ${tokens.shadows.minimap};
    --agentflow-shadow-controls: ${tokens.shadows.controls};
    --agentflow-shadow-sticky-note: ${tokens.shadows.stickyNote};

    /* Border radius */
    --agentflow-radius-sm: ${tokens.borderRadius.sm}px;
    --agentflow-radius-md: ${tokens.borderRadius.md}px;
    --agentflow-radius-lg: ${tokens.borderRadius.lg}px;
  `.trim()
}
