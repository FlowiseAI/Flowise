import { useEffect, useState, useRef } from 'react'
import { Select } from 'antd'
import PropTypes from 'prop-types'

const QComboBox = (props) => {
    const { value, onChange, items, currentPath, disabled = false } = props

    // 处理不同格式的输入数据
    const getOptions = (items) => {
        if (!Array.isArray(items)) {
            console.warn('QComboBox: items should be an array')
            return []
        }

        // 如果数组为空，直接返回
        if (items.length === 0) return []

        // 检查第一个元素来判断数组类型
        const firstItem = items[0]

        // 如果已经是正确的格式 ({ value, label })
        if (typeof firstItem === 'object' && 'value' in firstItem && 'label' in firstItem) {
            return items
        }

        // 如果是简单类型（字符串、数字等），转换为需要的格式
        return items.map((item) => ({
            value: item,
            label: String(item) // 确保 label 是字符串
        }))
    }

    const options = getOptions(items)

    // 设置默认值
    const defaultValue = options.length > 0 ? options[0].value : ''
    const currentValue = value === undefined ? defaultValue : value
    const [selectedValue, setSelectedValue] = useState(currentValue)
    const [tempSelectedValue, setTempSelectedValue] = useState(null) // 添加临时选中状态
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)
    const selectRef = useRef(null)

    useEffect(() => {
        setSelectedValue(currentValue)
    }, [])

    useEffect(() => {
        onChange(currentPath, selectedValue || currentValue)
    }, [selectedValue])

    // 处理点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                selectRef.current &&
                !selectRef.current.contains(event.target)
            ) {
                setIsOpen(false)
                setTempSelectedValue(null) // 关闭时清除临时选中状态
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [])

    const handleSelect = (optionValue) => {
        if (!disabled) {
            setSelectedValue(optionValue)
            setTempSelectedValue(null) // 选中后清除临时选中状态
            setIsOpen(false)
        }
    }

    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (disabled) return

        if (e.key === 'Enter') {
            if (isOpen && tempSelectedValue !== null) {
                // 如果有临时选中项，将其设置为选中项
                handleSelect(tempSelectedValue)
            } else {
                setIsOpen(!isOpen)
            }
            e.preventDefault()
        } else if (e.key === 'Escape') {
            setIsOpen(false)
            setTempSelectedValue(null)
        } else if (isOpen && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault()
            const currentIndex =
                tempSelectedValue !== null
                    ? options.findIndex((opt) => opt.value === tempSelectedValue)
                    : options.findIndex((opt) => opt.value === selectedValue)

            let newIndex
            if (e.key === 'ArrowUp') {
                newIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1
            } else {
                newIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1
            }

            setTempSelectedValue(options[newIndex].value)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                ref={selectRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                role='combobox'
                aria-expanded={isOpen}
                aria-haspopup='listbox'
                aria-controls='combo-box-options'
                tabIndex={disabled ? -1 : 0}
                style={{
                    width: '100%',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
            >
                <Select value={selectedValue} style={{ width: '100%' }} disabled={disabled} open={false} />
            </div>

            {options.length > 0 && isOpen && (
                <div
                    ref={dropdownRef}
                    role='listbox'
                    id='combo-box-options'
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        padding: '4px 0',
                        zIndex: 1000,
                        animation: 'dropdownSlide 0.2s ease-out'
                    }}
                >
                    <style>
                        {`
                            @keyframes dropdownSlide {
                                from {
                                    opacity: 0;
                                    transform: translateY(-10px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                        `}
                    </style>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            role='option'
                            aria-selected={option.value === selectedValue}
                            onClick={() => !option.disabled && handleSelect(option.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    !option.disabled && handleSelect(option.value)
                                }
                            }}
                            tabIndex={-1}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor:
                                    option.value === tempSelectedValue
                                        ? '#e6f4ff'
                                        : option.value === selectedValue
                                        ? '#f0f7ff'
                                        : 'transparent',
                                color: option.disabled ? '#d9d9d9' : 'inherit',
                                pointerEvents: option.disabled ? 'none' : 'auto'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = option.value === selectedValue ? '#f0f7ff' : '#f5f5f5'
                                setTempSelectedValue(option.value)
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = option.value === selectedValue ? '#f0f7ff' : 'transparent'
                                setTempSelectedValue(null)
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

QComboBox.propTypes = {
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    items: PropTypes.oneOfType([
        // 支持简单类型数组
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])),
        // 支持标准格式对象数组
        PropTypes.arrayOf(
            PropTypes.shape({
                value: PropTypes.any.isRequired,
                label: PropTypes.string.isRequired,
                disabled: PropTypes.bool
            })
        )
    ]).isRequired,
    currentPath: PropTypes.string.isRequired,
    label: PropTypes.string,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    style: PropTypes.object
}

export default QComboBox
