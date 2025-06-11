import { useEffect, useRef, useState } from 'react'
import { InputNumber } from 'antd'
import PropTypes from 'prop-types'

const QSpinBox = (props) => {
    const { label, properties = {}, value: propsValue, onChange, currentPath } = props
    const { suffix = '', minimum = -Infinity, maximum = Infinity, defaultValue = 0, singleStep = 1 } = properties

    const [value, setValue] = useState(
        propsValue || defaultValue < minimum ? minimum : propsValue || defaultValue > maximum ? maximum : propsValue || defaultValue
    )
    const valueRef = useRef(value)
    const thisRef = useRef(null)

    const checkElementClass = (element, className) => {
        if (!element) return false
        return (
            element.classList.contains(className) ||
            element.parentElement?.classList.contains(className) ||
            element.parentElement?.parentElement?.classList.contains(className)
        )
    }

    const handleStepClick = (e) => {
        const isUpClick = checkElementClass(e.target, 'ant-input-number-handler-up')
        const isDownClick = checkElementClass(e.target, 'ant-input-number-handler-down')

        if (isUpClick || isDownClick) {
            let newValue = Math.round(valueRef.current + (isUpClick ? singleStep : -singleStep)) // 确保是整数

            // 边界值处理
            if (newValue > maximum) {
                newValue = maximum
            } else if (newValue < minimum) {
                newValue = minimum
            }

            setValue(newValue)
        }
    }

    useEffect(() => {
        thisRef.current && thisRef.current.addEventListener('click', handleStepClick)
        return () => {
            thisRef.current && thisRef.current.removeEventListener('click', handleStepClick)
            thisRef.current = null
        }
    }, [handleStepClick])

    useEffect(() => {
        valueRef.current = value
        onChange(currentPath, value)
    }, [value])

    const handleChange = (val) => {
        if (val === null || val === undefined) {
            setValue(defaultValue)
            return
        }

        let newValue = Math.round(Number(val)) // 确保是整数

        // 处理非数字输入
        if (isNaN(newValue)) {
            setValue(defaultValue)
            return
        }

        // 边界值处理
        if (newValue > maximum) {
            newValue = maximum
        } else if (newValue < minimum) {
            newValue = minimum
        }

        setValue(newValue)
    }

    return (
        <div ref={thisRef}>
            <InputNumber
                style={{ width: '100%' }}
                min={minimum}
                max={maximum}
                precision={0} // 设置精度为0，只允许整数
                value={value || defaultValue}
                onChange={handleChange}
                addonAfter={suffix}
                addonBefore={label}
                controls
            />
        </div>
    )
}

QSpinBox.propTypes = {
    label: PropTypes.string,
    properties: PropTypes.shape({
        suffix: PropTypes.string,
        minimum: PropTypes.number,
        maximum: PropTypes.number,
        singleStep: PropTypes.number
    }),
    value: PropTypes.number,
    onChange: PropTypes.func,
    currentPath: PropTypes.string
}

export default QSpinBox
