import { useState, useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import { Box, Typography } from '@mui/material'
import YamlComponentRenderer from './YamlComponentRenderer'
import { deepClone } from '../../utils/deepClone'
import { flowContext } from '@/store/context/ReactFlowContext'

// 将扁平化数据转换回嵌套结构
const applyValuesToWidget = (widget, data) => {
    const processNode = (node, parentPath = '') => {
        const flatData = deepClone(data)
        let result = { ...node }
        // 构建当前节点的路径
        const componentType = node.widget || node.type

        // 构建新的路径
        let newPath = parentPath
        if (newPath) {
            newPath += '_'
        }

        // 添加组件类型作为基础
        if (componentType) {
            if (node.title) {
                newPath += node.title
            } else if (node.label) {
                newPath += node.label
            } else if (node.text) {
                newPath += node.text
            } else if (node.type) {
                newPath += node.type
            }
        }

        // 检查是否有对应的值
        if (flatData[newPath] !== undefined) {
            if (typeof flatData[newPath] === 'object' && flatData[newPath].notValue) {
                for (const key in flatData[newPath]) {
                    if (key !== 'notValue') {
                        result[key] = flatData[newPath][key]
                    }
                }
            } else {
                result.value = flatData[newPath]
            }
        }

        // 递归处理子节点
        if (node.children) {
            result.children = node.children.map((child) => processNode(child, newPath))
        }

        return result
    }

    return processNode(widget)
}

const YamlNodeRenderer = ({ props }) => {
    // 从props中获取配置
    const { inputParams, id } = props || {}
    const { dialog = {}, widget } = inputParams || {}

    // 默认配置
    const config = {
        width: dialog.width || 800,
        height: dialog.height || 1000,
        title: dialog.title || 'YAML Configuration'
    }

    // 使用扁平化的数据结构
    const [data, setData] = useState({})

    const handleValueChange = (path, value) => {
        setData((prevData) => {
            const newData = {
                ...prevData,
                [path]: value
            }
            return newData
        })
    }

    // 将数据更新到reactFlowInstance中
    const { reactFlowInstance } = useContext(flowContext)
    useEffect(() => {
        const nestedData = applyValuesToWidget(widget, deepClone(data))
        if (!reactFlowInstance) return
        const totalData = reactFlowInstance.getNodes()
        const newTotalData = totalData.map((item) => {
            if (item.id === id && item.data.inputParams && item.data.inputParams.widget) {
                item.data.inputParams.widget = nestedData
            }
            return item
        })
        // console.log('newTotalData', newTotalData)
        reactFlowInstance.setNodes(newTotalData)
    }, [data])

    return (
        <Box
            sx={{
                width: config.width,
                height: config.height,
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                bgcolor: 'background.paper',
                overflowY: 'auto'
            }}
        >
            <Typography variant='h5' gutterBottom>
                {config.title}
            </Typography>
            {widget && (
                <YamlComponentRenderer config={widget} data={data} onValueChange={handleValueChange} parentTitles={[config.title]} />
            )}
        </Box>
    )
}

YamlNodeRenderer.propTypes = {
    props: PropTypes.shape({
        inputParams: PropTypes.shape({
            dialog: PropTypes.shape({
                title: PropTypes.string,
                width: PropTypes.number,
                height: PropTypes.number
            }),
            widget: PropTypes.object
        })
    })
}

YamlNodeRenderer.defaultProps = {
    props: {
        inputParams: {
            dialog: {},
            widget: null
        }
    }
}

export default YamlNodeRenderer
