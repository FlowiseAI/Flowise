import { IComponentNodes } from './Interface'
import { Node } from './entity/Node'
import path from 'path'
import fs from 'fs'
import { DataSource } from 'typeorm'

export class NodesPool {
    componentNodes: IComponentNodes = {}

    /**
     * Initialize to get all nodes
     */
    async initialize(AppDataSource: DataSource) {
        const nodes = await AppDataSource.getRepository(Node).find()

        return Promise.all(
            nodes.map(async (node) => {
                    // 先下载到nodes目录下
                    const dir = path.join(__dirname, '..', 'nodes')
                    // 目录不存在则创建
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir)
                    }
                    const filePath = path.join(dir, `${node.name}.js`)

                    // 先判断代码是否存在
                    if (!fs.existsSync(filePath)) {
                          // 从url下载代码
                        const res = await fetch(node.filePath)
                        const body = await res.text()
                        fs.writeFileSync(filePath, body)
                    }
                  
                    try {
                        const nodeModule = await import(filePath)
                        const newNodeInstance = new nodeModule.nodeClass()

                        this.componentNodes[newNodeInstance.name] = newNodeInstance
                      
                    } catch (e) {
                        console.error(e);
                    }
            })
        )
    }
}
