import yaml from 'yaml'

/**
 * 将 YAML 字符串转换为 JSON 对象
 * @param {string} yamlString - YAML 格式的字符串
 * @returns {Object} 转换后的 JSON 对象
 * @throws {Error} 如果解析失败会抛出错误
 */
export const yamlToJson = (yamlString) => {
    try {
        if (!yamlString || typeof yamlString !== 'string') {
            throw new Error('YAML 内容必须是非空字符串')
        }
        return yaml.parse(yamlString)
    } catch (error) {
        throw new Error(`YAML 解析错误: ${error.message}`)
    }
}

/**
 * 将 JSON 对象转换为 YAML 字符串
 * @param {Object} jsonData - JSON 对象
 * @param {Object} options - YAML 转换选项
 * @param {boolean} options.indent - 缩进空格数，默认为 2
 * @returns {string} 转换后的 YAML 字符串
 * @throws {Error} 如果转换失败会抛出错误
 */
export const jsonToYaml = (jsonData, options = { indent: 2 }) => {
    try {
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('JSON 数据必须是有效的对象')
        }
        return yaml.stringify(jsonData, options)
    } catch (error) {
        throw new Error(`YAML 转换错误: ${error.message}`)
    }
}

/**
 * 验证 YAML 字符串是否有效
 * @param {string} yamlString - 要验证的 YAML 字符串
 * @returns {boolean} 如果是有效的 YAML 返回 true，否则返回 false
 */
export const isValidYaml = (yamlString) => {
    try {
        yaml.parse(yamlString)
        return true
    } catch (error) {
        return false
    }
}

/**
 * 从文件内容中读取并解析 YAML
 * @param {File} file - YAML 文件对象
 * @returns {Promise<Object>} 解析后的 JSON 对象
 * @throws {Error} 如果文件读取或解析失败会抛出错误
 */
export const parseYamlFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const yamlContent = event.target.result
                const jsonData = yamlToJson(yamlContent)
                resolve(jsonData)
            } catch (error) {
                reject(new Error(`文件解析错误: ${error.message}`))
            }
        }
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsText(file)
    })
}

export default {
    yamlToJson,
    jsonToYaml,
    isValidYaml,
    parseYamlFile
}
