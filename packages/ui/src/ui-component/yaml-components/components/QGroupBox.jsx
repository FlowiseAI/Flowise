import { useRef } from 'react'
import PropTypes from 'prop-types'
import { Box, Paper, Typography, RadioGroup } from '@mui/material'

const QGroupBox = ({
    label,
    children,
    childernProps,
    // childrenRenderFunction,
    isRadioButton,
    elevation = 1,
    padding = 2,
    titleStyle = {},
    contentStyle = {},
    disabled = false,
    onChange,
    currentPath
}) => {
    const defaultTitleStyle = {
        padding: '8px 16px',
        backgroundColor: disabled ? '#f5f5f5' : '#e3f2fd',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        ...titleStyle
    }

    const defaultContentStyle = {
        padding: `${padding * 4}px ${padding * 8}px`,
        opacity: disabled ? 0.7 : 1,
        ...contentStyle
    }

    const onChangeValue = (e) => {
        const path = `${currentPath}_${e.target.value}`
        //若改变的不是value值，需添加数据notValue
        if (childernProps && childernProps.length > 0) {
            childernProps.forEach((child) => {
                if ((child.label || child.text) === e.target.value) {
                    onChange(path, { notValue: true, properties: { checked: true } })
                } else {
                    const unCheckedPath = `${currentPath}_${child.label || child.text}`
                    onChange(unCheckedPath, { notValue: true, properties: { checked: false } })
                }
            })
        } else {
            onChange(path, { notValue: true, properties: { checked: true } })
        }
    }

    const getDefaultValue = () => {
        return (
            childernProps.find((child) => child?.properties?.checked)?.label ||
            childernProps.find((child) => child?.properties?.checked)?.text
        )
    }
    const defaultValue = useRef(getDefaultValue())

    return (
        <Paper
            elevation={elevation}
            sx={{
                opacity: disabled ? 0.7 : 1,
                pointerEvents: disabled ? 'none' : 'auto'
            }}
        >
            {label && (
                <Typography variant='subtitle1' component='div' sx={defaultTitleStyle}>
                    {label}
                </Typography>
            )}
            <Box sx={defaultContentStyle}>
                {isRadioButton ? (
                    <RadioGroup defaultValue={defaultValue.current} onChange={onChangeValue}>
                        {children}
                    </RadioGroup>
                ) : (
                    children
                )}
            </Box>
        </Paper>
    )
}

QGroupBox.propTypes = {
    label: PropTypes.string,
    children: PropTypes.node,
    elevation: PropTypes.number,
    padding: PropTypes.number,
    titleStyle: PropTypes.object,
    contentStyle: PropTypes.object,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    currentPath: PropTypes.string,
    childernProps: PropTypes.array,
    isRadioButton: PropTypes.bool
}

export default QGroupBox
