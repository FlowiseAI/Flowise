// src/themes/compStyleOverride.js
export default function componentStyleOverrides(theme) {
    const C = theme.colors;
    const isDark = !!theme.customization.isDarkMode;
  
    const LIGHT = {
      inactiveText: C.sidebarLightInactiveText,
      hoverBg:      C.sidebarLightHoverBg,
      hoverText:    C.sidebarLightHoverText,
      activeBg:     C.sidebarLightActiveBg,
      gradFrom:     C.sidebarLightGradFrom,
      gradTo:       C.sidebarLightGradTo,
      activeText:   C.sidebarLightActiveText,
      border:       C.sidebarLightBorder
    };
  
    const DARK = {
      inactiveText: C.sidebarDarkInactiveText,
      hoverBg:      C.sidebarDarkHoverBg,
      hoverText:    C.sidebarDarkHoverText,
      activeBg:     C.sidebarDarkActiveBg,
      gradFrom:     C.sidebarDarkGradFrom,
      gradTo:       C.sidebarDarkGradTo,
      activeText:   C.sidebarDarkActiveText,
      border:       C.sidebarDarkBorder
    };
  
    const S = isDark ? DARK : LIGHT;
  
    return {
      /* Base surfaces (light untouched; dark = no hairlines) */
      MuiPaper: { styleOverrides: { root: ({ theme: mui }) => ({ backgroundColor: mui.palette.background.paper, ...(isDark && { border: 'none', boxShadow: 'none' }) }) } },
      MuiCard:  { styleOverrides: { root: ({ theme: mui }) => ({ backgroundColor: mui.palette.background.paper, ...(isDark && { border: 'none', boxShadow: 'none' }) }) } },
      MuiDivider: { styleOverrides: { root: { ...(isDark && { borderColor: 'transparent' }) } } },
      MuiTableCell: { styleOverrides: { root: { ...(isDark && { borderBottom: '1px solid transparent' }) } } },
  
      /* Drawer = sidebar container background from theme vars */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? C.sidebarDarkBg : C.sidebarLightBg,
            color: 'inherit',
            borderRight: 'none',
            backgroundImage: 'none'
          }
        }
      },
  
      /* Sidebar rows */
      MuiListItemButton: {
        styleOverrides: {
          root: {
            paddingTop: '10px',
            paddingBottom: '10px',
            color: S.inactiveText,
            '& .MuiListItemIcon-root, & .MuiTypography-root, & .MuiListItemText-primary, & .MuiSvgIcon-root': { color: S.inactiveText },
            '&:hover': {
              backgroundColor: S.hoverBg,
              color: S.hoverText,
              '& .MuiListItemIcon-root, & .MuiTypography-root, & .MuiListItemText-primary, & .MuiSvgIcon-root': { color: S.hoverText }
            },
            // Selected (make it identical to hover in DARK; LIGHT unchanged)
// Note the `&&` to bump specificity so we override MUI defaults.
'&&.Mui-selected, &&.Mui-selected.Mui-focusVisible': {
  ...(isDark
    ? {
        // DARK: make selected identical to hover (clean chip)
        backgroundColor: S.hoverBg,
        color: S.hoverText,
        backgroundImage: 'none',
        border: 'none',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',  // same soft ring
        borderRadius: 10,
        '& .MuiListItemIcon-root, & .MuiTypography-root, & .MuiListItemText-primary, & .MuiSvgIcon-root': {
          color: S.hoverText
        },
        '&:hover': {
          backgroundColor: S.hoverBg,
          color: S.hoverText,
          backgroundImage: 'none',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08)'
        }
      }
    : {
        // LIGHT: unchanged (gradient pill)
        color: S.activeText,
        backgroundColor: S.activeBg,
        backgroundImage: `linear-gradient(90deg, ${S.gradFrom}, ${S.gradTo})`,
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        '& .MuiListItemIcon-root, & .MuiTypography-root, & .MuiListItemText-primary, & .MuiSvgIcon-root': {
          color: S.activeText
        },
        '&:hover': {
          backgroundColor: S.activeBg,
          backgroundImage: `linear-gradient(90deg, ${S.gradFrom}, ${S.gradTo})`
        }
      })
},

          }
        }
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: S.inactiveText } } },
      MuiListItemText: { styleOverrides: { primary: { color: S.inactiveText } } }
    };
  }
  