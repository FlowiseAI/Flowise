import { keyframes } from '@emotion/react'
import { styled, Dialog, Box, Typography, alpha, Button, Paper, IconButton, Grid, Chip, Skeleton, useScrollTrigger } from '@mui/material'

export const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        width: '90vw',
        maxWidth: '1200px',
        height: '60vh',
        maxHeight: '800px',
        backgroundColor: theme.palette.background.default
    }
}))

export const ScrollableContent = styled(Box)({
    overflowY: 'auto',
    height: 'calc(100% - 120px)',
    paddingTop: '16px',
    paddingBottom: '16px'
})

// New styled components for the horizontal scrolling UI
export const CategorySectionContainer = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
    transition: 'all 0.3s ease'
}))

export const CategoryTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    fontSize: '1.2rem',
    marginBottom: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
}))

export const HorizontalScrollContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    overflowX: 'auto',
    padding: theme.spacing(1, 0),
    gap: theme.spacing(2),
    '&::-webkit-scrollbar': {
        height: '8px'
    },
    '&::-webkit-scrollbar-track': {
        background: alpha(theme.palette.primary.main, 0.05),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb': {
        background: alpha(theme.palette.primary.main, 0.2),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: alpha(theme.palette.primary.main, 0.3)
    }
}))

export const ViewAllButton = styled(Button)(({ theme }) => ({
    color: theme.palette.primary.main,
    padding: 0,
    minWidth: 'auto',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    '& .MuiButton-endIcon': {
        transition: 'transform 0.3s ease'
    },
    '&:hover': {
        background: 'none',
        color: theme.palette.primary.dark,
        '& .MuiButton-endIcon': {
            transform: 'translateX(3px)'
        }
    }
}))

export const SidekickCardContainer = styled(Paper)(({ theme, onClick }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '220px', // Fixed height for all cards
    position: 'relative',
    // In horizontal scroll, we want fixed width
    '.horizontal-container &': {
        width: '300px',
        minWidth: '300px',
        maxWidth: '300px'
    },
    // In grid view, we want full width
    '.grid-container &': {
        width: '100%'
    },
    ...(!onClick
        ? {}
        : {
              cursor: 'pointer',
              '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  transform: 'translateY(-2px)'
                  //   boxShadow: theme.shadows[4]
              }
          })
}))

export const FavoriteButton = styled(IconButton)(({ theme }) => ({
    zIndex: 1
}))

export const SidekickHeader = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    height: '68px' // Fixed height for header (includes title and tags)
})

export const SidekickTitle = styled(Typography)({
    fontWeight: 'bold',
    fontSize: '1.1rem',
    lineHeight: '1.2',
    height: '2.4em', // Height for two lines of text
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
})

export const SidekickDescription = styled(Typography)({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    height: '42px', // Fixed height for two lines of description
    marginBottom: '16px'
})

export const SidekickFooter = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
    height: '36px', // Fixed height for footer
    gap: theme.spacing(1),
    '& .MuiSvgIcon-root': {
        color: theme.palette.common.white
    },
    '& .MuiButton-contained': {
        backgroundColor: alpha(theme.palette.primary.main, 0.7),
        color: theme.palette.common.white,
        '&:hover': {
            backgroundColor: theme.palette.primary.main
        }
    }
}))

export const ContentWrapper = styled(Box)(({ theme }) => ({
    width: '100%',
    maxWidth: '1200px',

    backgroundColor: theme.palette.background.default,

    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius
}))

export const WhiteButton = styled(Button)(({ theme }) => ({
    color: theme.palette.common.white,
    borderColor: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main
    }
}))

export const WhiteIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main
    }
}))

export const StyledGrid = styled(Grid)(({ theme }) => ({
    marginTop: theme.spacing(1),
    transition: 'all 0.3s ease'
}))

// Add a new styled component for category filter pills container
export const CategoryFilterContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    overflowX: 'auto',
    padding: theme.spacing(1, 0),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
    '&::-webkit-scrollbar': {
        height: '6px'
    },
    '&::-webkit-scrollbar-track': {
        background: alpha(theme.palette.primary.main, 0.05),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb': {
        background: alpha(theme.palette.primary.main, 0.2),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: alpha(theme.palette.primary.main, 0.3)
    }
}))

// Add a styled component for the category filter pills
export const CategoryFilterChip = styled(Chip)<{ selected?: boolean }>(({ theme, selected }) => ({
    transition: 'all 0.2s ease',
    ...(selected && {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.common.white,
        fontWeight: 'bold',
        '&:hover': {
            backgroundColor: theme.palette.primary.dark
        }
    })
}))

// Add a new styled component for grid items
export const StyledGridItem = styled(Grid)(({ theme }) => ({
    height: '100%',
    '& > div': {
        height: '100%'
    }
}))

// Add a skeleton card component
export const SkeletonCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    height: '220px',
    position: 'relative',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${
        theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.08)
    }`,
    '.horizontal-container &': {
        width: '300px',
        minWidth: '300px',
        maxWidth: '300px'
    },
    '.grid-container &': {
        width: '100%'
    }
}))

// Add a shimmer animation for skeleton items
export const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`

// Styled component for skeleton items with shimmer effect
export const SkeletonItem = styled(Skeleton)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.04),
    backgroundImage: `linear-gradient(
        90deg,
        ${theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.04)} 25%,
        ${theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.08)} 37%,
        ${theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.04)} 63%
    )`,
    backgroundSize: '200px 100%',
    backgroundRepeat: 'no-repeat',
    animation: `${shimmer} 1.5s infinite linear`,
    borderRadius: theme.shape.borderRadius
}))

export const OrgSidekicksHeader = styled(Box)(({ theme }) => ({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    padding: theme.spacing(1, 0),
    transition: theme.transitions && theme.transitions.create ? theme.transitions.create(['box-shadow']) : 'box-shadow 0.3s ease',
    boxShadow: useScrollTrigger() ? `0 1px 0 ${theme.palette.divider}` : 'none'
}))
