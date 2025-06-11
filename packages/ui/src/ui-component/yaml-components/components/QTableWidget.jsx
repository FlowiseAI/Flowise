import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    Box
} from '@mui/material'

const QTableWidget = ({ properties = {}, onChange, currentPath, tableData: tableDataProps = [] }) => {
    const { columnCount = 0, headers = [], rowCount = 0 } = properties
    const [focusedCell, setFocusedCell] = useState(null) // {row, col}
    const [dialogOpen, setDialogOpen] = useState(false)
    const [newColumnName, setNewColumnName] = useState('')
    const [localHeaders, setLocalHeaders] = useState(headers || [])
    const [tableData, setTableData] = useState(() => {
        return tableDataProps && tableDataProps.length > 0 ? tableDataProps : generateEmptyRows()
    })
    const [lastFocusedPosition, setLastFocusedPosition] = useState(null)
    const [nameError, setNameError] = useState('') // 添加错误信息状态

    // 用于记录当前聚焦的单元格
    const focusedCellRef = useRef(null)

    const inputsRef = useRef({})

    const dialogInputRef = useRef(null)

    // 监听properties变化
    useEffect(() => {
        setLocalHeaders(headers || [])
    }, [headers])

    // 生成空的表格数据
    function generateEmptyRows() {
        const emptyRow = Array(columnCount || 0).fill('')
        return Array(rowCount || 0)
            .fill(null)
            .map(() => [...emptyRow])
    }

    // 处理单元格聚焦
    const handleCellFocus = (rowIndex, colIndex) => {
        setFocusedCell([rowIndex, colIndex])
        focusedCellRef.current = [rowIndex, colIndex]
    }

    // 处理单元格失焦
    const handleCellBlur = (e) => {
        // 检查点击的目标是否是按钮
        const isButtonClick = e.relatedTarget?.closest('button')
        if (isButtonClick) {
            return // 如果是点击按钮，不清除焦点
        }

        const currentFocusedCell = `${focusedCellRef.current}`
        setTimeout(() => {
            setFocusedCell((cell) => {
                if (`${currentFocusedCell}` === `${cell}`) {
                    focusedCellRef.current = null
                    return null
                }
                return cell
            })
        }, 0)
    }

    // 添加行
    const handleAddRow = () => {
        const newRow = Array(headers.length).fill('')
        const insertIndex = focusedCellRef.current ? focusedCellRef.current[0] + 1 : tableData.length

        // 创建新的数据数组，保持原有数据的顺序
        const newData = []

        // 添加插入点之前的行
        for (let i = 0; i < insertIndex; i++) {
            newData.push([...tableData[i]])
        }

        // 插入新行
        newData.push(newRow)

        // 添加插入点之后的行
        for (let i = insertIndex; i < tableData.length; i++) {
            newData.push([...tableData[i]])
        }

        setTableData(newData)

        // 保持焦点在原来的单元格上
        if (focusedCellRef.current) {
            const [row, col] = focusedCellRef.current
            setTimeout(() => {
                const input = inputsRef.current[`${row}-${col}`]
                if (input) {
                    input.focus()
                }
            }, 0)
        }
    }

    // 删除行
    const handleDeleteRow = () => {
        if (!focusedCell) return
        const newData = tableData.filter((_, index) => index !== focusedCell[0])
        setTableData(newData)
        setFocusedCell(null)
    }

    // 添加列
    const handleAddColumn = () => {
        // 保存当前聚焦位置
        setLastFocusedPosition(focusedCellRef.current)
        setDialogOpen(true)
        setTimeout(() => {
            dialogInputRef.current && dialogInputRef.current.querySelector('input') && dialogInputRef.current.querySelector('input').focus()
        }, 0)
    }

    // 删除列
    const handleDeleteColumn = () => {
        if (!focusedCell) return

        // 创建新的headers数组，排除要删除的列
        const newHeaders = [...headers.slice(0, focusedCell[1]), ...headers.slice(focusedCell[1] + 1)]

        // 创建新的数据数组，每行都排除要删除的列
        const newData = tableData.map((row) => [...row.slice(0, focusedCell[1]), ...row.slice(focusedCell[1] + 1)])

        // 更新组件状态
        setTableData(newData)
        properties.headers = newHeaders // 更新properties中的headers

        setFocusedCell(null)
    }

    // 检查列名是否重复
    const checkDuplicateName = (name) => {
        return headers.some((header) => header === name)
    }

    // 处理列名输入
    const handleColumnNameChange = (e) => {
        const value = e.target.value
        setNewColumnName(value)

        if (!value.trim()) {
            setNameError('')
        } else if (checkDuplicateName(value)) {
            setNameError('列名已存在')
        } else {
            setNameError('')
        }
    }

    // 添加列确认
    const handleAddColumnConfirm = () => {
        if (!newColumnName.trim() || nameError) return

        // 使用保存的聚焦位置
        const insertIndex = lastFocusedPosition ? lastFocusedPosition[1] + 1 : headers.length

        // 创建新的headers数组
        const newHeaders = [...headers.slice(0, insertIndex), newColumnName, ...headers.slice(insertIndex)]

        // 创建新的数据数组
        const newData = tableData.map((row) => [...row.slice(0, insertIndex), '', ...row.slice(insertIndex)])

        // 更新组件状态
        setTableData(newData)
        properties.headers = newHeaders // 更新properties中的headers

        // 保持焦点在原来的单元格上
        if (lastFocusedPosition) {
            const [row, col] = lastFocusedPosition
            setTimeout(() => {
                const input = inputsRef.current[`${row}-${col}`]
                if (input) {
                    input.focus()
                }
            }, 0)
        }

        setDialogOpen(false)
        setNewColumnName('')
        setLastFocusedPosition(null) // 清除保存的位置
        setNameError('')
    }

    // 保存
    const handleSave = () => {
        if (onChange) {
            const columnCount = tableData[0]?.length || 0
            const rowCount = tableData.length

            // 确保数据格式正确
            const formattedData = {
                notValue: true,
                properties: {
                    ...properties,
                    columnCount,
                    headers: headers || [],
                    rowCount
                },
                tableData: tableData || []
            }

            onChange(currentPath, formattedData)
        }
    }

    // 获取列的样式
    const getColumnSx = (index, isHeader = false) => ({
        borderLeft: index === 0 ? 'none' : '1px solid #ccc',
        borderRight: index === headers.length - 1 ? 'none' : '1px solid #ccc',
        padding: isHeader ? '8px' : '0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
    })

    return (
        <Box>
            <TableContainer component={Paper} sx={{ border: '1px solid #ccc', marginBottom: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {localHeaders.map((header, index) => (
                                <TableCell key={index} sx={getColumnSx(index, true)}>
                                    {header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, colIndex) => (
                                    <TableCell key={colIndex} sx={getColumnSx(colIndex)}>
                                        <input
                                            type='text'
                                            className='nodrag q-table-cell'
                                            value={cell}
                                            ref={(el) => {
                                                if (el) {
                                                    inputsRef.current[`${rowIndex}-${colIndex}`] = el
                                                }
                                            }}
                                            onFocus={() => handleCellFocus(rowIndex, colIndex)}
                                            onBlur={handleCellBlur}
                                            onChange={(e) => {
                                                const newData = [...tableData]
                                                newData[rowIndex][colIndex] = e.target.value
                                                setTableData(newData)
                                            }}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '8px',
                                                outline: 'none'
                                            }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack direction='row' spacing={2} sx={{ marginBottom: 2 }}>
                <Button variant='contained' onClick={handleAddRow}>
                    添加行
                </Button>
                <Button variant='contained' onClick={handleAddColumn}>
                    添加列
                </Button>
                <Button variant='contained' onClick={handleDeleteRow} disabled={!focusedCell}>
                    删除行
                </Button>
                <Button variant='contained' onClick={handleDeleteColumn} disabled={!focusedCell}>
                    删除列
                </Button>
            </Stack>

            <Button variant='contained' color='primary' fullWidth onClick={handleSave}>
                保存
            </Button>

            {dialogOpen && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1501, // 确保在Dialog之下，但在其他内容之上
                        pointerEvents: 'none' // 允许点击穿透到Dialog
                    }}
                />
            )}

            <Dialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false)
                    setNewColumnName('')
                    setNameError('')
                }}
                sx={{ zIndex: 1502 }}
            >
                <DialogTitle>输入类型名称</DialogTitle>
                <DialogContent>
                    <TextField
                        margin='dense'
                        label='类型名称'
                        fullWidth
                        ref={dialogInputRef}
                        value={newColumnName}
                        onChange={handleColumnNameChange}
                        error={!!nameError}
                        helperText={nameError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDialogOpen(false)
                            setNewColumnName('')
                            setNameError('')
                        }}
                    >
                        取消
                    </Button>
                    <Button onClick={handleAddColumnConfirm} disabled={!newColumnName.trim() || !!nameError}>
                        确认
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

QTableWidget.propTypes = {
    properties: PropTypes.shape({
        columnCount: PropTypes.number,
        headers: PropTypes.arrayOf(PropTypes.string),
        rowCount: PropTypes.number
    }),
    onChange: PropTypes.func,
    currentPath: PropTypes.string,
    tableData: PropTypes.array,
    tableDataProps: PropTypes.array
}

export default QTableWidget
