import { Document } from 'types'

interface TreeNode {
    id: string
    path: string
    children: TreeNode[]
    pageCount: number // New property to store the total number of pages in children
}

export function buildTree(urls: Document[]): TreeNode {
    const root: TreeNode = {
        id: 'root',
        path: '',
        children: [],
        pageCount: 0
    }

    const insertNode = (node: TreeNode, path: string[]): void => {
        const [current, ...rest] = path

        let child = node.children.find((child) => child.path === current)
        if (!child) {
            child = {
                id: `${node.id}-${node.children.length + 1}`,
                path: current,
                children: [],
                pageCount: 0
            }
            node.children.push(child)
        }

        if (rest.length > 0) {
            insertNode(child, rest)
        }
    }

    for (const url of urls) {
        const domain = new URL(url.url).hostname
        const path = url.url
            .replace(`https://${domain}`, '')
            .split('/')
            .filter((segment) => segment.length > 0)
        insertNode(root, [domain, ...path])
        root.pageCount += 1 // Increment the total page count in the root node
    }

    const updatePageCount = (node: TreeNode): number => {
        let count = 0
        for (const child of node.children) {
            count += updatePageCount(child)
        }
        node.pageCount = count + node.children.length
        return node.pageCount
    }

    updatePageCount(root)

    return root
}
