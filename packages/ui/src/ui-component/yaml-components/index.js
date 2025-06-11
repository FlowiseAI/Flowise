// 自动导入所有组件
const modules = Object.entries(import.meta.glob('./components/*.jsx', { eager: true })).reduce((acc, [path, module]) => {
    // 从文件路径中提取组件名
    const componentName = path.match(/\.\/components\/(\w+)\.jsx$/)?.[1]
    if (componentName && module.default && componentName !== 'YamlComponentRenderer' && componentName !== 'YamlNodeRenderer') {
        acc[componentName] = module.default
    }
    return acc
}, {})

// 导出组件映射表
export const componentMap = modules

// 导出单个组件
export const QWidget = modules.QWidget
export const CollapsiblePanel = modules.CollapsiblePanel
export const QLineEdit = modules.QLineEdit
export const QComboBox = modules.QComboBox
export const QCheckBox = modules.QCheckBox
export const QRadioButton = modules.QRadioButton
export const QPushButton = modules.QPushButton
export const QTableWidget = modules.QTableWidget
export const QGroupBox = modules.QGroupBox
export const QFormLayout = modules.QFormLayout
export const QDoubleSpinBox = modules.QDoubleSpinBox
export const QSpinBox = modules.QSpinBox
