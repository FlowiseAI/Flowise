import React from 'react'
import { Form } from 'antd'
import { componentMap } from './index'
import PropTypes from 'prop-types'

const types = [`QRadioButton`]

const YamlComponentRenderer = ({ config, data, onValueChange }) => {
    const renderComponent = (componentConfig, index, currentPath = '', childrenRefsInfo = {}) => {
        if (!componentConfig || typeof componentConfig !== 'object') {
            console.warn('Invalid component config:', componentConfig)
            return null
        }

        const { type, widget, title, text, props = {}, children = [], items, layout, label, ...rest } = componentConfig

        // 构建当前组件的路径
        const componentType = widget || type

        // 构建新的路径
        let newPath = currentPath
        if (newPath) {
            newPath += '_'
        }

        // 添加组件类型作为基础
        if (componentType) {
            if (title) {
                newPath += title
            } else if (label) {
                newPath += label
            } else if (text) {
                newPath += text
            } else if (type) {
                newPath += type
            }
        }

        if (!componentType) {
            if (Array.isArray(children) && children.length > 0) {
                return children.map((child, childIndex) => (
                    <React.Fragment key={childIndex}>{renderComponent(child, childIndex, newPath)}</React.Fragment>
                ))
            }
            console.warn('Component type is undefined:', componentConfig)
            return null
        }

        const Component = componentMap[componentType]
        if (!Component) {
            console.warn(`Unknown component type: ${componentType}`)
            return null
        }

        const isRadioButton = children && children.length > 0 && children.every((child) => child.type === 'QRadioButton')

        const componentProps = {
            ...props,
            ...rest,
            title,
            text,
            items,
            layout,
            label,
            data,
            currentPath: newPath,
            onChange: onValueChange,
            type,
            isRadioButton
        }

        if (children && children.length > 0) {
            componentProps.children = children.map((child, childIndex) => (
                <Form.Item
                    key={childIndex}
                    style={{
                        marginBottom: '12px'
                    }}
                >
                    {renderComponent(child, childIndex, newPath)}
                </Form.Item>
            ))

            // 用于传递给子组件的渲染函数
            componentProps.childrenRenderFunction = children.map((child, childIndex) => {
                const renderChild = (childrenRefsInfo) => {
                    return (
                        <Form.Item
                            key={childIndex}
                            style={{
                                marginBottom: '12px'
                            }}
                        >
                            {renderComponent(child, childIndex, newPath, childrenRefsInfo)}
                        </Form.Item>
                    )
                }
                return renderChild
            })

            // 用于传递给子组件的props
            componentProps.childernProps = children

            if (componentType === 'CollapsiblePanel') {
                return (
                    <Component {...componentProps}>
                        {children.map((child, childIndex) => (
                            <React.Fragment key={childIndex}>{renderComponent(child, childIndex, newPath)}</React.Fragment>
                        ))}
                    </Component>
                )
            }
        }

        // 用于传递给子组件的ref
        if (types.includes(type)) {
            const { childrenRefs, index } = childrenRefsInfo
            return (
                <Component
                    {...componentProps}
                    childrenRefsInfo={childrenRefsInfo}
                    ref={(ref) => {
                        if (!childrenRefs) return
                        childrenRefs.current[index] = ref
                    }}
                />
            )
        }
        return <Component {...componentProps} />
    }

    return renderComponent(config, 0)
}

YamlComponentRenderer.propTypes = {
    config: PropTypes.shape({
        type: PropTypes.string,
        widget: PropTypes.string,
        props: PropTypes.object,
        children: PropTypes.array,
        title: PropTypes.string,
        text: PropTypes.string,
        items: PropTypes.array,
        layout: PropTypes.string,
        label: PropTypes.string
    }),
    data: PropTypes.object,
    onValueChange: PropTypes.func,
    parentPath: PropTypes.string
}

YamlComponentRenderer.defaultProps = {
    config: {},
    data: {},
    onValueChange: () => {},
    parentPath: ''
}

export default YamlComponentRenderer
