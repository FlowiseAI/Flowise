// @ts-nocheck
import React from 'react'
import { styled } from '@mui/material/styles'
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp'
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion'
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import MuiAccordionDetails, { AccordionDetailsProps } from '@mui/material/AccordionDetails'

export const Accordion: React.FC<AccordionProps> = styled((props: AccordionProps) => (
    <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
    border: `none`,
    // 'border': `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
        borderBottom: 0
    },
    '&:before': {
        display: 'none'
    },
    '.MuiAccordionDetails-root': {
        padding: theme.spacing(2),
        background: 'rgba(24,24,24)'
    }
}))

export const AccordionSummary: React.FC<AccordionSummaryProps> = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />} {...props} />
))(({ theme }) => ({
    backgroundColor: 'transparent',
    padding: theme.spacing(0, 2),
    // 'backgroundColor':
    //   theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .03)',
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
        transform: 'rotate(180deg)'
    },
    '& .MuiAccordionSummary-content': {
        marginLeft: theme.spacing(0)
    }
}))

export const AccordionDetails: React.FC<AccordionDetailsProps> = styled(MuiAccordionDetails)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: '1px solid rgba(0, 0, 0, .125)'
}))
